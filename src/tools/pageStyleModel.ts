/**
 * The model of a page's custom CSS for the visual mode of `PageStyleEditor`: the CSS text is split into blocks, every plain rule
 * (`selector { property: value; ... }`) becomes editable, and everything the visual mode cannot represent (comments, at-rules such as
 * `@media`, nested blocks, malformed text) is kept verbatim as a raw block so that nothing an author wrote is lost when the mode changes.
 */

export interface StyleDeclaration {
    property: string;
    value: string;
}

export interface StyleRuleBlock {
    kind: 'rule';
    selector: string;
    declarations: StyleDeclaration[];
}

export interface RawStyleBlock {
    kind: 'raw';
    text: string;
}

export type PageStyleBlock = StyleRuleBlock | RawStyleBlock;

/** One entry of the selector or property catalogs offered by the visual mode. */
export interface StyleChoice {
    value: string;
    label: string;
}

export interface StyleChoiceGroup {
    label: string;
    options: StyleChoice[];
}

export type StyleControl = 'color' | 'length' | 'choice' | 'text';

export interface StylePropertyChoice extends StyleChoice {
    control: StyleControl;
    /** The values offered for a `choice` control; typing another value stays possible. */
    choices?: string[];
    placeholder?: string;
}

export interface StylePropertyGroup {
    label: string;
    options: StylePropertyChoice[];
}

/** The hook of the page's canvas, the same class on the website and on the editing canvas. */
export const PAGE_CANVAS_SELECTOR = '.vps-page-canvas';

/** The site-wide root, whose variables a page may override; takes effect on the website only, the editing canvas cannot preview it. */
export const SITE_ROOT_SELECTOR = ':root';

/**
 * The CSS elements that exist on a page: the canvas and the website's body wrapper, the elements the rich-text editor produces, and
 * the containers of the embeds rendered on the website. Any other selector may still be typed.
 */
export const PAGE_STYLE_SELECTORS: StyleChoiceGroup[] = [
    {
        label: 'Page',
        options: [
            {value: PAGE_CANVAS_SELECTOR, label: 'Page canvas (.vps-page-canvas)'},
            {value: `${PAGE_CANVAS_SELECTOR} .page-body`, label: 'Page body (.page-body)'},
            {value: SITE_ROOT_SELECTOR, label: 'Site root variables (:root, website only)'},
        ],
    },
    {
        label: 'Headings',
        options: [1, 2, 3, 4, 5, 6].map((level) => ({value: `${PAGE_CANVAS_SELECTOR} h${level}`, label: `Heading ${level} (h${level})`})),
    },
    {
        label: 'Text',
        options: [
            {value: `${PAGE_CANVAS_SELECTOR} p`, label: 'Paragraph (p)'},
            {value: `${PAGE_CANVAS_SELECTOR} a`, label: 'Link (a)'},
            {value: `${PAGE_CANVAS_SELECTOR} a:hover`, label: 'Link, hovered (a:hover)'},
            {value: `${PAGE_CANVAS_SELECTOR} strong`, label: 'Bold text (strong)'},
            {value: `${PAGE_CANVAS_SELECTOR} em`, label: 'Italic text (em)'},
            {value: `${PAGE_CANVAS_SELECTOR} ul`, label: 'Unordered list (ul)'},
            {value: `${PAGE_CANVAS_SELECTOR} ol`, label: 'Ordered list (ol)'},
            {value: `${PAGE_CANVAS_SELECTOR} li`, label: 'List item (li)'},
            {value: `${PAGE_CANVAS_SELECTOR} blockquote`, label: 'Quote (blockquote)'},
            {value: `${PAGE_CANVAS_SELECTOR} pre`, label: 'Preformatted text (pre)'},
            {value: `${PAGE_CANVAS_SELECTOR} code`, label: 'Code (code)'},
            {value: `${PAGE_CANVAS_SELECTOR} hr`, label: 'Horizontal rule (hr)'},
        ],
    },
    {
        label: 'Tables',
        options: [
            {value: `${PAGE_CANVAS_SELECTOR} table`, label: 'Table (table)'},
            {value: `${PAGE_CANVAS_SELECTOR} th`, label: 'Table header cell (th)'},
            {value: `${PAGE_CANVAS_SELECTOR} td`, label: 'Table cell (td)'},
        ],
    },
    {
        label: 'Media and embeds',
        options: [
            {value: `${PAGE_CANVAS_SELECTOR} img`, label: 'Image (img)'},
            {value: `${PAGE_CANVAS_SELECTOR} video`, label: 'Video (video)'},
            {value: `${PAGE_CANVAS_SELECTOR} .gallery-embed`, label: 'Gallery embed (.gallery-embed)'},
            {value: `${PAGE_CANVAS_SELECTOR} .ant-carousel`, label: 'Carousel and hero carousel (.ant-carousel)'},
            {value: `${PAGE_CANVAS_SELECTOR} .ant-collapse`, label: 'Collapse embed (.ant-collapse)'},
            {value: `${PAGE_CANVAS_SELECTOR} .ant-image`, label: 'Image embed (.ant-image)'},
        ],
    },
];

const FONT_FAMILIES = [
    'system-ui, sans-serif',
    'Georgia, serif',
    '"Times New Roman", serif',
    'Helvetica, Arial, sans-serif',
    'Verdana, sans-serif',
    '"Courier New", monospace',
    'monospace',
    'cursive',
];

/** The CSS properties the visual mode offers, with the control that edits their value. Any other property may still be typed. */
export const PAGE_STYLE_PROPERTIES: StylePropertyGroup[] = [
    {
        label: 'Text',
        options: [
            {value: 'color', label: 'Text colour', control: 'color'},
            {value: 'font-family', label: 'Font family', control: 'choice', choices: FONT_FAMILIES},
            {value: 'font-size', label: 'Font size', control: 'length', placeholder: 'e.g. 1.25rem or 18px'},
            {value: 'font-weight', label: 'Font weight', control: 'choice', choices: ['normal', 'bold', '300', '400', '500', '600', '700', '800']},
            {value: 'font-style', label: 'Font style', control: 'choice', choices: ['normal', 'italic']},
            {value: 'line-height', label: 'Line height', control: 'length', placeholder: 'e.g. 1.6'},
            {value: 'letter-spacing', label: 'Letter spacing', control: 'length', placeholder: 'e.g. 0.05em'},
            {value: 'text-align', label: 'Text alignment', control: 'choice', choices: ['left', 'center', 'right', 'justify']},
            {value: 'text-decoration', label: 'Text decoration', control: 'choice', choices: ['none', 'underline', 'line-through']},
            {value: 'text-transform', label: 'Text transform', control: 'choice', choices: ['none', 'uppercase', 'lowercase', 'capitalize']},
        ],
    },
    {
        label: 'Box',
        options: [
            {value: 'background-color', label: 'Background colour', control: 'color'},
            {value: 'background', label: 'Background', control: 'text', placeholder: 'e.g. url(/file/bg.jpg) center / cover'},
            {value: 'max-width', label: 'Maximum width', control: 'length', placeholder: 'e.g. 60rem or 100%'},
            {value: 'width', label: 'Width', control: 'length', placeholder: 'e.g. 50% or 320px'},
            {value: 'margin', label: 'Margin', control: 'length', placeholder: 'e.g. 1rem auto'},
            {value: 'padding', label: 'Padding', control: 'length', placeholder: 'e.g. 1rem 2rem'},
            {value: 'gap', label: 'Gap', control: 'length', placeholder: 'e.g. 1rem'},
            {value: 'display', label: 'Display', control: 'choice', choices: ['block', 'inline-block', 'flex', 'grid', 'none']},
            {value: 'text-indent', label: 'Text indent', control: 'length', placeholder: 'e.g. 2em'},
        ],
    },
    {
        label: 'Border and effects',
        options: [
            {value: 'border', label: 'Border', control: 'text', placeholder: 'e.g. 1px solid #888'},
            {value: 'border-color', label: 'Border colour', control: 'color'},
            {value: 'border-radius', label: 'Corner radius', control: 'length', placeholder: 'e.g. 8px'},
            {value: 'box-shadow', label: 'Shadow', control: 'text', placeholder: 'e.g. 0 2px 8px rgba(0,0,0,.3)'},
            {value: 'opacity', label: 'Opacity', control: 'length', placeholder: '0 to 1'},
        ],
    },
];

const ALL_PROPERTIES: StylePropertyChoice[] = PAGE_STYLE_PROPERTIES.flatMap((group) => group.options);

/** The catalog entry of a property, undefined for a property that was typed. */
export function findStyleProperty(property: string): StylePropertyChoice | undefined {
    const wanted = property.trim().toLowerCase();
    return ALL_PROPERTIES.find((choice) => choice.value === wanted);
}

/** The control that edits the value of a property: the catalog's one, or a text field for an unknown property or a custom variable. */
export function controlFor(property: string): StyleControl {
    if (property.trim().startsWith('--')) {
        return 'text';
    }
    return findStyleProperty(property)?.control ?? 'text';
}

/**
 * Splits CSS into editable rule blocks and verbatim raw blocks. The parser is deliberately simple: a rule is `selector { declarations }`
 * without nested braces; comments, at-rules and anything else are raw blocks in their original position.
 */
export function parsePageStyle(css: string | null | undefined): PageStyleBlock[] {
    const text = css ?? '';
    const blocks: PageStyleBlock[] = [];
    let index = 0;

    while (index < text.length) {
        const start = skipWhitespace(text, index);
        if (start >= text.length) {
            break;
        }
        if (text.startsWith('/*', start)) {
            const end = text.indexOf('*/', start + 2);
            const stop = end < 0 ? text.length : end + 2;
            blocks.push({kind: 'raw', text: text.slice(start, stop)});
            index = stop;
            continue;
        }
        if (text[start] === '@') {
            index = pushRawStatement(text, start, blocks);
            continue;
        }
        const open = text.indexOf('{', start);
        if (open < 0) {
            blocks.push({kind: 'raw', text: text.slice(start).trim()});
            break;
        }
        const close = matchingBrace(text, open);
        if (close < 0) {
            blocks.push({kind: 'raw', text: text.slice(start).trim()});
            break;
        }
        const body = text.slice(open + 1, close);
        if (body.includes('{')) {
            // nested blocks cannot be edited visually
            blocks.push({kind: 'raw', text: text.slice(start, close + 1).trim()});
        } else {
            blocks.push({
                kind: 'rule',
                selector: normalizeSelector(text.slice(start, open)),
                declarations: parseDeclarations(body),
            });
        }
        index = close + 1;
    }
    return blocks;
}

/** Writes the blocks back as CSS: one rule per block, four-space indented declarations, raw blocks verbatim, blank lines between blocks. */
export function serializePageStyle(blocks: PageStyleBlock[]): string {
    const parts: string[] = [];
    for (const block of blocks) {
        if (block.kind === 'raw') {
            if (block.text.trim()) {
                parts.push(block.text.trim());
            }
            continue;
        }
        const selector = block.selector.trim();
        const declarations = block.declarations
            .map((declaration) => ({property: declaration.property.trim(), value: declaration.value.trim()}))
            .filter((declaration) => declaration.property && declaration.value);
        if (!selector || declarations.length === 0) {
            continue;
        }
        parts.push(`${selector} {\n${declarations.map((declaration) => `    ${declaration.property}: ${declaration.value};`).join('\n')}\n}`);
    }
    return parts.join('\n\n');
}

/** A rule block for the selector with one empty declaration row, ready for editing. */
export function newRuleBlock(selector: string = PAGE_CANVAS_SELECTOR): StyleRuleBlock {
    return {kind: 'rule', selector, declarations: [{property: '', value: ''}]};
}

function skipWhitespace(text: string, index: number): number {
    let position = index;
    while (position < text.length && /\s/.test(text[position])) {
        position += 1;
    }
    return position;
}

/** An at-rule: `@import ...;` up to its semicolon, `@media ... { ... }` up to the matching brace. */
function pushRawStatement(text: string, start: number, blocks: PageStyleBlock[]): number {
    const open = text.indexOf('{', start);
    const semicolon = text.indexOf(';', start);
    let stop: number;
    if (semicolon >= 0 && (open < 0 || semicolon < open)) {
        stop = semicolon + 1;
    } else if (open >= 0) {
        const close = matchingBrace(text, open);
        stop = close < 0 ? text.length : close + 1;
    } else {
        stop = text.length;
    }
    blocks.push({kind: 'raw', text: text.slice(start, stop).trim()});
    return stop;
}

/** The index of the brace closing the one at `open`, -1 when it never closes; strings are skipped. */
function matchingBrace(text: string, open: number): number {
    let depth = 0;
    let quote: string | null = null;
    for (let index = open; index < text.length; index += 1) {
        const char = text[index];
        if (quote) {
            if (char === '\\') {
                index += 1;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '{') {
            depth += 1;
        } else if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return index;
            }
        }
    }
    return -1;
}

function normalizeSelector(selector: string): string {
    return selector.replace(/\s+/g, ' ').trim();
}

/** Splits a rule body into declarations; semicolons inside strings and parentheses (`url(...)`, `rgb(...)`) do not split. */
function parseDeclarations(body: string): StyleDeclaration[] {
    const declarations: StyleDeclaration[] = [];
    let current = '';
    let depth = 0;
    let quote: string | null = null;

    const flush = () => {
        const trimmed = current.trim();
        const colon = trimmed.indexOf(':');
        if (colon > 0) {
            declarations.push({property: trimmed.slice(0, colon).trim(), value: trimmed.slice(colon + 1).trim()});
        }
        current = '';
    };

    for (let index = 0; index < body.length; index += 1) {
        const char = body[index];
        if (quote) {
            current += char;
            if (char === '\\' && index + 1 < body.length) {
                current += body[index + 1];
                index += 1;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '(') {
            depth += 1;
        } else if (char === ')') {
            depth = Math.max(0, depth - 1);
        } else if (char === ';' && depth === 0) {
            flush();
            continue;
        }
        current += char;
    }
    flush();
    return declarations;
}
