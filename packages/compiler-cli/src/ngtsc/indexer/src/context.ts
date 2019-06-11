/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BoundTarget, DirectiveMeta, TmplAstNode} from '@angular/compiler';
import {ClassDeclaration} from '../../reflection';

/**
 * An intermediate representation of a component.
 */
export interface ComponentInfo {
  /** Component TypeScript class declaration */
  declaration: ClassDeclaration;

  /** Component template selector */
  selector: string|null;

  /** Parsed component template */
  template: TmplAstNode[];

  /**
   * BoundTarget containing the parsed template. Can be used to query for directives used in the
   * template.
   */
  scope: BoundTarget<DirectiveMeta>|null;
}

/**
 * Stores analysis information about components in a compilation for and provides methods for
 * querying information about components.
 */
export class ComponentAnalysisContext {
  private readonly registry: ComponentInfo[] = [];

  addComponent(
      component: ClassDeclaration, selector: string|null, template: TmplAstNode[],
      scope: BoundTarget<DirectiveMeta>|null) {
    this.registry.push({declaration: component, selector, template, scope});
  }

  get components(): ComponentInfo[] { return this.registry; }
}
