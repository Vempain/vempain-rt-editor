/**
 * Tests for RichEmbedCollapseEditor – covers item management (add/remove),
 * initial item pre-population, validation, confirmation and cancellation.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedCollapseEditor} from '../../embeds/RichEmbedCollapseEditor';
import {renderWithProviders} from '../../test-utils/renderWithProviders';
import type {CollapseCarouselItem} from '../../tools/embedTools';

describe('RichEmbedCollapseEditor', () => {
    it('renders modal title "Insert Collapse Embed" when open', () => {
        renderWithProviders(
                <RichEmbedCollapseEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByText('Insert Collapse Embed')).toBeInTheDocument();
    });

    it('does not render when open=false', () => {
        renderWithProviders(
                <RichEmbedCollapseEditor open={false} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.queryByText('Insert Collapse Embed')).not.toBeInTheDocument();
    });

    it('shows one empty item row by default', () => {
        renderWithProviders(
                <RichEmbedCollapseEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getAllByPlaceholderText('Title').length).toBe(1);
        expect(screen.getAllByPlaceholderText('Body').length).toBe(1);
    });

    it('pre-populates fields from initialItems', () => {
        const items: CollapseCarouselItem[] = [
            {title: 'Q1', body: 'A1'},
            {title: 'Q2', body: 'A2'},
        ];
        renderWithProviders(
                <RichEmbedCollapseEditor open={true} initialItems={items} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByDisplayValue('Q1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('A1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Q2')).toBeInTheDocument();
        expect(screen.getByDisplayValue('A2')).toBeInTheDocument();
    });

    it('adds a new item row when "Add Item" is clicked', async () => {
        renderWithProviders(
                <RichEmbedCollapseEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getAllByPlaceholderText('Title').length).toBe(1);
        await userEvent.click(screen.getByText('Add Item'));
        expect(screen.getAllByPlaceholderText('Title').length).toBe(2);
    });

    it('removes an item row when the minus icon is clicked', async () => {
        const items: CollapseCarouselItem[] = [
            {title: 'Q1', body: 'A1'},
            {title: 'Q2', body: 'A2'},
        ];
        renderWithProviders(
                <RichEmbedCollapseEditor open={true} initialItems={items} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getAllByPlaceholderText('Title').length).toBe(2);
        // Click the first delete icon
        const deleteIcons = document.querySelectorAll('[aria-label="minus-circle"]');
        await userEvent.click(deleteIcons[0]);
        expect(screen.getAllByPlaceholderText('Title').length).toBe(1);
    });

    it('calls onConfirm with the filled items when OK is clicked', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedCollapseEditor
                        open={true}
                        initialItems={[{title: 'FAQ 1', body: 'Answer 1'}]}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledWith([{title: 'FAQ 1', body: 'Answer 1'}]);
        });
    });

    it('shows validation error when title is empty', async () => {
        renderWithProviders(
                <RichEmbedCollapseEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        // Leave title empty, fill only body
        const bodyInput = screen.getByPlaceholderText('Body');
        await userEvent.type(bodyInput, 'Some body');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Please enter a title')).toBeInTheDocument();
    });

    it('shows validation error when body is empty', async () => {
        renderWithProviders(
                <RichEmbedCollapseEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const titleInput = screen.getByPlaceholderText('Title');
        await userEvent.type(titleInput, 'Some title');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Please enter body text')).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedCollapseEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});

