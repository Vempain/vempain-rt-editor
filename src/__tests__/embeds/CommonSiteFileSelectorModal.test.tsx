/**
 * Tests for CommonSiteFileSelectorModal – exercises data loading, search, selection,
 * pagination load-more trigger, and error handling with the VirtualList mock.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CommonSiteFileSelectorModal} from '../../embeds/CommonSiteFileSelectorModal';
import {mockSiteFiles, renderWithProviders} from '../../test-utils/renderWithProviders';
import type {EmbedDataProviders, PagedResponse, SiteFileResponse} from '../../types';
import {FileTypeEnum} from '../../types';
// ---------------------------------------------------------------------------
// Thin-wrapper embeds that delegate to CommonSiteFileSelectorModal
// ---------------------------------------------------------------------------
import {RichEmbedImageEditor} from '../../embeds/RichEmbedImageEditor';
import {RichEmbedHeroEditor} from '../../embeds/RichEmbedHeroEditor';
import {RichEmbedVideoEditor} from '../../embeds/RichEmbedVideoEditor';
import {RichEmbedAudioEditor} from '../../embeds/RichEmbedAudioEditor';

const defaultProps = {
    open: true,
    title: 'Select Image',
    fileType: FileTypeEnum.IMAGE,
    searchPlaceholder: 'Search images...',
    emptyText: 'No images found',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
};

describe('CommonSiteFileSelectorModal', () => {
    it('renders the modal title when open', async () => {
        renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps}/>);
        expect(await screen.findByText('Select Image')).toBeInTheDocument();
    });

    it('calls getPagedSiteFiles when opened', async () => {
        const {providers} = renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps}/>);
        await waitFor(() => expect(providers.getPagedSiteFiles).toHaveBeenCalledTimes(1));
    });

    it('passes file_type in the paged query', async () => {
        const {providers} = renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps}/>);
        await waitFor(() => {
            const callArgs = (providers.getPagedSiteFiles as jest.MockedFunction<typeof providers.getPagedSiteFiles>).mock.calls[0]?.[0];
            expect(callArgs?.file_type).toBe(FileTypeEnum.IMAGE);
        });
    });

    it('displays loaded file names in the list', async () => {
        renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps}/>);
        for (const file of mockSiteFiles) {
            expect(await screen.findByText(file.file_name)).toBeInTheDocument();
        }
    });

    it('shows the selected label when initialId matches a loaded file', async () => {
        renderWithProviders(
                <CommonSiteFileSelectorModal {...defaultProps} initialId={mockSiteFiles[0].id}/>,
        );
        // Wait for items to load
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        // The "Selected: <filename>" block should show the selected file name
        const selectedBlock = await screen.findByText(/selected:/i);
        expect(selectedBlock.closest('div')?.textContent).toContain(mockSiteFiles[0].file_name);
    });

    it('shows fallback label "#id" when initialId is not in the loaded list', async () => {
        renderWithProviders(
                <CommonSiteFileSelectorModal {...defaultProps} initialId={9999}/>,
        );
        expect(await screen.findByText('#9999')).toBeInTheDocument();
    });

    it('triggers a fresh search when the search input changes', async () => {
        const {providers} = renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps}/>);
        await waitFor(() => expect(providers.getPagedSiteFiles).toHaveBeenCalledTimes(1));

        const searchInput = screen.getByPlaceholderText('Search images...');
        await userEvent.type(searchInput, 'photo');

        // After typing, at least one more call should have been made with filter='photo'
        await waitFor(() => {
            const calls = (providers.getPagedSiteFiles as jest.Mock).mock.calls as [Record<string, unknown>][];
            expect(calls.length).toBeGreaterThan(1);
            const lastCall = calls[calls.length - 1][0];
            expect(lastCall.search).toBe('photo');
        });
    });

    it('shows emptyText when no files are returned', async () => {
        const emptyResponse: PagedResponse<SiteFileResponse> = {content: [], page: 0, total_pages: 0};
        renderWithProviders(
                <CommonSiteFileSelectorModal {...defaultProps}/>,
                {providerOverrides: {getPagedSiteFiles: jest.fn().mockResolvedValue(emptyResponse)}},
        );
        expect(await screen.findByText('No images found')).toBeInTheDocument();
    });

    it('shows an error alert when getPagedSiteFiles rejects', async () => {
        renderWithProviders(
                <CommonSiteFileSelectorModal {...defaultProps}/>,
                {
                    providerOverrides: {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        getPagedSiteFiles: jest.fn<any>().mockRejectedValue(new Error('fail')),
                    }
                },
        );
        expect(await screen.findByText('Failed to load site files. Please try again.')).toBeInTheDocument();
    });

    it('OK button is disabled when no item is selected', async () => {
        renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps}/>);
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        expect(screen.getByRole('button', {name: /ok/i})).toBeDisabled();
    });

    it('selects an item when clicked in the list', async () => {
        renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps}/>);
        const item = await screen.findByText(mockSiteFiles[1].file_name);
        await userEvent.click(item);
        // After selection the OK button should be enabled
        await waitFor(() => expect(screen.getByRole('button', {name: /ok/i})).not.toBeDisabled());
    });

    it('calls onConfirm with the selected id when OK is clicked', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <CommonSiteFileSelectorModal {...defaultProps} onConfirm={onConfirm}/>,
        );
        const item = await screen.findByText(mockSiteFiles[0].file_name);
        fireEvent.click(item);
        await waitFor(() => expect(screen.getByRole('button', {name: /ok/i})).not.toBeDisabled());
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(onConfirm).toHaveBeenCalledWith(mockSiteFiles[0].id);
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps} onCancel={onCancel}/>);
        await userEvent.click(await screen.findByText('Cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not render modal content when open=false', () => {
        renderWithProviders(<CommonSiteFileSelectorModal {...defaultProps} open={false}/>);
        expect(screen.queryByText('Select Image')).not.toBeInTheDocument();
    });

    it('loads next page when virtual list scroll reaches bottom and more pages exist', async () => {
        const page0: PagedResponse<SiteFileResponse> = {
            content: [{id: 1, file_name: 'file1.jpg'}],
            page: 0,
            total_pages: 2,
        };
        const page1: PagedResponse<SiteFileResponse> = {
            content: [{id: 2, file_name: 'file2.jpg'}],
            page: 1,
            total_pages: 2,
        };
        const getPagedSiteFiles = jest.fn<EmbedDataProviders['getPagedSiteFiles']>()
                .mockResolvedValueOnce(page0)
                .mockResolvedValueOnce(page1);

        const {providers} = renderWithProviders(
                <CommonSiteFileSelectorModal {...defaultProps}/>,
                {providerOverrides: {getPagedSiteFiles}},
        );
        await waitFor(() => expect(screen.getByText('file1.jpg')).toBeInTheDocument());

        // Simulate scrolling to the bottom of the virtual list
        const listContainer = screen.getByTestId('virtual-list');
        Object.defineProperty(listContainer, 'scrollTop', {value: 300, writable: true});
        Object.defineProperty(listContainer, 'clientHeight', {value: 320, writable: true});
        Object.defineProperty(listContainer, 'scrollHeight', {value: 600, writable: true});

        fireEvent.scroll(listContainer);

        await waitFor(() => expect(providers.getPagedSiteFiles).toHaveBeenCalledTimes(2));
        expect(await screen.findByText('file2.jpg')).toBeInTheDocument();
    });
});

describe('RichEmbedImageEditor', () => {
    it('shows "Insert Image Embed" title', async () => {
        renderWithProviders(<RichEmbedImageEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>);
        expect(await screen.findByText('Insert Image Embed')).toBeInTheDocument();
    });

    it('queries with IMAGE file type', async () => {
        const {providers} = renderWithProviders(
                <RichEmbedImageEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        await waitFor(() => {
            const calls = (providers.getPagedSiteFiles as jest.Mock).mock.calls as [Record<string, unknown>][];
            expect(calls[0][0].file_type).toBe(FileTypeEnum.IMAGE);
        });
    });
});

describe('RichEmbedHeroEditor', () => {
    it('shows "Insert Hero Image Embed" title', async () => {
        renderWithProviders(<RichEmbedHeroEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>);
        expect(await screen.findByText('Insert Hero Image Embed')).toBeInTheDocument();
    });

    it('offers image, video, and carousel choices and queries videos when selected', async () => {
        const {providers} = renderWithProviders(
                <RichEmbedHeroEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        await userEvent.click(screen.getByRole('radio', {name: 'Video'}));
        await waitFor(() => {
            const calls = (providers.getPagedSiteFiles as jest.Mock).mock.calls as [Record<string, unknown>][];
            expect(calls.at(-1)?.[0].file_type).toBe(FileTypeEnum.VIDEO);
        });
        expect(screen.getByRole('radio', {name: 'Carousel'})).toBeInTheDocument();
    });

    it('confirms the selected image with its hero type', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(<RichEmbedHeroEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>);
        await userEvent.click(await screen.findByText('photo-01.jpg'));
        await userEvent.click(screen.getByRole('button', {name: 'OK'}));
        expect(onConfirm).toHaveBeenCalledWith(10, 'image');
    });
});

describe('RichEmbedVideoEditor', () => {
    it('shows "Insert Video Embed" title', async () => {
        renderWithProviders(<RichEmbedVideoEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>);
        expect(await screen.findByText('Insert Video Embed')).toBeInTheDocument();
    });

    it('queries with VIDEO file type', async () => {
        const {providers} = renderWithProviders(
                <RichEmbedVideoEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        await waitFor(() => {
            const calls = (providers.getPagedSiteFiles as jest.Mock).mock.calls as [Record<string, unknown>][];
            expect(calls[0][0].file_type).toBe(FileTypeEnum.VIDEO);
        });
    });
});

describe('RichEmbedAudioEditor', () => {
    it('shows "Insert Audio Embed" title', async () => {
        renderWithProviders(<RichEmbedAudioEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>);
        expect(await screen.findByText('Insert Audio Embed')).toBeInTheDocument();
    });

    it('queries with AUDIO file type', async () => {
        const {providers} = renderWithProviders(
                <RichEmbedAudioEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        await waitFor(() => {
            const calls = (providers.getPagedSiteFiles as jest.Mock).mock.calls as [Record<string, unknown>][];
            expect(calls[0][0].file_type).toBe(FileTypeEnum.AUDIO);
        });
    });
});

