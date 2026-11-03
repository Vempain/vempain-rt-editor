/**
 * Tests of the DOM formatting commands: inline formats toggle (and never nest), block formats apply to every touched block, root-level
 * text is wrapped with its line, and list items keep their tag.
 */
import {describe, expect, it} from '@jest/globals';
import {
    applyBlockFormat,
    blockElementOf,
    currentBlockFormat,
    isRangeFormatted,
    textNodesInRange,
    toggleInlineFormat,
} from '../../tools/formatTools';

function root(html: string): HTMLElement {
    const element = document.createElement('div');
    element.innerHTML = html;
    document.body.appendChild(element);
    return element;
}

function text(parent: ParentNode, selector?: string, index = 0): Text {
    const target = selector ? parent.querySelector(selector) : parent;
    const node = target?.childNodes[index];
    if (!(node instanceof Text)) {
        throw new Error('no text node');
    }
    return node;
}

function range(start: Node, startOffset: number, end: Node = start, endOffset: number = startOffset): Range {
    const r = document.createRange();
    r.setStart(start, startOffset);
    r.setEnd(end, endOffset);
    return r;
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('toggleInlineFormat', () => {
    it('wraps plain text and keeps the wrapped text selected', () => {
        const editor = root('<p>Hello world</p>');
        const selected = toggleInlineFormat(range(text(editor, 'p'), 0, text(editor, 'p'), 5), 'b', editor);
        expect(editor.innerHTML).toBe('<p><b>Hello</b> world</p>');
        expect(selected.toString()).toBe('Hello');
    });

    it('removes the format from a selection inside a formatting element by splitting it', () => {
        const editor = root('<p><b>Hello big world</b></p>');
        const bold = text(editor, 'b');
        const selected = toggleInlineFormat(range(bold, 6, bold, 9), 'b', editor);
        expect(editor.innerHTML).toBe('<p><b>Hello </b>big<b> world</b></p>');
        expect(selected.toString()).toBe('big');
    });

    it('removes the format from a whole formatted word and drops the emptied element', () => {
        const editor = root('<p>Hello <b>world</b></p>');
        const bold = text(editor, 'b');
        toggleInlineFormat(range(bold, 0, bold, 5), 'b', editor);
        expect(editor.innerHTML).toBe('<p>Hello world</p>');
    });

    it('toggles back and forth without nesting', () => {
        const editor = root('<p>Hello</p>');
        let selected = toggleInlineFormat(range(text(editor, 'p'), 0, text(editor, 'p'), 5), 'b', editor);
        expect(editor.innerHTML).toBe('<p><b>Hello</b></p>');
        selected = toggleInlineFormat(selected, 'b', editor);
        expect(editor.innerHTML).toBe('<p>Hello</p>');
        selected = toggleInlineFormat(selected, 'b', editor);
        expect(editor.innerHTML).toBe('<p><b>Hello</b></p>');
        expect(selected.toString()).toBe('Hello');
    });

    it('treats <strong> and <em> as bold and italic', () => {
        const editor = root('<p><strong>Hi</strong> <em>there</em></p>');
        const strong = text(editor, 'strong');
        expect(isRangeFormatted(range(strong, 0, strong, 2), 'b', editor)).toBe(true);
        toggleInlineFormat(range(strong, 0, strong, 2), 'b', editor);
        const em = text(editor, 'em');
        toggleInlineFormat(range(em, 0, em, 5), 'i', editor);
        expect(editor.innerHTML).toBe('<p>Hi there</p>');
    });

    it('removes the format from a selection spanning several formatted elements', () => {
        const editor = root('<p><b>one</b> <b>two</b> <b>three</b></p>');
        const paragraph = editor.querySelector('p') as HTMLElement;
        const one = text(paragraph, 'b');
        const three = paragraph.lastElementChild?.firstChild as Text;
        expect(isRangeFormatted(range(one, 1, three, 2), 'b', editor)).toBe(false); // the spaces between are plain
        const bolds = Array.from(paragraph.querySelectorAll('b'));
        toggleInlineFormat(range(bolds[0].firstChild as Text, 0, bolds[2].firstChild as Text, 5), 'b', editor);
        // the mixed selection becomes bold once, without the emptied shells of the original elements
        expect(editor.innerHTML).toBe('<p><b>one two three</b></p>');
    });

    it('formats a mixed selection once, absorbing the formatting already inside it', () => {
        const editor = root('<p>plain <b>bold</b> plain</p>');
        const paragraph = editor.querySelector('p') as HTMLElement;
        const start = paragraph.firstChild as Text;
        const end = paragraph.lastChild as Text;
        expect(isRangeFormatted(range(start, 0, end, 6), 'b', editor)).toBe(false);
        toggleInlineFormat(range(start, 0, end, 6), 'b', editor);
        expect(editor.innerHTML).toBe('<p><b>plain bold plain</b></p>');
    });

    it('removes a nested format from a selection inside two levels of the same element', () => {
        const editor = root('<p><b>a<b>b</b>c</b></p>');
        const inner = editor.querySelector('b b')?.firstChild as Text;
        toggleInlineFormat(range(inner, 0, inner, 1), 'b', editor);
        expect(editor.innerHTML).toBe('<p><b>a</b>b<b>c</b></p>');
    });

    it('keeps other formats when one is removed', () => {
        const editor = root('<p><b><i>both</i></b></p>');
        const both = text(editor, 'i');
        toggleInlineFormat(range(both, 0, both, 4), 'b', editor);
        expect(editor.innerHTML).toBe('<p><i>both</i></p>');
    });

    it('ignores text nodes the selection only touches at their edge', () => {
        const editor = root('<p><b>bold</b>plain</p>');
        const bold = text(editor, 'b');
        const plain = editor.querySelector('p')?.lastChild as Text;
        expect(textNodesInRange(range(bold, 0, plain, 0)).map(node => node.data)).toEqual(['bold']);
        expect(isRangeFormatted(range(bold, 0, plain, 0), 'b', editor)).toBe(true);
    });
});

describe('applyBlockFormat', () => {
    it('renames the block of a caret, moving its nodes so the caret stays valid', () => {
        const editor = root('<p class="x">Hello</p>');
        const caretNode = text(editor, 'p');
        const replaced = applyBlockFormat(range(caretNode, 2), 'h2', editor);
        expect(editor.innerHTML).toBe('<h2 class="x">Hello</h2>');
        expect(caretNode.isConnected).toBe(true);
        expect(replaced.size).toBe(1);
    });

    it('applies the format to every block the selection touches', () => {
        const editor = root('<p>one</p><p>two</p><h3>three</h3><p>four</p>');
        const one = editor.querySelector('p')?.firstChild as Text;
        const three = editor.querySelector('h3')?.firstChild as Text;
        applyBlockFormat(range(one, 1, three, 1), 'h1', editor);
        expect(editor.innerHTML).toBe('<h1>one</h1><h1>two</h1><h1>three</h1><p>four</p>');
    });

    it('wraps root-level text with the rest of its line instead of inserting an empty block', () => {
        const editor = root('Hello <b>big</b> world<br>next line<p>para</p>');
        const hello = editor.firstChild as Text;
        applyBlockFormat(range(hello, 1, hello, 3), 'h1', editor);
        expect(editor.innerHTML).toBe('<h1>Hello <b>big</b> world</h1><br>next line<p>para</p>');
    });

    it('turns headings back into paragraphs', () => {
        const editor = root('<h1>Title</h1>');
        applyBlockFormat(range(text(editor, 'h1'), 0, text(editor, 'h1'), 5), 'p', editor);
        expect(editor.innerHTML).toBe('<p>Title</p>');
    });

    it('leaves a block that already has the tag alone and reports nothing replaced', () => {
        const editor = root('<h2>Hi</h2>');
        expect(applyBlockFormat(range(text(editor, 'h2'), 1), 'h2', editor).size).toBe(0);
        expect(editor.innerHTML).toBe('<h2>Hi</h2>');
    });

    it('keeps list items and puts the heading inside them', () => {
        const editor = root('<ul><li>Item</li></ul>');
        const item = text(editor, 'li');
        applyBlockFormat(range(item, 1), 'h3', editor);
        expect(editor.innerHTML).toBe('<ul><li><h3>Item</h3></li></ul>');
        applyBlockFormat(range(item, 1), 'h4', editor);
        expect(editor.innerHTML).toBe('<ul><li><h4>Item</h4></li></ul>');
        applyBlockFormat(range(item, 1), 'p', editor);
        expect(editor.innerHTML).toBe('<ul><li>Item</li></ul>');
    });
});

describe('currentBlockFormat and blockElementOf', () => {
    it('reports the heading of the selection start, the paragraph otherwise', () => {
        const editor = root('<h2>Title</h2><p>Body</p>Loose<ul><li><h4>Item</h4></li></ul>');
        expect(currentBlockFormat(range(text(editor, 'h2'), 1), editor)).toBe('h2');
        expect(currentBlockFormat(range(text(editor, 'p'), 1), editor)).toBe('p');
        expect(currentBlockFormat(range(editor.childNodes[2], 1), editor)).toBe('p');
        expect(currentBlockFormat(range(text(editor, 'h4'), 1), editor)).toBe('h4');
        expect(currentBlockFormat(null, editor)).toBe('p');
        expect(blockElementOf(editor.childNodes[2], editor)).toBeNull();
        expect(blockElementOf(text(editor, 'h4'), editor)?.tagName).toBe('H4');
    });
});
