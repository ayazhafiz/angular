/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ParseSourceFile, ParseSpan} from '@angular/compiler';

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
