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

    it('confirms the defaults without a style when no options are given', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedWordCloudEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );

        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
        const options = onConfirm.mock.calls[0][0] as Record<string, unknown>;
        expect(options).toEqual({
            width: 800,
            height: 500,
            shape: 'circle',
            padding: 1,
            spiral: 'rectangular',
            fontSize: [14, 56],
            layout: {fontSize: [14, 56], spiral: 'rectangular', padding: 1, size: [800, 500]},
        });
        expect(options).not.toHaveProperty('style');
    });

    it('carries unmanaged root and layout keys over to the confirmed options and drops data', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedWordCloudEditor
                        open={true}
                        initialOptions={{
                            width: 640,
                            height: 360,
                            data: [{text: 'injected'}],
                            customRoot: 'keep',
                            layout: {fontSize: [12, 48], spiral: 'archimedean', padding: 2, customLayout: true},
                        }}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );

        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
            customRoot: 'keep',
            layout: expect.objectContaining({customLayout: true, size: [640, 360]}),
        })));
        expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('data');
    });

    it('applies the optional text, color, font, mask, rotate, random and time interval fields', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedWordCloudEditor
                        open={true}
                        initialOptions={{
                            width: 100,
                            height: 50,
                            textField: ' word ',
                            colorField: ' category ',
                            layout: {
                                fontSize: [10, 20],
                                spiral: 'rectangular',
                                padding: 0,
                                font: ' Impact ',
                                imageMask: ' https://example.com/mask.png ',
                                rotate: 45,
                                random: 7,
                                timeInterval: 100,
                            },
                        }}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );

        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
            textField: 'word',
            colorField: 'category',
            layout: expect.objectContaining({
                font: 'Impact',
                imageMask: 'https://example.com/mask.png',
                rotate: 45,
                random: 7,
                timeInterval: 100,
                padding: 0,
            }),
        })));
    });

    it('rejects a maximum font size below the minimum', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedWordCloudEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );

        fireEvent.change(screen.getByLabelText('Maximum font size'), {target: {value: '5'}});
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Maximum font size must be greater than or equal to minimum font size')).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('rejects a style JSON that is not an object', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedWordCloudEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );

        fireEvent.change(screen.getByLabelText('Style JSON'), {target: {value: '[1, 2]'}});
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Style must be a JSON object')).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedWordCloudEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
