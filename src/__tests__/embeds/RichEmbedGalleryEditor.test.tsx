/**
 * Tests for RichEmbedGalleryEditor – verifies that gallery data is fetched on open,
 * the modal title is displayed, and that onConfirm / onCancel callbacks fire correctly.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {getNextGalleryPage, handleGalleryPopupScroll, requestNextGalleryPage, RichEmbedGalleryEditor} from '../../embeds/RichEmbedGalleryEditor';
import {mockGalleries, renderWithProviders} from '../../test-utils/renderWithProviders';
import type {EmbedDataProviders, GalleryVO, PagedResponse} from '../../types';

/** The dropdown list element of the open antd Select that receives the popup scroll events. */
function getDropdownListHolder(): HTMLElement {
    const holder = document.querySelector('.ant-select-dropdown-list-holder');
    if (!(holder instanceof HTMLElement)) {
        throw new Error('The select dropdown is not open');
    }
    return holder;
}

describe('RichEmbedGalleryEditor', () => {
    it('renders modal title when open', async () => {
        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(await screen.findByText('Insert Gallery Embed')).toBeInTheDocument();
    });

    it('calls findGalleries with the first page when opened', async () => {
        const {providers} = renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        await waitFor(() => expect(providers.findGalleries).toHaveBeenCalledWith({
            page: 0,
            size: 50,
            sort_by: 'short_name',
            direction: 'ASC',
            search: undefined,
        }));
    });

    it('displays galleries in the select after loading', async () => {
        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        // Wait for loading to complete (Spin goes away)
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        // Open the dropdown to force options to render in the portal
        const combobox = screen.getByRole('combobox');
        await userEvent.click(combobox);
        for (const gallery of mockGalleries) {
            expect(await screen.findByText(gallery.short_name)).toBeInTheDocument();
        }
    });

    it('shows error state when findGalleries rejects (OK button stays disabled)', async () => {
        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
                {
                    providerOverrides: {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        findGalleries: jest.fn<any>().mockRejectedValue(new Error('Network error')),
                    },
                },
        );
        // After rejecting, loading ends and OK button remains disabled with no selection
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        // The select should be disabled due to an error
        expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('searches galleries through the provider instead of filtering locally', async () => {
        const user = userEvent.setup();
        const {providers} = renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        await waitFor(() => expect(providers.findGalleries).toHaveBeenCalledTimes(1));

        await user.type(screen.getByRole('combobox'), 'winter');

        await waitFor(() => expect(providers.findGalleries).toHaveBeenLastCalledWith({
            page: 0,
            size: 50,
            sort_by: 'short_name',
            direction: 'ASC',
            search: 'winter',
        }));
    });

    it('detects when another gallery page should be loaded', () => {
        expect(getNextGalleryPage(100, 100, 100, 0, 2)).toBe(1);
        expect(getNextGalleryPage(0, 100, 500, 0, 2)).toBeNull();
        expect(getNextGalleryPage(100, 100, 100, 1, 2)).toBeNull();
    });

    it('requests the next gallery page only when more pages are available', () => {
        const loadPage = jest.fn();

        requestNextGalleryPage(100, 100, 100, 0, 2, loadPage);
        requestNextGalleryPage(0, 100, 500, 0, 2, loadPage);

        expect(loadPage).toHaveBeenCalledWith(1);
        expect(loadPage).toHaveBeenCalledTimes(1);
    });

    it('does not load pages while a gallery request is in progress', () => {
        const loadPage = jest.fn();

        handleGalleryPopupScroll(100, 100, 100, 0, 2, true, loadPage);

        expect(loadPage).not.toHaveBeenCalled();
    });

    it('calls onCancel when the Cancel button is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        const cancelBtn = await screen.findByText('Cancel');
        await userEvent.click(cancelBtn);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('OK button is disabled when no gallery is selected', async () => {
        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        // Wait for load to finish
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        const okBtn = screen.getByRole('button', {name: /ok/i});
        expect(okBtn).toBeDisabled();
    });

    it('confirms the selected gallery', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedGalleryEditor open={true} initialId={2} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );

        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));

        expect(onConfirm).toHaveBeenCalledWith(2);
    });

    it('does not render modal content when open=false', () => {
        renderWithProviders(
                <RichEmbedGalleryEditor open={false} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.queryByText('Insert Gallery Embed')).not.toBeInTheDocument();
    });

    it('requests the next page from the popup scroll helper when no request is in progress', () => {
        const loadPage = jest.fn();

        handleGalleryPopupScroll(100, 100, 100, 0, 2, false, loadPage);

        expect(loadPage).toHaveBeenCalledWith(1);
    });

    it('loads the next gallery page when the dropdown is scrolled to the bottom', async () => {
        const page0: PagedResponse<GalleryVO> = {content: [{id: 1, short_name: 'Alpha'}], page: 0, total_pages: 2};
        const page1: PagedResponse<GalleryVO> = {content: [{id: 2, short_name: 'Beta'}], page: 1, total_pages: 2};
        const findGalleries = jest.fn<EmbedDataProviders['findGalleries']>()
                .mockResolvedValueOnce(page0)
                .mockResolvedValueOnce(page1);

        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
                {providerOverrides: {findGalleries}},
        );
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        await userEvent.click(screen.getByRole('combobox'));
        expect(await screen.findByTitle('Alpha')).toBeInTheDocument();

        const list = getDropdownListHolder();
        Object.defineProperty(list, 'scrollTop', {value: 100, writable: true});
        Object.defineProperty(list, 'clientHeight', {value: 100, writable: true});
        Object.defineProperty(list, 'scrollHeight', {value: 100, writable: true});
        fireEvent.scroll(list);

        await waitFor(() => expect(findGalleries).toHaveBeenCalledTimes(2));
        expect(findGalleries).toHaveBeenLastCalledWith({
            page: 1,
            size: 50,
            sort_by: 'short_name',
            direction: 'ASC',
            search: undefined,
        });
        expect(await screen.findByTitle('Beta')).toBeInTheDocument();
        expect(screen.getByTitle('Alpha')).toBeInTheDocument();
    });

    it('does not request another page from the dropdown while it is not scrolled to the bottom', async () => {
        const page0: PagedResponse<GalleryVO> = {content: [{id: 1, short_name: 'Alpha'}], page: 0, total_pages: 2};
        const findGalleries = jest.fn<EmbedDataProviders['findGalleries']>().mockResolvedValue(page0);

        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
                {providerOverrides: {findGalleries}},
        );
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        await userEvent.click(screen.getByRole('combobox'));
        expect(await screen.findByTitle('Alpha')).toBeInTheDocument();

        const list = getDropdownListHolder();
        Object.defineProperty(list, 'scrollTop', {value: 0, writable: true});
        Object.defineProperty(list, 'clientHeight', {value: 100, writable: true});
        Object.defineProperty(list, 'scrollHeight', {value: 500, writable: true});
        fireEvent.scroll(list);

        expect(findGalleries).toHaveBeenCalledTimes(1);
    });

    it('ignores a response that arrives after a newer request was started', async () => {
        const resolvers: Array<(value: PagedResponse<GalleryVO>) => void> = [];
        const findGalleries = jest.fn<EmbedDataProviders['findGalleries']>()
                .mockImplementation(() => new Promise((resolve) => {
                    resolvers.push(resolve);
                }));

        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
                {providerOverrides: {findGalleries}},
        );
        await waitFor(() => expect(findGalleries).toHaveBeenCalledTimes(1));

        // The Spin overlay blocks pointer input while loading, so drive the search input directly
        fireEvent.change(screen.getByRole('combobox'), {target: {value: 'w'}});
        await waitFor(() => expect(findGalleries).toHaveBeenCalledTimes(2));
        expect(findGalleries).toHaveBeenLastCalledWith(expect.objectContaining({search: 'w'}));

        // The stale first response must be dropped, the newer one applied
        await act(async () => {
            resolvers[0]({content: [{id: 1, short_name: 'Stale'}], page: 0, total_pages: 1});
        });
        await act(async () => {
            resolvers[1]({content: [{id: 2, short_name: 'Fresh'}], page: 0, total_pages: 1});
        });

        await userEvent.click(screen.getByRole('combobox'));
        expect(await screen.findByTitle('Fresh')).toBeInTheDocument();
        expect(screen.queryByTitle('Stale')).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    });
});
