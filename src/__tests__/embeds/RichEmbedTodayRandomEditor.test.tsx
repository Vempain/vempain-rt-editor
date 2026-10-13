import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedTodayRandomEditor} from '../../embeds';
import {renderWithProviders} from '../../test-utils/renderWithProviders';

describe('RichEmbedTodayRandomEditor', () => {
    it('renders modal title when open', () => {
        renderWithProviders(
                <RichEmbedTodayRandomEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByText('Insert Today Random Embed')).toBeInTheDocument();
    });

    it('rejects options that include injected data fields', async () => {
        renderWithProviders(
                <RichEmbedTodayRandomEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );

        const input = screen.getByLabelText('Today random options JSON');
        fireEvent.change(input, {target: {value: '{"title":"On this day","images":[]}'}});
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Do not include images or pages in options')).toBeInTheDocument();
    });

    it('confirms the parsed options object', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedTodayRandomEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );

        const input = screen.getByLabelText('Today random options JSON');
        fireEvent.change(input, {target: {value: '{"title":"Custom","count":2}'}});
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({title: 'Custom', count: 2}));
    });

    it('strips injected images and pages from the initial options shown in the editor', () => {
        renderWithProviders(
                <RichEmbedTodayRandomEditor
                        open={true}
                        initialOptions={{title: 'Keep', images: [1], pages: [2]}}
                        onConfirm={jest.fn()}
                        onCancel={jest.fn()}
                />,
        );

        const input = screen.getByLabelText('Today random options JSON') as HTMLTextAreaElement;
        expect(JSON.parse(input.value)).toEqual({title: 'Keep'});
    });

    it('rejects options that are a JSON array', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedTodayRandomEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );

        fireEvent.change(screen.getByLabelText('Today random options JSON'), {target: {value: '[1]'}});
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Options must be a JSON object')).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('rejects invalid JSON', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedTodayRandomEditor open={true} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );

        fireEvent.change(screen.getByLabelText('Today random options JSON'), {target: {value: 'not json'}});
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Invalid JSON')).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedTodayRandomEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
