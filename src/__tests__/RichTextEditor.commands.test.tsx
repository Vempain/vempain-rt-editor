/**
 * Tests for the DOM editing commands of RichTextEditor – the selection guard,
 * inline wrapping, block formats, lists, tables, links and the mode switch.
 * Selections are placed with Range/Selection APIs and the toolbar is driven
 * with mouseDown events, exactly like a browser would do it.
 */
import React, {useState} from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichTextEditor} from '../RichTextEditor';
import {renderWithProviders} from '../test-utils/renderWithProviders';
import {clearSelection, currentRange, firstText, focusEditor, getEditor, placeCaret, setSelection} from '../test-utils/editorSelection';

function renderEditor(value: string) {
    const onChange = jest.fn();
    renderWithProviders(<RichTextEditor value={value} onChange={onChange}/>);
    // A user clicks into the editor before selecting text; see focusEditor for the jsdom detail
    return {onChange, editor: focusEditor()};
}

/** Press a toolbar button the way a browser does (mouseDown); returns false when the default was prevented. */
function pressToolbar(name: string | RegExp): boolean {
    return fireEvent.mouseDown(screen.getByRole('button', {name}));
}

/**
 * A host that feeds every onChange value back into the editor, like the admin
 * frontend does; needed for flows where the editor compares its content with
 * the value prop (mode switches).
 */
function ControlledEditor({initialValue, onChange}: { initialValue: string; onChange?: (value: string) => void }) {
    const [value, setValue] = useState(initialValue);
    return (
            <RichTextEditor
                    value={value}
                    onChange={(next) => {
                        setValue(next);
                        onChange?.(next);
                    }}
            />
    );
}

/**
 * Open the block-format Select and pick the option with the given label.
 *
 * Opening the Select moves the focus to its search input. When the command then
 * focuses the editor again a browser restores the caret the user had; jsdom
 * would collapse the selection to the editor start instead. `restoreCaret` places
 * that caret and the editor's own focus() is kept from touching it for the click.
 */
async function chooseBlockFormat(label: string, restoreCaret: () => void): Promise<void> {
    await userEvent.click(screen.getByRole('combobox'));
    const option = await waitFor(() => {
        const element = document.querySelector(`.ant-select-item-option[title="${label}"]`);
        if (!(element instanceof HTMLElement)) {
            throw new Error(`Option ${label} is not rendered`);
        }
        return element;
    });
    const editor = getEditor();
    restoreCaret();
    editor.focus = () => undefined;
    try {
        await userEvent.click(option);
    } finally {
        Reflect.deleteProperty(editor, 'focus');
    }
}

async function openLinkDialog(): Promise<HTMLInputElement> {
    pressToolbar('link');
    return await screen.findByPlaceholderText('https://example.com') as HTMLInputElement;
}

async function submitLink(url: string, text?: string): Promise<void> {
    const urlInput = await openLinkDialog();
    fireEvent.change(urlInput, {target: {value: url}});
    if (text !== undefined) {
        fireEvent.change(screen.getByPlaceholderText('Link text'), {target: {value: text}});
    }
    fireEvent.click(screen.getByRole('button', {name: /^ok$/i}));
}

describe('RichTextEditor editing commands', () => {
    // -----------------------------------------------------------------------
    // Selection guard shared by every command
    // -----------------------------------------------------------------------
    describe('selection guard', () => {
        it('prevents the default mouseDown so the editor selection survives the click', () => {
            renderEditor('<p>Hello</p>');
            expect(pressToolbar(/bold/i)).toBe(false);
            expect(pressToolbar('table')).toBe(false);
            expect(pressToolbar(/html/i)).toBe(false);
        });

        it('does nothing when there is no selection', () => {
            const {onChange} = renderEditor('<p>Hello</p>');
            clearSelection();
            pressToolbar(/bold/i);
            pressToolbar('ordered-list');
            pressToolbar('table');
            expect(onChange).not.toHaveBeenCalled();
        });

        it('does nothing when the selection lies outside the editor', () => {
            const {onChange, editor} = renderEditor('<p>Hello</p>');
            const outside = document.createElement('div');
            outside.textContent = 'outside';
            document.body.appendChild(outside);
            try {
                setSelection(firstText(outside), 0, firstText(outside), 3);
                pressToolbar(/bold/i);
                expect(onChange).not.toHaveBeenCalled();
                expect(editor.innerHTML).toBe('<p>Hello</p>');
            } finally {
                outside.remove();
            }
        });

        it('syncs the content on blur', () => {
            const {onChange, editor} = renderEditor('<p>Hello</p>');
            editor.innerHTML = '<p>Changed</p>';
            fireEvent.blur(editor);
            expect(onChange).toHaveBeenLastCalledWith('<p>Changed</p>');
        });
    });

    // -----------------------------------------------------------------------
    // Inline formatting (b / i / u / s)
    // -----------------------------------------------------------------------
    describe('inline formatting', () => {
        it('wraps the selected text in <b>', () => {
            const {onChange, editor} = renderEditor('<p>Hello world</p>');
            const text = firstText(editor, 'p');
            setSelection(text, 0, text, 5);

            pressToolbar(/bold/i);

            expect(onChange).toHaveBeenLastCalledWith('<p><b>Hello</b> world</p>');
            const range = currentRange();
            expect(range?.collapsed).toBe(true);
            expect(range?.startContainer).toBe(editor.querySelector('p'));
        });

        it('inserts an empty <i> with a zero-width space at a collapsed caret and puts the caret inside it', () => {
            const {onChange, editor} = renderEditor('<p>Hello</p>');
            placeCaret(firstText(editor, 'p'), 2);

            pressToolbar(/italic/i);

            expect(onChange).toHaveBeenLastCalledWith('<p>He<i>​</i>llo</p>');
            const range = currentRange();
            expect(range?.collapsed).toBe(true);
            expect(range?.startContainer.parentElement?.tagName).toBe('I');
            expect(range?.startOffset).toBe(1);
        });

        it('wraps a whole paragraph text in <u>', () => {
            const {onChange, editor} = renderEditor('<p>Hello</p>');
            const text = firstText(editor, 'p');
            setSelection(text, 0, text, text.length);

            pressToolbar(/underline/i);

            expect(onChange).toHaveBeenLastCalledWith('<p><u>Hello</u></p>');
        });

        it('wraps a selection that spans several nodes in <s>', () => {
            const {onChange, editor} = renderEditor('<p>Hello <i>big</i> world</p>');
            const paragraph = editor.querySelector('p') as HTMLElement;
            const start = paragraph.firstChild as Text;
            const end = paragraph.lastChild as Text;
            setSelection(start, 2, end, 3);

            pressToolbar(/strikethrough/i);

            expect(onChange).toHaveBeenLastCalledWith('<p>He<s>llo <i>big</i> wo</s>rld</p>');
        });
    });

    // -----------------------------------------------------------------------
    // Block formats (headings / paragraphs)
    // -----------------------------------------------------------------------
    describe('block formats', () => {
        it('turns the current paragraph into a heading and leaves the caret at its end', async () => {
            const {onChange, editor} = renderEditor('<p>Hello</p>');

            await chooseBlockFormat('H2', () => placeCaret(firstText(editor, 'p'), 1));

            expect(onChange).toHaveBeenLastCalledWith('<h2>Hello</h2>');
            const range = currentRange();
            expect(range?.collapsed).toBe(true);
            expect(range?.startContainer).toBe(editor.querySelector('h2'));
        });

        it('finds the block through nested inline elements', async () => {
            const {onChange, editor} = renderEditor('<p><b>Hi</b></p>');

            await chooseBlockFormat('H3', () => placeCaret(firstText(editor, 'b'), 1));

            expect(onChange).toHaveBeenLastCalledWith('<h3><b>Hi</b></h3>');
        });

        it('inserts an empty block when the caret sits directly in the editor root', async () => {
            const {onChange, editor} = renderEditor('Hello');

            await chooseBlockFormat('H1', () => placeCaret(firstText(editor), 2));

            expect(onChange).toHaveBeenLastCalledWith('He<h1></h1>llo');
        });

        it('leaves a block alone that already has the requested tag', async () => {
            const {onChange, editor} = renderEditor('<h2>Hi</h2>');

            await chooseBlockFormat('H2', () => placeCaret(firstText(editor, 'h2'), 1));

            expect(onChange).toHaveBeenLastCalledWith('<h2>Hi</h2>');
            expect(editor.innerHTML).toBe('<h2>Hi</h2>');
        });

        it('turns a heading back into a paragraph', async () => {
            const {onChange, editor} = renderEditor('<h1>Title</h1>');

            await chooseBlockFormat('H4', () => placeCaret(firstText(editor, 'h1'), 0));
            expect(onChange).toHaveBeenLastCalledWith('<h4>Title</h4>');

            await chooseBlockFormat('Normal', () => placeCaret(firstText(editor, 'h4'), 0));
            expect(onChange).toHaveBeenLastCalledWith('<p>Title</p>');
        });

        it('does nothing without a selection', async () => {
            const {onChange, editor} = renderEditor('<p>Hello</p>');

            await chooseBlockFormat('H2', () => clearSelection());

            expect(editor.innerHTML).toBe('<p>Hello</p>');
            expect(onChange.mock.calls.some(([html]) => (html as string).includes('<h2'))).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Lists
    // -----------------------------------------------------------------------
    describe('lists', () => {
        it('wraps the current block in an unordered list and moves the caret into the item', () => {
            const {onChange, editor} = renderEditor('<p>Item</p>');
            placeCaret(firstText(editor, 'p'), 2);

            pressToolbar('unordered-list');

            expect(onChange).toHaveBeenLastCalledWith('<ul><li>Item</li></ul>');
            expect(currentRange()?.startContainer).toBe(editor.querySelector('li'));
        });

        it('wraps the current block in an ordered list', () => {
            const {onChange, editor} = renderEditor('<p>Item</p>');
            placeCaret(firstText(editor, 'p'), 0);

            pressToolbar('ordered-list');

            expect(onChange).toHaveBeenLastCalledWith('<ol><li>Item</li></ol>');
        });

        it('unwraps a list item back into a paragraph when toggled with the same list type', () => {
            const {onChange, editor} = renderEditor('<ul><li>Item</li></ul>');
            placeCaret(firstText(editor, 'li'), 1);

            pressToolbar('unordered-list');

            expect(onChange).toHaveBeenLastCalledWith('<p>Item</p>');
        });

        it('nests a list item in a list of the other type', () => {
            const {onChange, editor} = renderEditor('<ul><li>Item</li></ul>');
            placeCaret(firstText(editor, 'li'), 1);

            pressToolbar('ordered-list');

            expect(onChange).toHaveBeenLastCalledWith('<ul><ol><li>Item</li></ol></ul>');
        });

        it('fills an empty block with a zero-width space', () => {
            const {onChange, editor} = renderEditor('<p></p>');
            placeCaret(editor.querySelector('p') as HTMLElement, 0);

            pressToolbar('ordered-list');

            expect(onChange).toHaveBeenLastCalledWith('<ol><li>​</li></ol>');
        });

        it('leaves content without a block element untouched', () => {
            const {onChange, editor} = renderEditor('Hello');
            placeCaret(firstText(editor), 2);

            pressToolbar('unordered-list');

            expect(onChange).toHaveBeenLastCalledWith('Hello');
        });
    });

    // -----------------------------------------------------------------------
    // Table insertion
    // -----------------------------------------------------------------------
    describe('table insertion', () => {
        it('inserts a 3x3 table with a header row followed by an empty paragraph at the caret', () => {
            const {onChange, editor} = renderEditor('Hi');
            placeCaret(firstText(editor), 2);

            pressToolbar('table');

            const html = onChange.mock.calls.at(-1)?.[0] as string;
            expect(html.startsWith('Hi<table style="border-collapse:collapse;width:100%;border:1px solid #666"><tbody><tr><th style="padding:4px;border:1px solid #666"></th>')).toBe(true);
            expect(html.endsWith('</tbody></table><p></p>')).toBe(true);
            expect(html.match(/<th /g)).toHaveLength(3);
            expect(html.match(/<td /g)).toHaveLength(6);
            expect(html.match(/<tr>/g)).toHaveLength(3);
            const range = currentRange();
            expect(range?.collapsed).toBe(true);
            expect(range?.startContainer).toBe(editor);
            expect(editor.childNodes[(range?.startOffset ?? 0) - 1]).toBe(editor.querySelector('p'));
        });

        it('replaces the selected text with the table', () => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            const text = firstText(editor, 'p');
            setSelection(text, 0, text, 2);

            pressToolbar('table');

            const html = onChange.mock.calls.at(-1)?.[0] as string;
            expect(html.startsWith('<p><table ')).toBe(true);
            expect(html).not.toContain('Hi');
        });
    });

    // -----------------------------------------------------------------------
    // Link insertion
    // -----------------------------------------------------------------------
    describe('link insertion', () => {
        it('inserts a link with the given text at the saved caret', async () => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            placeCaret(firstText(editor, 'p'), 2);

            await submitLink('https://example.com', 'Example');

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Hi<a href="https://example.com">Example</a></p>'));
            const range = currentRange();
            expect(range?.collapsed).toBe(true);
            expect(range?.startContainer).toBe(editor.querySelector('p'));
        });

        it('wraps the saved selection in the link', async () => {
            const {onChange, editor} = renderEditor('<p>Hello world</p>');
            const text = firstText(editor, 'p');
            setSelection(text, 0, text, 5);

            await submitLink('https://example.com', 'ignored for a selection');

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p><a href="https://example.com">Hello</a> world</p>'));
        });

        it('uses the URL as the link text when no text is given', async () => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            placeCaret(firstText(editor, 'p'), 2);

            await submitLink('https://example.com');

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Hi<a href="https://example.com">https://example.com</a></p>'));
        });

        it.each([
            ['javascript:alert(1)'],
            [' JavaScript:alert(1)'],
            ['data:text/html,<b>x</b>'],
            ['vbscript:MsgBox'],
        ])('neutralises the dangerous URL %s', async (url) => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            placeCaret(firstText(editor, 'p'), 2);

            await submitLink(url);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Hi<a href="#">#</a></p>'));
        });

        it('keeps the given text for a neutralised URL', async () => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            placeCaret(firstText(editor, 'p'), 0);

            await submitLink('javascript:alert(1)', 'Click');

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p><a href="#">Click</a>Hi</p>'));
        });

        it('strips markup from the link text', async () => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            placeCaret(firstText(editor, 'p'), 2);

            await submitLink('https://example.com', '<img src="x" onerror="alert(1)">Safe');

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Hi<a href="https://example.com">Safe</a></p>'));
        });

        it('shows a validation error and keeps the dialog open when the URL is empty', async () => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            placeCaret(firstText(editor, 'p'), 2);

            await openLinkDialog();
            fireEvent.click(screen.getByRole('button', {name: /^ok$/i}));

            expect(await screen.findByText('Please enter a URL')).toBeInTheDocument();
            expect(screen.getByText('Insert Link')).toBeInTheDocument();
            expect(editor.innerHTML).toBe('<p>Hi</p>');
            expect(onChange.mock.calls.some(([html]) => (html as string).includes('<a'))).toBe(false);
        });

        it('closes the dialog without inserting anything when no selection was saved', async () => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            clearSelection();

            await submitLink('https://example.com', 'Example');

            await waitFor(() => expect(screen.queryByText('Insert Link')).not.toBeInTheDocument(), {timeout: 5000});
            expect(editor.innerHTML).toBe('<p>Hi</p>');
            expect(onChange.mock.calls.some(([html]) => (html as string).includes('<a'))).toBe(false);
        }, 15000);

        it('falls back to the live selection when the saved range was detached from the editor', async () => {
            const {onChange, editor} = renderEditor('<p>Hi</p>');
            placeCaret(firstText(editor, 'p'), 2);
            await openLinkDialog();

            // Replacing the content detaches the node the saved range pointed at
            editor.innerHTML = '<p>Replaced</p>';
            fireEvent.change(screen.getByPlaceholderText('https://example.com'), {target: {value: 'https://example.com'}});
            fireEvent.change(screen.getByPlaceholderText('Link text'), {target: {value: 'X'}});
            fireEvent.click(screen.getByRole('button', {name: /^ok$/i}));

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<a href="https://example.com">X</a><p>Replaced</p>'));
        });

        it('closes the dialog when Cancel is clicked', async () => {
            const {editor} = renderEditor('<p>Hi</p>');
            await openLinkDialog();

            fireEvent.click(screen.getByRole('button', {name: /cancel/i}));

            await waitFor(() => expect(screen.queryByText('Insert Link')).not.toBeInTheDocument(), {timeout: 5000});
            expect(editor.innerHTML).toBe('<p>Hi</p>');
        }, 15000);
    });

    // -----------------------------------------------------------------------
    // Source / WYSIWYG mode switch
    // -----------------------------------------------------------------------
    describe('mode switch', () => {
        it('captures WYSIWYG edits when switching to source mode and restores them on the way back', () => {
            const onChange = jest.fn();
            renderWithProviders(<ControlledEditor initialValue="<p>Old</p>" onChange={onChange}/>);
            const editor = focusEditor();
            editor.innerHTML = '<p>Edited</p>';
            fireEvent.input(editor);
            expect(onChange).toHaveBeenLastCalledWith('<p>Edited</p>');

            pressToolbar(/html/i);
            expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('<p>Edited</p>');

            pressToolbar(/wysiwyg/i);
            expect(getEditor().innerHTML).toBe('<p>Edited</p>');
        });

        it('reverts to the value prop on a mode switch when the host does not feed onChange back', () => {
            const {editor} = renderEditor('<p>Old</p>');
            editor.innerHTML = '<p>Edited</p>';
            fireEvent.input(editor);

            pressToolbar(/html/i);

            expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('<p>Old</p>');
        });

        it('shows placeholders for embed tags typed in source mode after switching back', () => {
            const onChange = jest.fn();
            renderWithProviders(<ControlledEditor initialValue="" onChange={onChange}/>);
            pressToolbar(/html/i);
            fireEvent.change(screen.getByRole('textbox'), {target: {value: '<p>a</p><!--vps:embed:gallery:5-->'}});
            expect(onChange).toHaveBeenLastCalledWith('<p>a</p><!--vps:embed:gallery:5-->');

            pressToolbar(/wysiwyg/i);

            const placeholder = getEditor().querySelector('.vps-embed-placeholder') as HTMLElement;
            expect(placeholder.dataset.type).toBe('gallery');
            expect(placeholder.dataset.id).toBe('5');
        });
    });
});
