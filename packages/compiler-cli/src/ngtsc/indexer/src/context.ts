/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BoundTarget, DirectiveMeta, ParseSourceFile, TmplAstNode} from '@angular/compiler';
import {Reference} from '../../imports';
import {ClassDeclaration} from '../../reflection';

export interface ComponentMeta extends DirectiveMeta {
  ref: Reference<ClassDeclaration>;
  /**
   * Unparsed selector of the directive.
   */
  selector: string;
}

/**
 * An intermediate representation of a component.
 */
export interface ComponentInfo {
  /** Component TypeScript class declaration */
  declaration: ClassDeclaration;

  /** Component template selector if it exists, otherwise null. */
  selector: string|null;

  /** Parsed component template */
  template: {
    /** Template nodes */
    nodes: TmplAstNode[];

    /** Whether the component template is inline */
    isInline: boolean;

    /** Template file recorded by template parser */
    file: ParseSourceFile;
  };

  /**
   * BoundTarget containing the parsed template. Can be used to query for directives used in the
   * template.
   * Null if there is no registry of the component by the decorator handler.
   */
  scope: BoundTarget<ComponentMeta>|null;
}

/**
 * A context for storing indexing infromation about components of a program.
 *
 * An `IndexingContext` collects component and template analysis information from
 * `DecoratorHandler`s and exposes them to be indexed.
 */
export class IndexingContext {
  readonly components = new Set<ComponentInfo>();

  /**
   * Adds a component to the context.
   */
  addComponent(info: ComponentInfo) { this.components.add(info); }
}
