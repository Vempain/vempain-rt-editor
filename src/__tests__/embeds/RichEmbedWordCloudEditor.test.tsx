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

    it('calls onConfirm with structured options', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedWordCloudEditor
                        open={true}
                        initialOptions={{
                            width: 640,
                            height: 360,
                            shape: 'diamond',
                            layout: {fontSize: [12, 48], spiral: 'archimedean', padding: 2},
                            style: {fill: '#1677ff'},
                        }}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );

        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
                width: 640,
                height: 360,
                shape: 'diamond',
                fontSize: [12, 48],
                spiral: 'archimedean',
                padding: 2,
                layout: expect.objectContaining({
                    fontSize: [12, 48],
                    spiral: 'archimedean',
                    padding: 2,
                    size: [640, 360],
                }),
                style: {fill: '#1677ff'},
            }));
        });
    });

    it('rejects invalid style JSON', async () => {
        renderWithProviders(
                <RichEmbedWordCloudEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );

        const input = screen.getByLabelText('Style JSON');
        fireEvent.change(input, {target: {value: 'not-json'}});
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Invalid JSON')).toBeInTheDocument();
    });
});
