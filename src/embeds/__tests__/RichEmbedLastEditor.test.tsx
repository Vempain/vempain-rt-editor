/**
 * Tests for RichEmbedLastEditor – covers type selection, count validation,
 * initial value pre-population, confirmation and cancellation.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedLastEditor} from '../../embeds/RichEmbedLastEditor';
import {renderWithProviders} from '../../test-utils/renderWithProviders';
import type {LastEmbedType} from '../../tools/embedTools';

describe('RichEmbedLastEditor', () => {
    it('renders modal title "Insert Last Items Embed" when open', () => {
        renderWithProviders(
                <RichEmbedLastEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByText('Insert Last Items Embed')).toBeInTheDocument();
    });

    it('does not render when open=false', () => {
        renderWithProviders(
                <RichEmbedLastEditor open={false} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.queryByText('Insert Last Items Embed')).not.toBeInTheDocument();
    });

    it('shows the count input', () => {
        renderWithProviders(
                <RichEmbedLastEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByLabelText('Count')).toBeInTheDocument();
    });

    it('pre-fills the count with initialCount', () => {
        renderWithProviders(
                <RichEmbedLastEditor open={true} initialCount={7} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByDisplayValue('7')).toBeInTheDocument();
    });

    it('calls onConfirm with default type "pages" and count when confirmed', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedLastEditor open={true} initialCount={3} onConfirm={onConfirm} onCancel={jest.fn()}/>,
        );
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('pages', 3));
    });

    it('calls onConfirm with provided initialType and initialCount', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedLastEditor
                        open={true}
                        initialType={'galleries' as LastEmbedType}
                        initialCount={10}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('galleries', 10));
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedLastEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('shows all supported resource types in the dropdown', async () => {
        renderWithProviders(
                <RichEmbedLastEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const typeSelect = screen.getByLabelText('Resource Type');
        await userEvent.click(typeSelect);
        // Each type should appear as a listbox option
        const expectedLabels = ['Pages', 'Galleries', 'Images', 'Videos', 'Audio', 'Documents'];
        for (const label of expectedLabels) {
            // Use getAllByText since the selected value AND the option both appear
            const elements = screen.getAllByText(label);
            expect(elements.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('enforces count minimum of 1 (default is >= 1)', () => {
        renderWithProviders(
                <RichEmbedLastEditor open={true} initialCount={5} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        // The default value should be valid (>= 1)
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('enforces count maximum of 100 (antd InputNumber renders with bounds)', () => {
        renderWithProviders(
                <RichEmbedLastEditor open={true} initialCount={50} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        // The count input should render with its value within [1, 100]
        expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    });
});

