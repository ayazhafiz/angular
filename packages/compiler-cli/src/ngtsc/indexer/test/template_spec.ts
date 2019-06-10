/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ParseSourceFile, parseTemplate, TmplAstNode} from '@angular/compiler';
import {getTemplateIdentifiers, TemplateIdentifier} from '../src/template';



const TEST_FILE = 'TEST';

function parse(template: string): TmplAstNode[] {
  return parseTemplate(template, TEST_FILE).nodes;
}

/**
 * Creates entries for targets in a template to compare against the result of
 * `getTemplateIdentifiers`.
 */
function getTemplateTargets({template, targets}: {
  template: string; targets: Array<{name: string; scope: string[]}>;
}): TemplateIdentifier[] {
  return targets.map(({name, scope}) => {
    const offset = template.indexOf(name);
    return {
      name,
      scope,
      span: {start: offset, end: offset + name.length},
      file: new ParseSourceFile(template, TEST_FILE),
    };
  });
}

describe('getTemplateIdentifiers', () => {
  it('should generate nothing in HTML-only template', () => {
    const refs = getTemplateIdentifiers(parse('<div></div>'));

    expect(refs.length).toBe(0);
  });

  it('should ignore comments', () => {
    const refs = getTemplateIdentifiers(parse(`
    <!-- {{my_module}} -->
    <div><!-- {{goodbye}} --></div>
    `));

    expect(refs.length).toBe(0);
  });

  describe('generates identifiers for PropertyReads', () => {
    it('should handle identifiers inside text', () => {
      const template = '<div>{{foo}}</div>';
      const targets = getTemplateTargets({template, targets: [{name: 'foo', scope: ['div']}]});
      const refs = getTemplateIdentifiers(parse(template));

      expect(refs).toEqual(targets);
    });

    it('should handle arbitrary whitespace', () => {
      const template = '<div>\n\n   {{foo}}\n   {{bar}}</div>';
      const targets = getTemplateTargets(
          {template, targets: [{name: 'foo', scope: ['div']}, {name: 'bar', scope: ['div']}]});
      const refs = getTemplateIdentifiers(parse(template));

      expect(refs).toEqual(targets);
    });

    it('should handle nested scopes', () => {
      const template = '<div><span>{{foo}}</span></div>';
      const targets = getTemplateTargets({
        template,
        targets: [{name: 'foo', scope: ['div', 'span']}],
      });
      const refs = getTemplateIdentifiers(parse(template));

      expect(refs).toEqual(targets);
    });
  });
});
