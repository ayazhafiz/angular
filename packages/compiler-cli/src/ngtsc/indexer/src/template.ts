/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AST, AstVisitor, Binary, BindingPipe, Chain, Conditional, FunctionCall, ImplicitReceiver, Interpolation, KeyedRead, KeyedWrite, Lexer, LiteralArray, LiteralMap, LiteralPrimitive, MethodCall, NonNullAssert, ParseSourceFile, ParseSpan, PrefixNot, PropertyRead, PropertyWrite, Quote, SafeMethodCall, SafePropertyRead, TmplAstNode, TokenType} from '@angular/compiler';
import {BoundAttribute, BoundEvent, BoundText, Content, Element, Icu, Node, Reference, Template, Text, TextAttribute, Variable, Visitor} from '@angular/compiler/src/render3/r3_ast';

/**
 * A parsed node in a template, which may have a name (if it is a selector) or
 * be anonymous (like a text span).
 */
interface HTMLNode extends Node {
  tagName?: string;
  name?: string;
}

/**
 * An arbitrary entity found in a template.
 */
interface Entity {
  name: string;
  span: ParseSpan;
}

/**
 * Describes a semantically-interesting identifier in a template, such as an interpolated variable
 * or selector.
 */
export interface TemplateIdentifier extends Entity {
  scope: string[];
  file: ParseSourceFile;
}


/**
 * Visits the AST of an Angular template syntax expression, finding interesting
 * entities (variable references, etc.). Creates an array of Entities found in
 * the expression, with the location of the Entities being relative to the
 * expression.
 *
 * Visiting `text {{interpolation}}` will return `[Entity {name:
 * 'interpolation', span: {start: 7, end: 19}}]`.
 *
 * The visitor is stateless, taking an anonymous AST into its entry point.
 */
class ExpressionVisitor implements AstVisitor {
  visit(ast: AST): Entity[] { return ast.visit(this); }

  visitAll(asts: AST[], context: {}): Entity[] {
    return asts.reduce((references, ast) => references.concat(ast.visit(this, context)), []);
  }

  visitBinary(ast: Binary): Entity[] {
    return [
      ...ast.left.visit(this),
      ...ast.right.visit(this),
    ];
  }

  visitChain(ast: Chain, context: {}): Entity[] { return this.visitAll(ast.expressions, context); }

  visitConditional(ast: Conditional, context: {}): Entity[] {
    return [
      ...ast.condition.visit(this),
      ...ast.trueExp.visit(this),
      ...ast.falseExp.visit(this),
    ];
  }

  visitPipe(ast: BindingPipe, context: {}): Entity[] {
    return [
      ...ast.exp.visit(this),
      ...this.visitAll(ast.args, context),
    ];
  }

  visitFunctionCall(ast: FunctionCall, context: {}): Entity[] {
    return [
      ast.target !.visit(this),
      this.visitAll(ast.args, context),
    ];
  }

  visitImplicitReceiver(ast: ImplicitReceiver, context: {}): Entity[] {
    return [];  // terminal node
  }

  visitInterpolation(ast: Interpolation, context: {}): Entity[] {
    return this.visitAll(ast.expressions, context);
  }

  visitKeyedRead(ast: KeyedRead, context: {}): Entity[] {
    return [
      ...ast.obj.visit(this),
      ...ast.key.visit(this),
    ];
  }

  visitKeyedWrite(ast: KeyedWrite, context: {}): Entity[] {
    return [
      ...ast.obj.visit(this),
      ...ast.key.visit(this),
      ...ast.value.visit(this),
    ];
  }

  visitLiteralArray(ast: LiteralArray, context: {}): Entity[] {
    return this.visitAll(ast.expressions, context);
  }

  visitLiteralMap(ast: LiteralMap, context: {}): Entity[] {
    return this.visitAll(ast.values, context);
  }

  visitLiteralPrimitive(ast: LiteralPrimitive, context: {}): Entity[] {
    return [];  // terminal node
  }

  visitMethodCall(ast: MethodCall, context: {}): Entity[] {
    return [
      ...ast.receiver.visit(this),
      ...this.visitAll(ast.args, context),
    ];
  }

  visitPrefixNot(ast: PrefixNot, context: {}): Entity[] { return ast.expression.visit(this); }

  visitNonNullAssert(ast: NonNullAssert, context: {}): Entity[] {
    return ast.expression.visit(this);
  }

  visitPropertyRead(ast: PropertyRead, context: {}): Entity[] {
    const entity = {name: ast.name, span: ast.span};

    return [
      ...ast.receiver.visit(this),
      entity,
    ];
  }

  visitPropertyWrite(ast: PropertyWrite, context: {}): Entity[] {
    return [
      ...ast.receiver.visit(this),
      ...ast.value.visit(this),
    ];
  }

  visitSafePropertyRead(ast: SafePropertyRead, context: {}): Entity[] {
    return ast.receiver.visit(this);
  }

  visitSafeMethodCall(ast: SafeMethodCall, context: {}): Entity[] {
    return [
      ...ast.receiver.visit(this),
      ...this.visitAll(ast.args, context),
    ];
  }

  visitQuote(ast: Quote, context: {}): Entity[] {
    return [];  // terminal node
  }
}

/**
 * Updates the location of an identifier to its real reference in a source
 * code.
 *
 * The Angular compiler parses expressions relative to their location in a
 * template and in the format that will be rendered as HTML. Because of this,
 * the location of an identifier in an expression can be different from from
 * its asbolute location in the source code. For example,
 *
 * ```
 * <div>   {{id}}\n\n {{div}}</div>
 * ```
 *
 * may actually only be parsed to
 *
 * ```
 * <div> {{id}} {{div}}</div>
 * ```
 *
 * To remedy this, the visitor lexes the expression that entities were
 * discovered in, and updates the entities with their correct location, given
 * by the lexer.
 *
 * @param entities entities to update
 * @param currentNode node expression was in
 */
function setRealExpressionSpan(entities: Entity[], currentNode: Node) {
  const localSpan = currentNode.sourceSpan;
  const lexedIdentifiers = new Lexer()
                               .tokenize(localSpan.start.file.content.substring(
                                   localSpan.start.offset, localSpan.end.offset))
                               .filter(token => token.type === TokenType.Identifier);

  entities.forEach((entity, index) => {
    if (entity.name !== lexedIdentifiers[index].strValue) {
      throw new Error(
          'Impossible state - parsed expression should contain the same tokens it lexed.');
    }
    const startOffset = lexedIdentifiers[index].index - entity.span.start;
    entity.span.start += startOffset;
    entity.span.end += startOffset;
  });
}

/**
 * Visits the AST of a parsed Angular template. Discovers and stores
 * identifiers of interest, deferring to an `ExpressionVisitor` as needed.
 */
class TemplateVisitor implements Visitor {
  // identifiers of interest found in the template
  readonly identifiers: TemplateIdentifier[] = [];
  // current context of locale in AST being traversed
  private readonly context: Entity[] = [];

  /**
   * Creates a `TemplateVisitor`.
   * @param astVisitor child `ExpressionVisitor` to defer for expressions
   */
  constructor(private readonly astVisitor = new ExpressionVisitor()) {}

  /**
   * Visits a node in the template.
   * @param node node to visit
   */
  visit(node: HTMLNode) {
    // Add current node to the visitor context, then visit the node's AST.
    this.context.push({
      name: node.tagName || node.name || '',
      span: {start: node.sourceSpan.start.offset, end: node.sourceSpan.end.offset}
    });
    node.visit(this);
    this.context.pop();
  }

  visitAll(nodes: Node[]) { nodes.forEach(node => this.visit(node)); }

  visitElement(element: Element) {
    this.visitAll(element.attributes);
    this.visitAll(element.children);
    this.visitAll(element.references);
  }
  visitTemplate(template: Template) {
    this.visitAll(template.attributes);
    this.visitAll(template.children);
    this.visitAll(template.references);
    this.visitAll(template.variables);
  }
  visitContent(content: Content) {}
  visitVariable(variable: Variable) {}
  visitReference(reference: Reference) {}
  visitTextAttribute(attribute: TextAttribute) {}
  visitBoundAttribute(attribute: BoundAttribute) {
    this.addIdentifiers(this.astVisitor.visit(attribute.value), attribute);
  }
  visitBoundEvent(attribute: BoundEvent) {}
  visitText(text: Text) {}
  visitBoundText(text: BoundText) { this.addIdentifiers(this.astVisitor.visit(text.value), text); }
  visitIcu(icu: Icu): void {}

  /**
   * Adds identifiers to the visitor's state.
   * @param visitedEntities interesting entities to add as identifiers
   * @param curretNode node entities were discovered in
   */
  private addIdentifiers(visitedEntities: Entity[], currentNode: Node) {
    // updates the real location of entities relative to the current node
    // see `setRealExpressionSpan` documentation for more information
    setRealExpressionSpan(visitedEntities, currentNode);

    const localScope = this.context.map(ctx => ctx.name).filter(Boolean);
    if (this.context.length === 0) {
      throw new Error(
          'Impossible state: identifiers must be added from an expression inside a node.');
    }
    const localOffset = this.context[this.context.length - 1].span.start;

    // converts entities into semantically interesting identifiers
    const discoveredIdentifiers: TemplateIdentifier[] = visitedEntities.map(({name, span}) => {
      return {
        name,
        scope: localScope,
        // join the relative position of an expression with the absolute
        // position of the node encompassing it
        span: {start: localOffset + span.start, end: localOffset + span.end},
        file: currentNode.sourceSpan.start.file,
      };
    });

    this.identifiers.push(...discoveredIdentifiers);
  }
}

/**
 * Traverses a template AST and builds identifiers discovered in it.
 * @param template template to extract indentifiers from
 * @return identifiers in template
 */
export function getTemplateIdentifiers(template: TmplAstNode[]): TemplateIdentifier[] {
  const visitor = new TemplateVisitor();
  visitor.visitAll(template);
  return visitor.identifiers;
}
