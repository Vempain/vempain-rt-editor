import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedWordCloudEditor} from '../../embeds';
import {renderWithProviders} from '../../test-utils/renderWithProviders';

describe('RichEmbedWordCloudEditor', () => {
    it('renders modal title when open', () => {
        renderWithProviders(
                <RichEmbedWordCloudEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByText('Insert Word Cloud Embed')).toBeInTheDocument();
    });

    it('calls onConfirm with parsed JSON options', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedWordCloudEditor
                        open={true}
                        initialOptions={{shape: 'diamond', fontSize: [12, 48]}}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );

        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledWith({shape: 'diamond', fontSize: [12, 48]});
        });
    });

    it('rejects options that include data', async () => {
        renderWithProviders(
                <RichEmbedWordCloudEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );

        const input = screen.getByLabelText('Word cloud options JSON');
        const invalidOptions = '{"shape":"circle","data":[{"text":"x","value":1}]}';
        fireEvent.change(input, {target: {value: invalidOptions}});
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Do not include data in options')).toBeInTheDocument();
    });
});
