/**
 * Tests for RichEmbedCarouselEditor – covers item management, autoplay/dotDuration/speed
 * settings, initial value pre-population, confirmation and cancellation.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichEmbedCarouselEditor} from '../../embeds';
import {renderWithProviders} from '../../test-utils/renderWithProviders';
import type {CollapseCarouselItem} from '../../tools/embedTools';

describe('RichEmbedCarouselEditor', () => {
    it('renders modal title "Insert Carousel Embed" when open', () => {
        renderWithProviders(
                <RichEmbedCarouselEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByText('Insert Carousel Embed')).toBeInTheDocument();
    });

    it('does not render when open=false', () => {
        renderWithProviders(
                <RichEmbedCarouselEditor open={false} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.queryByText('Insert Carousel Embed')).not.toBeInTheDocument();
    });

    it('shows the Autoplay, Dot Duration, and Transition Speed controls', () => {
        renderWithProviders(
                <RichEmbedCarouselEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByText('Autoplay')).toBeInTheDocument();
        expect(screen.getByText('Dot Duration')).toBeInTheDocument();
        expect(screen.getByText('Transition Speed (ms)')).toBeInTheDocument();
    });

    it('pre-fills the speed input from initialSpeed', () => {
        renderWithProviders(
                <RichEmbedCarouselEditor
                        open={true}
                        initialSpeed={750}
                        onConfirm={jest.fn()}
                        onCancel={jest.fn()}
                />,
        );
        expect(screen.getByDisplayValue('750')).toBeInTheDocument();
    });

    it('pre-populates item fields from initialItems', () => {
        const items: CollapseCarouselItem[] = [
            {title: 'Slide 1', body: 'Image 1'},
            {title: 'Slide 2', body: 'Image 2'},
        ];
        renderWithProviders(
                <RichEmbedCarouselEditor open={true} initialItems={items} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getByDisplayValue('Slide 1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Slide 2')).toBeInTheDocument();
    });

    it('adds a new slide when "Add Item" is clicked', async () => {
        renderWithProviders(
                <RichEmbedCarouselEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getAllByPlaceholderText('Title').length).toBe(1);
        await userEvent.click(screen.getByText('Add Item'));
        expect(screen.getAllByPlaceholderText('Title').length).toBe(2);
    });

    it('calls onConfirm with items and default params when OK is clicked', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedCarouselEditor
                        open={true}
                        initialItems={[{title: 'S1', body: 'Img1'}]}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledWith(
                    [{title: 'S1', body: 'Img1'}],
                    false,  // default autoplay
                    false,  // default dotDuration
                    500,    // default speed
            );
        });
    });

    it('calls onConfirm with custom autoplay and speed when changed', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
                <RichEmbedCarouselEditor
                        open={true}
                        initialItems={[{title: 'A', body: 'B'}]}
                        initialAutoplay={true}
                        initialSpeed={800}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        await waitFor(() => {
            const call = (onConfirm as jest.Mock).mock.calls[0] as [CollapseCarouselItem[], boolean, boolean, number];
            expect(call[1]).toBe(true);  // autoplay
            expect(call[3]).toBe(800);   // speed
        });
    });

    it('validates that item title is required', async () => {
        renderWithProviders(
                <RichEmbedCarouselEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const bodyInput = screen.getByPlaceholderText('Body');
        await userEvent.type(bodyInput, 'Some body');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Please enter a title')).toBeInTheDocument();
    });

    it('validates that item body is required', async () => {
        renderWithProviders(
                <RichEmbedCarouselEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        const titleInput = screen.getByPlaceholderText('Title');
        await userEvent.type(titleInput, 'Slide 1');
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(await screen.findByText('Please enter body text')).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedCarouselEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('removes a slide when the minus icon is clicked', async () => {
        const items: CollapseCarouselItem[] = [{title: 'S1', body: 'B1'}, {title: 'S2', body: 'B2'}];
        renderWithProviders(
                <RichEmbedCarouselEditor open={true} initialItems={items} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(screen.getAllByPlaceholderText('Title').length).toBe(2);
        const deleteIcons = document.querySelectorAll('[aria-label="minus-circle"]');
        await userEvent.click(deleteIcons[0]);
        expect(screen.getAllByPlaceholderText('Title').length).toBe(1);
    });
});

