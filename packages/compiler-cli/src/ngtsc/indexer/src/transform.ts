/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import {ComponentAnalysisContext} from './context';
import {TemplateIdentifier} from './template';

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
  throw new Error('Method not implemented.');
}
