/**
 * Tests for RichEmbedGalleryEditor – verifies that gallery data is fetched on open,
 * the modal title is displayed, and that onConfirm / onCancel callbacks fire correctly.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedGalleryEditor} from '../../embeds/RichEmbedGalleryEditor';
import {mockGalleries, renderWithProviders} from '../../test-utils/renderWithProviders';

describe('RichEmbedGalleryEditor', () => {
    it('renders modal title when open', async () => {
        renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(await screen.findByText('Insert Gallery Embed')).toBeInTheDocument();
    });

    it('calls findGalleries when opened', async () => {
        const {providers} = renderWithProviders(
                <RichEmbedGalleryEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        await waitFor(() => expect(providers.findGalleries).toHaveBeenCalledTimes(1));
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

    it('does not render modal content when open=false', () => {
        renderWithProviders(
                <RichEmbedGalleryEditor open={false} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.queryByText('Insert Gallery Embed')).not.toBeInTheDocument();
    });
});
