/**
 * Tests for RichEmbedGalleryEditor – verifies that gallery data is fetched on open,
 * the modal title is displayed, and that onConfirm / onCancel callbacks fire correctly.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {getNextGalleryPage, handleGalleryPopupScroll, requestNextGalleryPage, RichEmbedGalleryEditor} from '../../embeds/RichEmbedGalleryEditor';
import {mockGalleries, renderWithProviders} from '../../test-utils/renderWithProviders';

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
});
