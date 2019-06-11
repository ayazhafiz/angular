/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {parseTemplate} from '@angular/compiler';
import {DirectiveMeta, R3TargetBinder, SelectorMatcher} from '@angular/compiler/src/compiler';
import * as ts from 'typescript';
import {ClassDeclaration} from '../../reflection';
import {ComponentAnalysisContext} from '../src/context';

function getComponentDeclaration(component: string): ClassDeclaration {
  const sourceFile = ts.createSourceFile(
      'TESTFILE', component, ts.ScriptTarget.ES2015,
      /* setParentNodes */ true);

  return sourceFile.statements.filter(ts.isClassDeclaration)[0] as ClassDeclaration;
}

describe('ComponentAnalysisContext', () => {
  it('should store and return information about components', () => {
    const context = new ComponentAnalysisContext();
    const declaration = getComponentDeclaration('class C {};');
    const selector = 'c-selector';
    const template = parseTemplate('<div></div>', 'TESTFILE').nodes;
    const binder = new R3TargetBinder(new SelectorMatcher<DirectiveMeta>());
    const scope = binder.bind({template});

    context.addComponent(declaration, selector, template, scope);
    context.addComponent(declaration, null, [], null);

    expect(context.components).toEqual([
      {
          declaration, selector, template, scope,
      },
      {
        declaration,
        selector: null,
        template: [],
        scope: null,
      },
    ]);
  });
});
