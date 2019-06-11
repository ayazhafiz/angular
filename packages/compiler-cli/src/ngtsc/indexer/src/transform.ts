/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';

import {ComponentAnalysisContext} from './context';
import {TemplateIdentifier, getTemplateIdentifiers} from './template';


/**
 * Describes the semantic analysis of a component and its template.
 */
export interface ComponentAnalysis {
  name: string;
  selector: string|null;
  declaration: ts.Declaration;
  sourceFile: string;
  content: string;
  template: {
    identifiers: TemplateIdentifier[],
    usedComponents: ComponentAnalysis[],
  };
}

/**
 * Generates `ComponentAnalysis` entries from a `ComponentAnalysisContext`, which has information
 * about components discovered in the program registered in it.
 *
 * The context must be populated before `generateAnalysis` is called.
 */
export function generateAnalysis(context: ComponentAnalysisContext): ComponentAnalysis[] {
  const componentMap = new Map<string, ComponentAnalysis>();

  const components = context.components.map(component => {
    const {declaration, selector, template, scope} = component;
    const name = declaration.name.getText();

    let usedComponents = null;
    if (scope !== null) {
      usedComponents = scope.getUsedDirectives().filter(dir => dir.isComponent);
    }

    const analysis = {
      name,
      selector,
      declaration,
      sourceFile: declaration.getSourceFile().fileName,
      content: declaration.getSourceFile().getFullText(),
      template: {
        identifiers: getTemplateIdentifiers(template),
        usedComponents: new Array<ComponentAnalysis>(),
      },
    };

    componentMap.set(name, analysis);

    return {
      data: {
          usedComponents,
      },
      analysis,
    };
  });

  // Transform references to used components to their ComponentAnalysis forms.
  // This must be done after all components are registered because there is no guarantee of
  // component discovery order.
  components.forEach(component => {
    const usedComponents = component.data.usedComponents;
    if (usedComponents !== null) {
      const usages = usedComponents.map(component => componentMap.get(component.name))
                         .filter((cmp): cmp is ComponentAnalysis => cmp !== undefined);
      component.analysis.template.usedComponents = usages;
    }
  });

  return components.map(component => component.analysis);
}
