/**
 * Tests for RichEmbedMusicEditor – covers identifier validation,
 * initial value pre-population, confirmation and cancellation.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedMusicEditor} from '../../embeds/RichEmbedMusicEditor';
import {renderWithProviders} from '../../test-utils/renderWithProviders';

describe('RichEmbedMusicEditor', () => {
    it('renders modal title "Insert Music Data Embed" when open', () => {
        renderWithProviders(
                <RichEmbedMusicEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByText('Insert Music Data Embed')).toBeInTheDocument();
    });

    it('does not render when open=false', () => {
        renderWithProviders(
                <RichEmbedMusicEditor open={false} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.queryByText('Insert Music Data Embed')).not.toBeInTheDocument();
    });

    it('pre-populates the identifier with initialIdentifier', () => {
        renderWithProviders(
                <RichEmbedMusicEditor
                        open={true}
                        initialIdentifier="custom_library"
                        onConfirm={jest.fn()}
                        onCancel={jest.fn()}
                />,
        );
        expect(screen.getByDisplayValue('custom_library')).toBeInTheDocument();
    });

    it('defaults to "music_library" when no initialIdentifier is provided', () => {
        renderWithProviders(
                <RichEmbedMusicEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByDisplayValue('music_library')).toBeInTheDocument();
    });

    it('calls onConfirm with the valid identifier when OK is clicked', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedMusicEditor
                        open={true}
                        initialIdentifier="my_dataset"
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('my_dataset'));
    });

    it('rejects identifiers that start with a digit', async () => {
        renderWithProviders(
                <RichEmbedMusicEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText('music_library');
        await userEvent.clear(input);
        await userEvent.type(input, '1invalid');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(
                await screen.findByText(/must start with a lowercase letter/i),
        ).toBeInTheDocument();
    });

    it('rejects identifiers containing uppercase letters', async () => {
        renderWithProviders(
                <RichEmbedMusicEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText('music_library');
        await userEvent.clear(input);
        await userEvent.type(input, 'BadName');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(
                await screen.findByText(/must start with a lowercase letter/i),
        ).toBeInTheDocument();
    });

    it('rejects identifiers containing hyphens', async () => {
        renderWithProviders(
                <RichEmbedMusicEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText('music_library');
        await userEvent.clear(input);
        await userEvent.type(input, 'bad-name');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(
                await screen.findByText(/must start with a lowercase letter/i),
        ).toBeInTheDocument();
    });

    it('accepts valid snake_case identifiers', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedMusicEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText('music_library');
        await userEvent.clear(input);
        await userEvent.type(input, 'valid_name_123');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('valid_name_123'));
    });

    it('shows required validation error when the field is empty', async () => {
        renderWithProviders(
                <RichEmbedMusicEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const input = screen.getByPlaceholderText('music_library');
        await userEvent.clear(input);
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(
                await screen.findByText('Please enter the music data set identifier'),
        ).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedMusicEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});

