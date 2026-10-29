/**
 * Tests of the page style model: CSS text <-> editable blocks, with everything the visual mode cannot edit kept verbatim.
 */
import {describe, expect, it} from '@jest/globals';
import {
    controlFor,
    findStyleProperty,
    newRuleBlock,
    PAGE_STYLE_PROPERTIES,
    PAGE_STYLE_SELECTORS,
    parsePageStyle,
    serializePageStyle,
} from '../../tools/pageStyleModel';

describe('parsePageStyle', () => {
    it('splits plain rules into selectors and declarations', () => {
        const blocks = parsePageStyle('.vps-page-canvas { max-width: 60rem; color: #333 }\n\n.vps-page-canvas h1 { font-size: 2rem; }');
        expect(blocks).toEqual([
            {kind: 'rule', selector: '.vps-page-canvas', declarations: [{property: 'max-width', value: '60rem'}, {property: 'color', value: '#333'}]},
            {kind: 'rule', selector: '.vps-page-canvas h1', declarations: [{property: 'font-size', value: '2rem'}]},
        ]);
    });

    it('keeps comments, at-rules and nested rules as raw blocks in their place', () => {
        const css = '/* site */\n@import url("x.css");\np { color: red; }\n@media (max-width: 600px) { p { color: blue; } }\n.a { .b { c: d } }';
        const blocks = parsePageStyle(css);
        expect(blocks.map((block) => block.kind)).toEqual(['raw', 'raw', 'rule', 'raw', 'raw']);
        expect(blocks[0]).toEqual({kind: 'raw', text: '/* site */'});
        expect(blocks[1]).toEqual({kind: 'raw', text: '@import url("x.css");'});
        expect(blocks[3]).toEqual({kind: 'raw', text: '@media (max-width: 600px) { p { color: blue; } }'});
        expect(blocks[4]).toEqual({kind: 'raw', text: '.a { .b { c: d } }'});
    });

    it('does not split values on semicolons inside strings or parentheses and keeps !important', () => {
        const blocks = parsePageStyle(".x { background: url(\"a;b.png\") no-repeat; font-family: 'A;B', serif; color: rgb(1;2;3) !important }");
        expect(blocks).toEqual([{
            kind: 'rule', selector: '.x', declarations: [
                {property: 'background', value: 'url("a;b.png") no-repeat'},
                {property: 'font-family', value: "'A;B', serif"},
                {property: 'color', value: 'rgb(1;2;3) !important'},
            ],
        }]);
    });

    it('keeps unterminated or brace-less text as a raw block and reads nothing from blank CSS', () => {
        expect(parsePageStyle('p { color: red')).toEqual([{kind: 'raw', text: 'p { color: red'}]);
        expect(parsePageStyle('just words')).toEqual([{kind: 'raw', text: 'just words'}]);
        expect(parsePageStyle('')).toEqual([]);
        expect(parsePageStyle('   \n')).toEqual([]);
        expect(parsePageStyle(null)).toEqual([]);
    });

    it('normalizes the whitespace of multi-line selectors and skips declarations without a colon', () => {
        const blocks = parsePageStyle('.a,\n   .b   >  p {\n  color: red;\n  broken;\n  : nothing;\n}');
        expect(blocks).toEqual([{kind: 'rule', selector: '.a, .b > p', declarations: [{property: 'color', value: 'red'}]}]);
    });
});

describe('serializePageStyle', () => {
    it('writes rules with indented declarations and raw blocks verbatim, separated by blank lines', () => {
        const css = serializePageStyle([
            {kind: 'raw', text: '/* keep */'},
            {kind: 'rule', selector: '.vps-page-canvas', declarations: [{property: 'max-width', value: '60rem'}]},
            {kind: 'rule', selector: ' h1 ', declarations: [{property: ' color ', value: ' red '}, {property: '', value: 'x'}, {property: 'y', value: ''}]},
        ]);
        expect(css).toBe('/* keep */\n\n.vps-page-canvas {\n    max-width: 60rem;\n}\n\nh1 {\n    color: red;\n}');
    });

    it('drops rules without a selector or without a complete declaration, and blank raw blocks', () => {
        expect(serializePageStyle([
            {kind: 'rule', selector: '', declarations: [{property: 'a', value: 'b'}]},
            {kind: 'rule', selector: 'p', declarations: [{property: '', value: ''}]},
            {kind: 'raw', text: '   '},
        ])).toBe('');
    });

    it('round-trips what it wrote', () => {
        const css = '.vps-page-canvas {\n    max-width: 60rem;\n}\n\n@media print {\n  p { display: none; }\n}\n\n.vps-page-canvas a:hover {\n    color: #ff0000;\n}';
        expect(serializePageStyle(parsePageStyle(css))).toBe(css);
    });
});

describe('catalogs', () => {
    it('offers the page canvas, the site root, the editor elements and the embed containers', () => {
        const values = PAGE_STYLE_SELECTORS.flatMap((group) => group.options.map((option) => option.value));
        expect(values).toContain('.vps-page-canvas');
        expect(values).toContain(':root');
        expect(values).toContain('.vps-page-canvas h1');
        expect(values).toContain('.vps-page-canvas p');
        expect(values).toContain('.vps-page-canvas table');
        expect(values).toContain('.vps-page-canvas .gallery-embed');
        expect(new Set(values).size).toBe(values.length);
    });

    it('maps the properties to controls and leaves unknown properties and variables as text', () => {
        const properties = PAGE_STYLE_PROPERTIES.flatMap((group) => group.options.map((option) => option.value));
        expect(new Set(properties).size).toBe(properties.length);
        expect(controlFor('color')).toBe('color');
        expect(controlFor(' Font-Size ')).toBe('length');
        expect(controlFor('text-align')).toBe('choice');
        expect(findStyleProperty('text-align')?.choices).toContain('center');
        expect(controlFor('--accent')).toBe('text');
        expect(controlFor('clip-path')).toBe('text');
        expect(findStyleProperty('nope')).toBeUndefined();
    });

    it('creates a new rule on the page canvas with one empty row', () => {
        expect(newRuleBlock()).toEqual({kind: 'rule', selector: '.vps-page-canvas', declarations: [{property: '', value: ''}]});
        expect(newRuleBlock('p').selector).toBe('p');
    });
});
