/** Class of the element the page content is rendered into, on the website and on the editing canvas; the hook for a page's own CSS. */
export const PAGE_CANVAS_CLASS = 'vps-page-canvas';

/**
 * The custom CSS of a page as it may be placed into a style element: trimmed, empty for none, and with every `</style` sequence
 * neutralised (`<\/style`, which CSS reads as the same characters) so the text can never close the element it is written into.
 */
export function sanitizePageStyle(css: string | null | undefined): string {
    const trimmed = (css ?? '').trim();
    return trimmed.replace(/<\/(style)/gi, '<\\/$1');
}

/**
 * Wraps the CSS in an `@scope` block, so that on the editing canvas the page's rules apply inside the canvas only and never restyle
 * the host application; site-wide rules such as `:root { --x: ... }` take effect on the website, not in the preview.
 */
export function scopePageStyle(css: string, scopeClass: string): string {
    return `@scope (.${scopeClass}) {\n${css}\n}`;
}
