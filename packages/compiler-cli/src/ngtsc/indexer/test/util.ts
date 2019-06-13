/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {TmplAstNode, parseTemplate} from '@angular/compiler/src/compiler';
import * as ts from 'typescript';

import {ClassDeclaration} from '../../reflection';


/**
 * Creates a class declaration from a component source code.
 */
export function getComponentDeclaration(component: string): ClassDeclaration {
  const sourceFile = ts.createSourceFile(
      'TESTFILE', component, ts.ScriptTarget.ES2015,
      /* setParentNodes */ true);

  return sourceFile.statements.filter(ts.isClassDeclaration)[0] as ClassDeclaration;
}

/**
 * Parses a template source code.
 */
export function getParsedTemplate(template: string): TmplAstNode[] {
  return parseTemplate(template, 'TESTFILE').nodes;
}
