/**
 * Tests for RichEmbedYoutubeEditor – covers URL validation, initial value,
 * confirmation, and cancellation.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedYoutubeEditor} from '../../embeds/RichEmbedYoutubeEditor';
import {renderWithProviders} from '../../test-utils/renderWithProviders';

describe('RichEmbedYoutubeEditor', () => {
    it('renders the modal title when open', () => {
        renderWithProviders(
                <RichEmbedYoutubeEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByText('Insert YouTube Embed')).toBeInTheDocument();
    });

    it('does not render when open=false', () => {
        renderWithProviders(
                <RichEmbedYoutubeEditor open={false} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.queryByText('Insert YouTube Embed')).not.toBeInTheDocument();
    });

    it('pre-populates the URL input with initialUrl', () => {
        const url = 'https://www.youtube.com/watch?v=init123';
        renderWithProviders(
                <RichEmbedYoutubeEditor open={true} initialUrl={url} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByDisplayValue(url)).toBeInTheDocument();
    });

    it('calls onConfirm with trimmed URL for a valid youtube.com URL', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedYoutubeEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText(/youtube\.com/i);
        await userEvent.clear(input);
        await userEvent.type(input, 'https://www.youtube.com/watch?v=abc123');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc123'));
    });

    it('calls onConfirm for a valid youtu.be short URL', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedYoutubeEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText(/youtube\.com/i);
        await userEvent.clear(input);
        await userEvent.type(input, 'https://youtu.be/XYZ');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('https://youtu.be/XYZ'));
    });

    it('calls onConfirm for subdomain www.youtube.com URL', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedYoutubeEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText(/youtube\.com/i);
        await userEvent.clear(input);
        await userEvent.type(input, 'https://www.youtube.com/embed/VIDEO_ID');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    });

    it('shows validation error for non-YouTube URL', async () => {
        renderWithProviders(
                <RichEmbedYoutubeEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText(/youtube\.com/i);
        await userEvent.clear(input);
        await userEvent.type(input, 'https://www.vimeo.com/video123');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Please enter a valid YouTube URL')).toBeInTheDocument();
    });

    it('shows validation error for empty URL', async () => {
        renderWithProviders(
                <RichEmbedYoutubeEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText(/youtube\.com/i);
        await userEvent.clear(input);
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Please enter a YouTube URL')).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedYoutubeEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('resets to new initialUrl when reopened', async () => {
        const {rerender} = renderWithProviders(
                <RichEmbedYoutubeEditor
                        open={false}
                        initialUrl="https://www.youtube.com/watch?v=old"
                        onConfirm={jest.fn()}
                        onCancel={jest.fn()}
                />,
        );
        rerender(
                <RichEmbedYoutubeEditor
                        open={true}
                        initialUrl="https://www.youtube.com/watch?v=new"
                        onConfirm={jest.fn()}
                        onCancel={jest.fn()}
                />,
        );
        expect(screen.getByDisplayValue('https://www.youtube.com/watch?v=new')).toBeInTheDocument();
    });
});

