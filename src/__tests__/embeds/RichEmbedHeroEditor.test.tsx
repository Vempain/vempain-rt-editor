/**
 * Tests for RichEmbedHeroEditor – covers the image/video/carousel type switch,
 * the carousel duration and transition controls and the confirmed values.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedHeroEditor} from '../../embeds/RichEmbedHeroEditor';
import {renderWithProviders} from '../../test-utils/renderWithProviders';
import {FileTypeEnum} from '../../types';

describe('RichEmbedHeroEditor', () => {
    it('shows the hero image selector by default', async () => {
        const {providers} = renderWithProviders(
                <RichEmbedHeroEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(await screen.findByText('Insert Hero Image Embed')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search by image file name...')).toBeInTheDocument();
        await waitFor(() => {
            const calls = (providers.getPagedSiteFiles as jest.Mock).mock.calls as [Record<string, unknown>][];
            expect(calls[0][0].file_type).toBe(FileTypeEnum.IMAGE);
        });
        expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('switches to the video selector and confirms with the video type', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(<RichEmbedHeroEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>);

        await userEvent.click(screen.getByRole('radio', {name: 'Video'}));
        expect(await screen.findByText('Insert Hero Video Embed')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search by video file name...')).toBeInTheDocument();

        await userEvent.click(await screen.findByText('video-01.mp4'));
        await userEvent.click(screen.getByRole('button', {name: 'OK'}));
        expect(onConfirm).toHaveBeenCalledWith(12, 'video', 5, 'slide');
    });

    it('shows the gallery selector with duration and transition controls for the carousel type', async () => {
        renderWithProviders(<RichEmbedHeroEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>);

        await userEvent.click(screen.getByRole('radio', {name: 'Carousel'}));
        expect(await screen.findByText('Insert Gallery Embed')).toBeInTheDocument();
        expect(screen.getByRole('spinbutton')).toHaveValue('5');
        expect(screen.getByText('Slide transition')).toBeInTheDocument();
    });

    it('confirms a carousel hero with the chosen gallery, duration and transition', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedHeroEditor
                        open={true}
                        initialType="carousel"
                        initialId={2}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        fireEvent.change(screen.getByRole('spinbutton'), {target: {value: '8'}});

        const [transitionSelect] = screen.getAllByRole('combobox');
        await userEvent.click(transitionSelect);
        await userEvent.click(await screen.findByText('Fade transition'));

        await userEvent.click(screen.getByRole('button', {name: 'OK'}));
        expect(onConfirm).toHaveBeenCalledWith(2, 'carousel', 8, 'fade');
    });

    it('keeps the previous duration when the duration input is cleared', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedHeroEditor
                        open={true}
                        initialType="carousel"
                        initialId={1}
                        initialDuration={7}
                        initialTransition="fade"
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        expect(screen.getByRole('spinbutton')).toHaveValue('7');

        fireEvent.change(screen.getByRole('spinbutton'), {target: {value: ''}});
        await userEvent.click(screen.getByRole('button', {name: 'OK'}));
        expect(onConfirm).toHaveBeenCalledWith(1, 'carousel', 7, 'fade');
    });

    it('resets the type, duration and transition from the props when reopened', async () => {
        const {rerender} = renderWithProviders(
                <RichEmbedHeroEditor open={false} initialType="video" onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        rerender(
                <RichEmbedHeroEditor
                        open={true}
                        initialType="carousel"
                        initialDuration={3}
                        initialTransition="fade"
                        onConfirm={jest.fn()}
                        onCancel={jest.fn()}
                />,
        );
        expect(await screen.findByText('Insert Gallery Embed')).toBeInTheDocument();
        expect(screen.getByRole('spinbutton')).toHaveValue('3');
        expect(screen.getByText('Fade transition')).toBeInTheDocument();
    });

    it('calls onCancel from the carousel selector', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedHeroEditor open={true} initialType="carousel" onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(await screen.findByText('Cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
