import {describe, expect, it} from '@jest/globals';
import {PAGE_CANVAS_CLASS, sanitizePageStyle, scopePageStyle} from '../../tools/pageStyleTools';

describe('pageStyleTools', () => {
    it('names the page canvas class the website uses', () => {
        expect(PAGE_CANVAS_CLASS).toBe('vps-page-canvas');
    });

    it('trims the CSS and turns nothing into an empty string', () => {
        expect(sanitizePageStyle('  .a { color: red; }\n')).toBe('.a { color: red; }');
        expect(sanitizePageStyle(null)).toBe('');
        expect(sanitizePageStyle(undefined)).toBe('');
        expect(sanitizePageStyle('   ')).toBe('');
    });

    it('neutralises a closing style tag inside the CSS', () => {
        expect(sanitizePageStyle('.a { content: "</style><script>x()</script>"; }')).toBe('.a { content: "<\\/style><script>x()</script>"; }');
        expect(sanitizePageStyle('</STYLE>')).toBe('<\\/STYLE>');
    });

    it('scopes the CSS to a canvas class', () => {
        expect(scopePageStyle('.a { color: red; }', 'vps-page-canvas-r1')).toBe('@scope (.vps-page-canvas-r1) {\n.a { color: red; }\n}');
    });
});
