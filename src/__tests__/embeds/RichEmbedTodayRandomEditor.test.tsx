import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen} from '@testing-library/react';
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
});
