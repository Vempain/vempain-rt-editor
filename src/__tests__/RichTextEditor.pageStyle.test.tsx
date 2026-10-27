/**
 * Tests for the page style preview: the CSS of the page being edited is applied to the editing canvas only.
 */
import React from 'react';
import {describe, expect, it} from '@jest/globals';
import {RichTextEditor} from '../RichTextEditor';
import {renderWithProviders} from '../test-utils/renderWithProviders';

function styleElement(): HTMLStyleElement | null {
    return document.querySelector('style[data-testid="vps-page-style"]');
}

describe('page style preview', () => {
    it('scopes the page CSS to the canvas, which carries the shared canvas class', () => {
        renderWithProviders(<RichTextEditor value="<p>Hi</p>" pageStyle=".vps-page-canvas { max-width: 60rem; }"/>);

        const canvas = document.querySelector('[contenteditable]');
        expect(canvas).toHaveClass('vps-page-canvas');
        const scopeClass = [...(canvas?.classList ?? [])].find((name) => name.startsWith('vps-page-canvas-'));
        expect(scopeClass).toBeDefined();
        expect(styleElement()?.textContent).toBe(`@scope (.${scopeClass}) {\n.vps-page-canvas { max-width: 60rem; }\n}`);
    });

    it('previews the style in read-only mode as well', () => {
        renderWithProviders(<RichTextEditor value="<p>Hi</p>" readOnly pageStyle="p { color: red; }"/>);
        expect(document.querySelector('[contenteditable="false"]')).toHaveClass('vps-page-canvas');
        expect(styleElement()?.textContent).toContain('p { color: red; }');
    });

    it('renders no style element without CSS or with blank CSS', () => {
        renderWithProviders(<RichTextEditor value="<p>Hi</p>"/>);
        expect(styleElement()).toBeNull();
        renderWithProviders(<RichTextEditor value="<p>Hi</p>" pageStyle="   "/>);
        expect(styleElement()).toBeNull();
        renderWithProviders(<RichTextEditor value="<p>Hi</p>" pageStyle={null}/>);
        expect(styleElement()).toBeNull();
    });

    it('cannot be broken out of with a closing style tag', () => {
        renderWithProviders(<RichTextEditor value="<p>Hi</p>" pageStyle={'p { }</style><script>window.pwned = true</script>'}/>);
        expect(document.querySelector('script')).toBeNull();
        expect(styleElement()?.textContent).toContain('<\\/style>');
    });
});
