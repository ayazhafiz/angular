import * as e from '@angular/compiler/src/expression_parser/ast';
import {DEFAULT_INTERPOLATION_CONFIG, InterpolationConfig} from '@angular/compiler/src/ml_parser/interpolation_config';
import * as t from '@angular/compiler/src/render3/r3_ast';

export function printDesugaredTemplate(template: t.Template): string {
  const printer = new Printer();
  printer.visitTemplate(template);
  return printer.buffer;
}

class Printer implements t.Visitor {
  buffer = '';

  private indent = '';
  private pushIndent() {
    this.indent += '  ';
  }
  private popIndent() {
    this.indent = this.indent.slice(0, -2);
  }
  private print(s: string) {
    this.buffer += this.indent + s;
  }

  visitTemplate({templateAttrs, variables, references, children}: t.Template) {
    this.print('<ng-template');
    for (const nodeset of [templateAttrs, variables, references]) {
      for (const node of nodeset) {
        this.print(' ');
        node.visit(this);
      }
    }
    this.print('>');

    this.pushIndent();
    for (const child of children) {
      this.print('\n');
      child.visit(this);
    }
    if (children.length) this.print('\n');
    this.popIndent();

    this.print('</ng-template>');
  }

  visitElement({name, attributes, inputs, outputs, references, children, endSourceSpan}:
                   t.Element) {
    // NB: This is not rigorous because a recovered malformed element may be missing a
    // endSourceSpan, but not be a void element.
    const isVoid = endSourceSpan === null && children.length === 0;

    this.print(`<${name}`);
    for (const nodeset of [attributes, inputs, outputs, references]) {
      for (const node of nodeset) {
        this.print(' ');
        node.visit(this);
      }
    }
    if (isVoid) {
      this.print(' />');
    } else {
      this.print('>');
      this.pushIndent();
      for (const child of children) {
        this.print('\n');
        child.visit(this);
      }
      if (children.length) this.print('\n');
      this.popIndent();

      this.print(`</${name}>`);
    }
  }

  visitContent({selector, attributes}: t.Content) {
    const attrs = attributes.length ? t.visitAll(this, attributes).join(' ') : '';
    if (selector === '*') {
      this.print(`<ng-content${attrs}></ng-content>`);
    } else {
      this.print(`<ng-content selector="${selector}"${attrs}></ng-content>`);
    }
  }

  visitIcu(_icu: t.Icu) {}

  visitBoundText({value}: t.BoundText) {
    const expr = new Unparser().unparse(value);
    this.print(expr);
  }

  visitTextAttribute({name, value}: t.TextAttribute) {
    if (value.length > 0) {
      this.print(`${name}="${value}"`);
    } else {
      this.print(`${name}`);
    }
  }

  visitBoundAttribute({name, value}: t.BoundAttribute) {
    const expr = new Unparser().unparse(value);
    this.print(`[${name}]="${expr}"`);
  }

  visitBoundEvent({name, handler}: t.BoundEvent) {
    const expr = new Unparser().unparse(handler);
    this.print(`(${name})="${expr}"`);
  }

  visitReference({name, value}: t.Reference) {
    if (value.length > 0) {
      this.print(`#${name}="${value}"`);
    } else {
      this.print(`#${name}`);
    }
  }

  visitVariable({name, value}: t.Variable) {
    if (value.length > 0) {
      this.print(`let-${name}="${value}"`);
    } else {
      this.print(`let-${name}`);
    }
  }

  visitText(text: t.Text) {
    this.print(text.value);
  }
}

class Unparser implements e.AstVisitor {
  private static _quoteRegExp = /"/g;
  // TODO(issue/24571): remove '!'.
  private _expression!: string;
  // TODO(issue/24571): remove '!'.
  private _interpolationConfig!: InterpolationConfig;

  unparse(ast: e.AST) {
    this._expression = '';
    this._interpolationConfig = DEFAULT_INTERPOLATION_CONFIG;
    this._visit(ast);
    return this._expression;
  }

  visitPropertyRead(ast: e.PropertyRead) {
    this._visit(ast.receiver);
    this._expression += ast.receiver instanceof e.ImplicitReceiver ? `${ast.name}` : `.${ast.name}`;
  }

  visitPropertyWrite(ast: e.PropertyWrite) {
    this._visit(ast.receiver);
    this._expression +=
        ast.receiver instanceof e.ImplicitReceiver ? `${ast.name} = ` : `.${ast.name} = `;
    this._visit(ast.value);
  }

  visitUnary(ast: e.Unary) {
    this._expression += ast.operator;
    this._visit(ast.expr);
  }

  visitBinary(ast: e.Binary) {
    this._visit(ast.left);
    this._expression += ` ${ast.operation} `;
    this._visit(ast.right);
  }

  visitChain(ast: e.Chain) {
    const len = ast.expressions.length;
    for (let i = 0; i < len; i++) {
      this._visit(ast.expressions[i]);
      this._expression += i == len - 1 ? ';' : '; ';
    }
  }

  visitConditional(ast: e.Conditional) {
    this._visit(ast.condition);
    this._expression += ' ? ';
    this._visit(ast.trueExp);
    this._expression += ' : ';
    this._visit(ast.falseExp);
  }

  visitPipe(ast: e.BindingPipe) {
    this._expression += '(';
    this._visit(ast.exp);
    this._expression += ` | ${ast.name}`;
    ast.args.forEach(arg => {
      this._expression += ':';
      this._visit(arg);
    });
    this._expression += ')';
  }

  visitFunctionCall(ast: e.FunctionCall) {
    this._visit(ast.target!);
    this._expression += '(';
    let isFirst = true;
    ast.args.forEach(arg => {
      if (!isFirst) this._expression += ', ';
      isFirst = false;
      this._visit(arg);
    });
    this._expression += ')';
  }

  visitImplicitReceiver(ast: e.ImplicitReceiver) {}

  visitThisReceiver(ast: e.ThisReceiver) {}

  visitInterpolation(ast: e.Interpolation) {
    for (let i = 0; i < ast.strings.length; i++) {
      this._expression += ast.strings[i];
      if (i < ast.expressions.length) {
        this._expression += `${this._interpolationConfig.start} `;
        this._visit(ast.expressions[i]);
        this._expression += ` ${this._interpolationConfig.end}`;
      }
    }
  }

  visitKeyedRead(ast: e.KeyedRead) {
    this._visit(ast.obj);
    this._expression += '[';
    this._visit(ast.key);
    this._expression += ']';
  }

  visitKeyedWrite(ast: e.KeyedWrite) {
    this._visit(ast.obj);
    this._expression += '[';
    this._visit(ast.key);
    this._expression += '] = ';
    this._visit(ast.value);
  }

  visitLiteralArray(ast: e.LiteralArray) {
    this._expression += '[';
    let isFirst = true;
    ast.expressions.forEach(expression => {
      if (!isFirst) this._expression += ', ';
      isFirst = false;
      this._visit(expression);
    });

    this._expression += ']';
  }

  visitLiteralMap(ast: e.LiteralMap) {
    this._expression += '{';
    let isFirst = true;
    for (let i = 0; i < ast.keys.length; i++) {
      if (!isFirst) this._expression += ', ';
      isFirst = false;
      const key = ast.keys[i];
      this._expression += key.quoted ? JSON.stringify(key.key) : key.key;
      this._expression += ': ';
      this._visit(ast.values[i]);
    }

    this._expression += '}';
  }

  visitLiteralPrimitive(ast: e.LiteralPrimitive) {
    if (typeof ast.value === 'string') {
      this._expression += `"${ast.value.replace(Unparser._quoteRegExp, '\"')}"`;
    } else {
      this._expression += `${ast.value}`;
    }
  }

  visitMethodCall(ast: e.MethodCall) {
    this._visit(ast.receiver);
    this._expression +=
        ast.receiver instanceof e.ImplicitReceiver ? `${ast.name}(` : `.${ast.name}(`;
    let isFirst = true;
    ast.args.forEach(arg => {
      if (!isFirst) this._expression += ', ';
      isFirst = false;
      this._visit(arg);
    });
    this._expression += ')';
  }

  visitPrefixNot(ast: e.PrefixNot) {
    this._expression += '!';
    this._visit(ast.expression);
  }

  visitNonNullAssert(ast: e.NonNullAssert) {
    this._visit(ast.expression);
    this._expression += '!';
  }

  visitSafePropertyRead(ast: e.SafePropertyRead) {
    this._visit(ast.receiver);
    this._expression += `?.${ast.name}`;
  }

  visitSafeMethodCall(ast: e.SafeMethodCall) {
    this._visit(ast.receiver);
    this._expression += `?.${ast.name}(`;
    let isFirst = true;
    ast.args.forEach(arg => {
      if (!isFirst) this._expression += ', ';
      isFirst = false;
      this._visit(arg);
    });
    this._expression += ')';
  }

  visitQuote(ast: e.Quote) {
    this._expression += `${ast.prefix}:${ast.uninterpretedExpression}`;
  }

  private _visit(ast: e.AST) {
    ast.visit(this);
  }
}
