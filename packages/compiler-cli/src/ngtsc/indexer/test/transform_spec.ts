/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BoundTarget, DirectiveMeta} from '@angular/compiler';
import {IndexingContext} from '../src/context';
import {getTemplateIdentifiers} from '../src/template';
import {generateAnalysis} from '../src/transform';
import * as util from './util';

/**
 * Adds information about a component to a context.
 */
function populateContext(
    context: IndexingContext, component: string, selector: string, template: string,
    scope: BoundTarget<DirectiveMeta>| null) {
  const declaration = util.getComponentDeclaration(component);
  const parsedTemplate = util.getParsedTemplate(template);
  context.addComponent(declaration, selector, parsedTemplate, scope);
}

describe('generateAnalysis', () => {
  it('should emit analysis information', () => {
    const context = new IndexingContext();
    populateContext(context, 'class C {};', 'c-selector', '<div>{{foo}}</div>', null);
    const analysis = generateAnalysis(context);

    expect(analysis).toEqual([{
      name: 'C',
      selector: 'c-selector',
      declaration: util.getComponentDeclaration('class C {};'),
      sourceFile: util.TESTFILE,
      content: 'class C {};',
      template: {
        identifiers: getTemplateIdentifiers(util.getParsedTemplate('<div>{{foo}}</div>')),
        usedComponents: [],
      },
    }]);
  });

  it('should emit used components', () => {
    const context = new IndexingContext();

    const templateA = '<b-selector></b-selector>';
    const scopeA = util.bindTemplate(templateA, [{selector: 'b-selector', name: 'B'}]);
    populateContext(context, 'class A {};', 'a-selector', '<div>{{foo}}</div>', scopeA);

    const templateB = '<a-selector></a-selector>';
    const scopeB = util.bindTemplate(templateB, [{selector: 'a-selector', name: 'A'}]);
    populateContext(context, 'class B {};', 'b-selector', templateB, scopeB);

    const analysisA = {
      name: 'A',
      selector: 'a-selector',
      declaration: util.getComponentDeclaration('class A {};'),
      sourceFile: util.TESTFILE,
      content: 'class A {};',
      template: {
        identifiers: getTemplateIdentifiers(util.getParsedTemplate('<div>{{foo}}</div>')),
        usedComponents: new Array(),
      }
    };
    const analysisB = {
      name: 'B',
      selector: 'b-selector',
      declaration: util.getComponentDeclaration('class B {};'),
      sourceFile: util.TESTFILE,
      content: 'class B {};',
      template: {
        identifiers: getTemplateIdentifiers(util.getParsedTemplate(templateB)),
        usedComponents: [analysisA],
      }
    };
    analysisA.template.usedComponents.push(analysisB);

    const analysis = generateAnalysis(context);

    expect(analysis).toEqual([analysisA, analysisB]);
  });
});
