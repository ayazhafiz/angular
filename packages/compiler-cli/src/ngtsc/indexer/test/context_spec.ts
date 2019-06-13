/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {DirectiveMeta, R3TargetBinder, SelectorMatcher} from '@angular/compiler/src/compiler';
import {IndexingContext} from '../src/context';
import * as util from './util';

describe('ComponentAnalysisContext', () => {
  it('should store and return information about components', () => {
    const context = new IndexingContext();
    const declaration = util.getComponentDeclaration('class C {};');
    const selector = 'c-selector';
    const template = util.getParsedTemplate('<div></div>');
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
