/**
 * Tests for the internal link suggestions of the link dialog: with a `findInternalLinks` provider the URL field suggests the
 * published pages and files of the host, without one it stays a plain URL field.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import {RichTextEditor} from '../RichTextEditor';
import {renderWithProviders} from '../test-utils/renderWithProviders';
import {firstText, focusEditor, placeCaret} from '../test-utils/editorSelection';
import type {InternalLinkQueryParams, InternalLinkTarget} from '../types';

const targets: InternalLinkTarget[] = [
    {href: '/pages/about', label: 'About us', kind: 'page'},
    {href: '/file/document/2024/report.pdf', label: 'document/2024/report.pdf', kind: 'file'},
];

function renderEditorWithLinks(findInternalLinks: (params: InternalLinkQueryParams) => Promise<InternalLinkTarget[]>) {
    const onChange = jest.fn();
    renderWithProviders(
            <RichTextEditor value="<p>Hi</p>" onChange={onChange} dataProviders={{findInternalLinks}}/>,
    );
    const editor = focusEditor();
    placeCaret(firstText(editor, 'p'), 2);
    return {onChange, editor};
}

function openLinkDialog(): void {
    fireEvent.mouseDown(screen.getByRole('button', {name: 'link'}));
}

/** The input of the URL AutoComplete; Ant Design renders the placeholder as a span, so the field is found by its class. */
function urlInput(): HTMLInputElement {
    const input = document.querySelector('.vps-link-target-search input');
    if (!(input instanceof HTMLInputElement)) {
        throw new Error('The URL field is not rendered');
    }
    return input;
}

async function selectOption(label: string): Promise<void> {
    const option = await waitFor(() => {
        const element = [...document.querySelectorAll('.ant-select-item-option')].find((candidate) => candidate.textContent?.includes(label));
        if (!(element instanceof HTMLElement)) {
            throw new Error(`Option ${label} is not rendered`);
        }
        return element;
    });
    fireEvent.click(option);
}

describe('internal link suggestions', () => {
    it('keeps a plain URL field when the host provides no link targets', async () => {
        const onChange = jest.fn();
        renderWithProviders(<RichTextEditor value="<p>Hi</p>" onChange={onChange}/>);
        focusEditor();

        openLinkDialog();

        await screen.findByPlaceholderText('https://example.com');
        expect(document.querySelector('.vps-link-target-search')).toBeNull();
        expect(screen.queryByText(/published pages and files/)).not.toBeInTheDocument();
    });

    it('asks the host for targets when the dialog opens and again, after a pause, for the typed text', async () => {
        const findInternalLinks = jest.fn<(params: InternalLinkQueryParams) => Promise<InternalLinkTarget[]>>().mockResolvedValue(targets);
        renderEditorWithLinks(findInternalLinks);

        openLinkDialog();

        await waitFor(() => expect(findInternalLinks).toHaveBeenCalledWith({search: '', limit: 20}));
        expect(document.querySelector('.vps-link-target-search')).not.toBeNull();
        expect(screen.getByText(/published pages and files/)).toBeInTheDocument();

        await waitFor(() => urlInput());
        fireEvent.change(urlInput(), {target: {value: 'ab'}});
        fireEvent.change(urlInput(), {target: {value: 'abo'}});

        // Only the last keystroke reaches the host, after the debounce
        await waitFor(() => expect(findInternalLinks).toHaveBeenCalledWith({search: 'abo', limit: 20}));
        expect(findInternalLinks).toHaveBeenCalledTimes(2);
    });

    it('inserts the picked target with its href and label', async () => {
        const findInternalLinks = jest.fn<(params: InternalLinkQueryParams) => Promise<InternalLinkTarget[]>>().mockResolvedValue(targets);
        const {onChange} = renderEditorWithLinks(findInternalLinks);

        openLinkDialog();
        fireEvent.mouseDown(await waitFor(() => urlInput()));
        await selectOption('About us');

        await waitFor(() => expect(urlInput().value).toBe('/pages/about'));
        expect((screen.getByPlaceholderText('Link text') as HTMLInputElement).value).toBe('About us');

        fireEvent.click(screen.getByRole('button', {name: /^ok$/i}));

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Hi<a href="/pages/about">About us</a></p>'));
    });

    it('keeps the link text the user typed and shows the kind of every target', async () => {
        const findInternalLinks = jest.fn<(params: InternalLinkQueryParams) => Promise<InternalLinkTarget[]>>().mockResolvedValue(targets);
        const {onChange} = renderEditorWithLinks(findInternalLinks);

        openLinkDialog();
        fireEvent.change(await waitFor(() => screen.getByPlaceholderText('Link text')), {target: {value: 'The report'}});
        fireEvent.mouseDown(urlInput());
        await waitFor(() => expect(document.querySelectorAll('.vps-link-target-kind')).toHaveLength(2));
        await selectOption('report.pdf');

        await waitFor(() => expect(urlInput().value).toBe('/file/document/2024/report.pdf'));
        expect((screen.getByPlaceholderText('Link text') as HTMLInputElement).value).toBe('The report');

        fireEvent.click(screen.getByRole('button', {name: /^ok$/i}));

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Hi<a href="/file/document/2024/report.pdf">The report</a></p>'));
    });

    it('still accepts any URL typed by hand and survives a failing provider', async () => {
        const findInternalLinks = jest.fn<(params: InternalLinkQueryParams) => Promise<InternalLinkTarget[]>>().mockRejectedValue(new Error('down'));
        const {onChange} = renderEditorWithLinks(findInternalLinks);

        openLinkDialog();
        await waitFor(() => expect(findInternalLinks).toHaveBeenCalled());
        fireEvent.change(urlInput(), {target: {value: 'https://example.com'}});
        fireEvent.click(screen.getByRole('button', {name: /^ok$/i}));

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Hi<a href="https://example.com">https://example.com</a></p>'));
        expect(document.querySelector('.ant-select-item-option')).toBeNull();
    });
});
