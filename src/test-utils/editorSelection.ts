/**
 * Helpers for driving the WYSIWYG editor in tests: locating the contenteditable
 * element and placing the document selection inside it with Range/Selection
 * APIs, which jsdom supports.
 */

/** The editable WYSIWYG element of the rendered RichTextEditor. */
export function getEditor(): HTMLElement {
    const editor = document.querySelector('[contenteditable="true"]');
    if (!(editor instanceof HTMLElement)) {
        throw new Error('The WYSIWYG editor is not rendered');
    }
    return editor;
}

/**
 * Focus the editor before placing a selection in it. jsdom collapses the document
 * selection to the start of an element every time `focus()` is called on it, unless
 * the element is already focused; focusing up front mirrors a user who clicked into
 * the editor and lets the editor's own `focus()` calls keep the selection intact.
 */
export function focusEditor(): HTMLElement {
    const editor = getEditor();
    editor.focus();
    return editor;
}

/** The first child text node of `parent` (or of the element matching `selector` inside it). */
export function firstText(parent: ParentNode, selector?: string): Text {
    const target = selector ? parent.querySelector(selector) : parent;
    const text = target?.firstChild;
    if (!(text instanceof Text)) {
        throw new Error(`No text node found${selector ? ` for ${selector}` : ''}`);
    }
    return text;
}

/** Replace the document selection with a range from (startNode, startOffset) to (endNode, endOffset). */
export function setSelection(startNode: Node, startOffset: number, endNode: Node = startNode, endOffset: number = startOffset): Range {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection();
    if (!selection) {
        throw new Error('window.getSelection() is not available');
    }
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
}

/** Collapse the selection to a caret at (node, offset). */
export function placeCaret(node: Node, offset: number): Range {
    return setSelection(node, offset, node, offset);
}

/** Remove every range from the document selection. */
export function clearSelection(): void {
    window.getSelection()?.removeAllRanges();
}

/** The current selection range, or null when nothing is selected. */
export function currentRange(): Range | null {
    const selection = window.getSelection();
    return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
}
