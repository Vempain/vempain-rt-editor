/**
 * Tests for RichTextEditor – covers read-only vs editable mode, initial value
 * rendering, source/WYSIWYG toggle, onChange propagation, and embed button
 * presence.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichTextEditor} from '../RichTextEditor';
import {renderWithProviders} from '../test-utils/renderWithProviders';

describe('RichTextEditor', () => {
    // -----------------------------------------------------------------------
    // Read-only mode
    // -----------------------------------------------------------------------
    describe('readOnly mode', () => {
        it('renders without a toolbar when readOnly=true', () => {
            renderWithProviders(<RichTextEditor readOnly={true} value="<p>Hello</p>"/>);
            // Embed buttons exist only in the toolbar
            expect(screen.queryByText('Gallery')).not.toBeInTheDocument();
            expect(screen.queryByText('HTML')).not.toBeInTheDocument();
        });

        it('renders a non-contenteditable div when readOnly=true', () => {
            renderWithProviders(<RichTextEditor readOnly={true} value="<p>Read-only content</p>"/>);
            const divs = document.querySelectorAll('[contenteditable]');
            divs.forEach(d => {
                expect(d.getAttribute('contenteditable')).toBe('false');
            });
        });

        it('displays the initial HTML value', () => {
            const {container} = renderWithProviders(
                    <RichTextEditor readOnly={true} value="<p>Hello world</p>"/>,
            );
            expect(container.querySelector('p')?.textContent).toBe('Hello world');
        });
    });

    // -----------------------------------------------------------------------
    // Editable mode – toolbar presence
    // -----------------------------------------------------------------------
    describe('editable mode toolbar', () => {
        it('renders the toolbar with formatting buttons', () => {
            renderWithProviders(<RichTextEditor value=""/>);
            // Bold icon renders as a button
            expect(screen.getByRole('button', {name: /bold/i})).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /italic/i})).toBeInTheDocument();
        });

        it('renders all embed insertion buttons', () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const embedButtons = ['Gallery', 'YouTube', 'Music', 'GPS', 'Last', 'Cloud', 'Today', 'Collapse'];
            for (const label of embedButtons) {
                expect(screen.getByRole('button', {name: new RegExp(label, 'i')})).toBeInTheDocument();
            }
        });

        it('renders the HTML source mode toggle button', () => {
            renderWithProviders(<RichTextEditor value=""/>);
            expect(screen.getByRole('button', {name: /html/i})).toBeInTheDocument();
        });

        it('renders an ordered list button', () => {
            renderWithProviders(<RichTextEditor value=""/>);
            // The antd icon aria-label is "ordered-list"
            expect(screen.getByRole('button', {name: 'ordered-list'})).toBeInTheDocument();
        });

        it('renders an unordered list button', () => {
            renderWithProviders(<RichTextEditor value=""/>);
            expect(screen.getByRole('button', {name: 'unordered-list'})).toBeInTheDocument();
        });

        it('renders a link button', () => {
            renderWithProviders(<RichTextEditor value=""/>);
            // The link icon has aria-label="link"
            expect(screen.getByRole('button', {name: 'link'})).toBeInTheDocument();
        });

        it('renders a table button', () => {
            renderWithProviders(<RichTextEditor value=""/>);
            expect(screen.getByRole('button', {name: 'table'})).toBeInTheDocument();
        });
    });

    // -----------------------------------------------------------------------
    // Source mode toggle
    // -----------------------------------------------------------------------
    describe('source mode toggle', () => {
        it('switches to source mode when HTML button is clicked', async () => {
            renderWithProviders(<RichTextEditor value="<p>Content</p>"/>);
            const htmlBtn = screen.getByRole('button', {name: /html/i});
            await userEvent.click(htmlBtn);
            // In source mode a textarea is shown
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('shows the current HTML in the source textarea', async () => {
            renderWithProviders(<RichTextEditor value="<p>Source content</p>"/>);
            const htmlBtn = screen.getByRole('button', {name: /html/i});
            await userEvent.click(htmlBtn);
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            expect(textarea.value).toBe('<p>Source content</p>');
        });

        it('shows WYSIWYG button label in source mode', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            await userEvent.click(screen.getByRole('button', {name: /html/i}));
            expect(screen.getByRole('button', {name: /wysiwyg/i})).toBeInTheDocument();
        });

        it('switches back to WYSIWYG mode after clicking WYSIWYG button', async () => {
            renderWithProviders(<RichTextEditor value="<p>Hi</p>"/>);
            await userEvent.click(screen.getByRole('button', {name: /html/i}));
            await userEvent.click(screen.getByRole('button', {name: /wysiwyg/i}));
            // Source textarea should be gone
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        it('calls onChange when source textarea content changes', async () => {
            const onChange = jest.fn();
            renderWithProviders(<RichTextEditor value="" onChange={onChange}/>);
            await userEvent.click(screen.getByRole('button', {name: /html/i}));
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            await userEvent.clear(textarea);
            await userEvent.type(textarea, '<p>New content</p>');
            await waitFor(() => expect(onChange).toHaveBeenCalled());
        });
    });

    // -----------------------------------------------------------------------
    // External value sync
    // -----------------------------------------------------------------------
    describe('external value sync', () => {
        it('updates source textarea when value prop changes externally', async () => {
            const {rerender} = renderWithProviders(<RichTextEditor value="<p>Old</p>"/>);
            // Switch to source mode to read the textarea
            await userEvent.click(screen.getByRole('button', {name: /html/i}));
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            expect(textarea.value).toBe('<p>Old</p>');

            rerender(<RichTextEditor value="<p>New</p>"/>);
            await waitFor(() => expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('<p>New</p>'));
        });
    });

    // -----------------------------------------------------------------------
    // Embed dialog opening
    // -----------------------------------------------------------------------
    describe('embed dialogs', () => {
        it('opens the Gallery dialog when Gallery button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const galleryBtn = screen.getByRole('button', {name: /gallery/i});
            fireEvent.mouseDown(galleryBtn);
            expect(await screen.findByText('Insert Gallery Embed')).toBeInTheDocument();
        });

        it('opens the YouTube dialog when YouTube button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const youtubeBtn = screen.getByRole('button', {name: /youtube/i});
            fireEvent.mouseDown(youtubeBtn);
            expect(await screen.findByText('Insert YouTube Embed')).toBeInTheDocument();
        });

        it('opens the Music dialog when Music button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const musicBtn = screen.getByRole('button', {name: /music/i});
            fireEvent.mouseDown(musicBtn);
            expect(await screen.findByText('Insert Music Data Embed')).toBeInTheDocument();
        });

        it('opens the GPS time series dialog when GPS button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const gpsBtn = screen.getByRole('button', {name: /gps/i});
            fireEvent.mouseDown(gpsBtn);
            expect(await screen.findByText('Insert GPS Time Series Embed')).toBeInTheDocument();
        });

        it('opens the Last Items dialog when Last button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const lastBtn = screen.getByRole('button', {name: /last/i});
            fireEvent.mouseDown(lastBtn);
            expect(await screen.findByText('Insert Last Items Embed')).toBeInTheDocument();
        });

        it('opens the Word Cloud dialog when Cloud button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const cloudBtn = screen.getByRole('button', {name: /cloud/i});
            fireEvent.mouseDown(cloudBtn);
            expect(await screen.findByText('Insert Word Cloud Embed')).toBeInTheDocument();
        });

        it('opens the Today Random dialog when Today button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const todayBtn = screen.getByRole('button', {name: /today/i});
            fireEvent.mouseDown(todayBtn);
            expect(await screen.findByText('Insert Today Random Embed')).toBeInTheDocument();
        });

        it('opens the Collapse dialog when Collapse button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const collapseBtn = screen.getByRole('button', {name: /collapse/i});
            fireEvent.mouseDown(collapseBtn);
            expect(await screen.findByText('Insert Collapse Embed')).toBeInTheDocument();
        });

        it('opens the Carousel dialog when Carousel button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const carouselBtn = screen.getByRole('button', {name: /carousel/i});
            fireEvent.mouseDown(carouselBtn);
            expect(await screen.findByText('Insert Carousel Embed')).toBeInTheDocument();
        });

        it('opens the Link dialog when Link button is mousedown-clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            const linkBtn = screen.getByRole('button', {name: 'link'});
            fireEvent.mouseDown(linkBtn);
            expect(await screen.findByText('Insert Link')).toBeInTheDocument();
        });

        it('closes embed dialogs when Cancel is clicked', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            fireEvent.mouseDown(screen.getByRole('button', {name: /youtube/i}));
            expect(await screen.findByText('Insert YouTube Embed')).toBeInTheDocument();
            await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
            await waitFor(() =>
                    expect(screen.queryByText('Insert YouTube Embed')).not.toBeInTheDocument()
            );
        });
    });

    // -----------------------------------------------------------------------
    // Placeholder click (click-to-edit)
    // -----------------------------------------------------------------------
    describe('placeholder click-to-edit', () => {
        it('opens the YouTube editor when a youtube placeholder is clicked', async () => {
            const value = '<!--vps:embed:youtube:https://www.youtube.com/watch?v=TEST-->';
            renderWithProviders(<RichTextEditor value={value}/>);
            // The placeholder span should appear in the WYSIWYG editor
            const placeholder = await screen.findByText(/youtube:/i);
            await userEvent.click(placeholder);
            expect(await screen.findByText('Insert YouTube Embed')).toBeInTheDocument();
        });

        it('opens the Last editor when a last placeholder is clicked', async () => {
            const value = '<!--vps:embed:last:pages:3-->';
            renderWithProviders(<RichTextEditor value={value}/>);
            const placeholder = await screen.findByText(/last 3 pages/i);
            await userEvent.click(placeholder);
            expect(await screen.findByText('Insert Last Items Embed')).toBeInTheDocument();
        });

        it('opens the Gallery editor when a gallery placeholder is clicked', async () => {
            const value = '<!--vps:embed:gallery:1-->';
            renderWithProviders(<RichTextEditor value={value}/>);
            const placeholder = await screen.findByText(/gallery:1/i);
            await userEvent.click(placeholder);
            expect(await screen.findByText('Insert Gallery Embed')).toBeInTheDocument();
        });

        it('opens the Word Cloud editor when a word_cloud placeholder is clicked', async () => {
            const value = '<!--vps:embed:word_cloud:{"shape":"circle"}-->';
            renderWithProviders(<RichTextEditor value={value}/>);
            const placeholder = await screen.findByText(/word cloud/i);
            await userEvent.click(placeholder);
            expect(await screen.findByText('Insert Word Cloud Embed')).toBeInTheDocument();
        });

        it('opens the Today Random editor when a today_random placeholder is clicked', async () => {
            const value = '<!--vps:embed:today_random:{"title":"On this day"}-->';
            renderWithProviders(<RichTextEditor value={value}/>);
            const placeholder = await screen.findByText(/today random/i);
            await userEvent.click(placeholder);
            expect(await screen.findByText('Insert Today Random Embed')).toBeInTheDocument();
        });
    });

    // -----------------------------------------------------------------------
    // Link insertion (safe URL handling)
    // -----------------------------------------------------------------------
    describe('link insertion', () => {
        it('renders the link URL field in the Insert Link dialog', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            fireEvent.mouseDown(screen.getByRole('button', {name: 'link'}));
            expect(await screen.findByPlaceholderText('https://example.com')).toBeInTheDocument();
        });

        it('renders the link text field in the Insert Link dialog', async () => {
            renderWithProviders(<RichTextEditor value=""/>);
            fireEvent.mouseDown(screen.getByRole('button', {name: 'link'}));
            expect(await screen.findByPlaceholderText('Link text')).toBeInTheDocument();
        });
    });
});
