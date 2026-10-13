/**
 * Tests for the embed flows of RichTextEditor – inserting every embed type from
 * the toolbar, editing existing placeholders by clicking them, the selection
 * save/restore around the dialogs and the embed reporting to the host.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RichTextEditor} from '../RichTextEditor';
import {parseEmbeds} from '../tools/embedTools';
import {buildDefaultProviders, renderWithProviders} from '../test-utils/renderWithProviders';
import {clearSelection, firstText, focusEditor, placeCaret} from '../test-utils/editorSelection';

function renderEditor(value: string, onEmbedsChange?: jest.Mock) {
    const onChange = jest.fn();
    // The editor mounts its own EmbedDataProvider from this prop, like a host application does
    const dataProviders = buildDefaultProviders();
    renderWithProviders(
            <RichTextEditor value={value} onChange={onChange} onEmbedsChange={onEmbedsChange} dataProviders={dataProviders}/>,
    );
    return {onChange, editor: focusEditor(), dataProviders};
}

function lastHtml(onChange: jest.Mock): string {
    return onChange.mock.calls.at(-1)?.[0] as string;
}

async function findDialog(title: string): Promise<HTMLElement> {
    const heading = await screen.findByText(title);
    const dialog = heading.closest('.ant-modal');
    if (!(dialog instanceof HTMLElement)) {
        throw new Error(`Dialog "${title}" is not rendered`);
    }
    return dialog;
}

async function openEmbedDialog(button: RegExp, title: string): Promise<HTMLElement> {
    expect(fireEvent.mouseDown(screen.getByRole('button', {name: button}))).toBe(false);
    return findDialog(title);
}

async function waitUntilLoaded(dialog: HTMLElement): Promise<void> {
    await waitFor(() => expect(within(dialog).queryByRole('progressbar')).not.toBeInTheDocument());
}

async function confirmDialog(dialog: HTMLElement): Promise<void> {
    await userEvent.click(within(dialog).getByRole('button', {name: /^ok$/i}));
}

/** Open an antd Select and click the option with the given title. */
async function pickOption(combobox: HTMLElement, title: string): Promise<void> {
    await userEvent.click(combobox);
    const option = await waitFor(() => {
        const element = document.querySelector(`.ant-select-item-option[title="${title}"]`);
        if (!(element instanceof HTMLElement)) {
            throw new Error(`Option ${title} is not rendered`);
        }
        return element;
    });
    await userEvent.click(option);
}

function clickPlaceholder(label: RegExp): void {
    fireEvent.click(screen.getByText(label));
}

function expectNoDialog(): void {
    expect(document.querySelector('.ant-modal')).toBeNull();
}

describe('RichTextEditor embed flows', () => {
    // -----------------------------------------------------------------------
    // Inserting embeds from the toolbar
    // -----------------------------------------------------------------------
    describe('inserting embeds', () => {
        it('appends a gallery embed at the end when nothing is selected and reports it', async () => {
            const onEmbedsChange = jest.fn();
            const {onChange} = renderEditor('<p>Intro</p>', onEmbedsChange);
            clearSelection();

            const dialog = await openEmbedDialog(/gallery/i, 'Insert Gallery Embed');
            await waitUntilLoaded(dialog);
            await pickOption(within(dialog).getByRole('combobox'), 'Winter 2024');
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Intro</p><!--vps:embed:gallery:2-->'));
            expect(onEmbedsChange).toHaveBeenLastCalledWith([expect.objectContaining({type: 'gallery', id: 2})]);
        });

        it('inserts a gallery embed at the saved caret', async () => {
            const {onChange, editor} = renderEditor('<p>Intro</p><p>End</p>');
            placeCaret(firstText(editor, 'p:last-child'), 0);

            const dialog = await openEmbedDialog(/gallery/i, 'Insert Gallery Embed');
            await waitUntilLoaded(dialog);
            await pickOption(within(dialog).getByRole('combobox'), 'Summer 2023');
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Intro</p><p><!--vps:embed:gallery:1-->End</p>'));
        });

        it('replaces the saved selection with the embed', async () => {
            const {onChange, editor} = renderEditor('<p>Hello world</p>');
            const text = firstText(editor, 'p');
            placeCaret(text, 0);
            window.getSelection()?.getRangeAt(0).setEnd(text, 6);

            const dialog = await openEmbedDialog(/gallery/i, 'Insert Gallery Embed');
            await waitUntilLoaded(dialog);
            await pickOption(within(dialog).getByRole('combobox'), 'Summer 2023');
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p><!--vps:embed:gallery:1-->world</p>'));
        });

        it('inserts an image embed', async () => {
            const {onChange} = renderEditor('<p>Intro</p>');
            clearSelection();

            const dialog = await openEmbedDialog(/img/i, 'Insert Image Embed');
            await userEvent.click(await within(dialog).findByText('photo-02.jpg'));
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Intro</p><!--vps:embed:image:11-->'));
        });

        it('inserts a typed hero image embed', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/hero/i, 'Insert Hero Image Embed');
            await userEvent.click(await within(dialog).findByText('photo-01.jpg'));
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:hero:10:type:image-->'));
        });

        it('inserts a hero carousel embed with duration and transition', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/hero/i, 'Insert Hero Image Embed');
            await userEvent.click(within(dialog).getByRole('radio', {name: 'Carousel'}));
            const galleryDialog = await findDialog('Insert Gallery Embed');
            await waitUntilLoaded(galleryDialog);
            fireEvent.change(within(galleryDialog).getByRole('spinbutton'), {target: {value: '9'}});
            const comboboxes = within(galleryDialog).getAllByRole('combobox');
            await pickOption(comboboxes[0], 'Fade transition');
            await pickOption(comboboxes[1], 'Spring Flowers');
            await confirmDialog(galleryDialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:hero:3:type:carousel:duration:9:transition:fade-->'));
        });

        it('inserts a video embed', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/video/i, 'Insert Video Embed');
            await userEvent.click(await within(dialog).findByText('video-01.mp4'));
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:video:12-->'));
        });

        it('inserts an audio embed', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/audio/i, 'Insert Audio Embed');
            await userEvent.click(await within(dialog).findByText('photo-01.jpg'));
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:audio:10-->'));
        });

        it('inserts a youtube embed', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/youtube/i, 'Insert YouTube Embed');
            fireEvent.change(within(dialog).getByPlaceholderText(/youtube\.com/i), {target: {value: ' https://youtu.be/abc '}});
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:youtube:https://youtu.be/abc-->'));
        });

        it('inserts a music embed with the default identifier', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/music/i, 'Insert Music Data Embed');
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:music:music_library-->'));
        });

        it('inserts a GPS time series embed chosen from the data sets', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/gps/i, 'Insert GPS Time Series Embed');
            await waitUntilLoaded(dialog);
            await userEvent.click(within(dialog).getByRole('combobox'));
            await userEvent.click(await screen.findByText('GPS 2024 track'));
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:gps_timeseries:gps_timeseries_2024-->'));
        });

        it('inserts a last items embed with the defaults', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/last/i, 'Insert Last Items Embed');
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:last:pages:5-->'));
        });

        it('inserts a word cloud embed with the default options', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/cloud/i, 'Insert Word Cloud Embed');
            await confirmDialog(dialog);

            await waitFor(() => expect(lastHtml(onChange)).toMatch(/^<!--vps:embed:word_cloud:\{.*\}-->$/));
            const [segment] = parseEmbeds(lastHtml(onChange));
            expect(segment).toEqual({
                kind: 'embed',
                descriptor: {type: 'word_cloud', options: expect.objectContaining({width: 800, height: 500, shape: 'circle'})},
            });
        });

        it('inserts a today random embed with the default options', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/today/i, 'Insert Today Random Embed');
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:today_random:{"title":"On this day"}-->'));
        });

        it('inserts a collapse embed with the entered items', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/collapse/i, 'Insert Collapse Embed');
            fireEvent.change(within(dialog).getByPlaceholderText('Title'), {target: {value: 'T'}});
            fireEvent.change(within(dialog).getByPlaceholderText('Body'), {target: {value: 'B'}});
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:collapse:[{"title":"T","body":"B"}]-->'));
        });

        it('inserts a carousel embed with the entered items and default params', async () => {
            const {onChange} = renderEditor('');
            clearSelection();

            const dialog = await openEmbedDialog(/carousel/i, 'Insert Carousel Embed');
            fireEvent.change(within(dialog).getByPlaceholderText('Title'), {target: {value: 'T'}});
            fireEvent.change(within(dialog).getByPlaceholderText('Body'), {target: {value: 'B'}});
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:carousel:[{"title":"T","body":"B"}]:false:false:500-->'));
        });

        it('leaves the content untouched when the dialog is cancelled', async () => {
            const {onChange, editor} = renderEditor('<p>Intro</p>');

            const dialog = await openEmbedDialog(/last/i, 'Insert Last Items Embed');
            await userEvent.click(within(dialog).getByRole('button', {name: /cancel/i}));

            expect(editor.innerHTML).toBe('<p>Intro</p>');
            expect(onChange.mock.calls.some(([html]) => (html as string).includes('vps:embed'))).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Editing existing placeholders (click-to-edit)
    // -----------------------------------------------------------------------
    describe('editing placeholders', () => {
        it('replaces a gallery placeholder with the newly chosen gallery', async () => {
            const {onChange} = renderEditor('<p>a</p><!--vps:embed:gallery:1--><p>b</p>');

            clickPlaceholder(/gallery:1/);
            const dialog = await findDialog('Insert Gallery Embed');
            await waitUntilLoaded(dialog);
            expect(within(dialog).getByText('Summer 2023')).toBeInTheDocument();
            await pickOption(within(dialog).getByRole('combobox'), 'Winter 2024');
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>a</p><!--vps:embed:gallery:2--><p>b</p>'));
        });

        it('opens the image editor with the current file selected and saves the new choice', async () => {
            const {onChange} = renderEditor('<!--vps:embed:image:10-->');

            clickPlaceholder(/image:10/);
            const dialog = await findDialog('Insert Image Embed');
            expect((await within(dialog).findByText(/selected:/i)).closest('div')?.textContent).toContain('photo-01.jpg');
            await userEvent.click(within(dialog).getByText('photo-02.jpg'));
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:image:11-->'));
        });

        it('upgrades a legacy hero tag to the typed image format', async () => {
            const {onChange} = renderEditor('<!--vps:embed:hero:10-->');

            clickPlaceholder(/hero:10/);
            const dialog = await findDialog('Insert Hero Image Embed');
            await waitUntilLoaded(dialog);
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:hero:10:type:image-->'));
        });

        it('opens the hero video selector for a video hero', async () => {
            const {onChange} = renderEditor('<!--vps:embed:hero:12:type:video-->');

            clickPlaceholder(/hero:12/);
            const dialog = await findDialog('Insert Hero Video Embed');
            await waitUntilLoaded(dialog);
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:hero:12:type:video-->'));
        });

        it('opens the gallery selector with duration and transition for a carousel hero', async () => {
            const {onChange} = renderEditor('<!--vps:embed:hero:2:type:carousel:duration:7:transition:fade-->');

            clickPlaceholder(/hero:2/);
            const dialog = await findDialog('Insert Gallery Embed');
            await waitUntilLoaded(dialog);
            expect(within(dialog).getByRole('spinbutton')).toHaveValue('7');
            expect(within(dialog).getByText('Fade transition')).toBeInTheDocument();
            expect(within(dialog).getByText('Winter 2024')).toBeInTheDocument();
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:hero:2:type:carousel:duration:7:transition:fade-->'));
        });

        it('falls back to the default duration and transition for a carousel hero without them', async () => {
            renderEditor('<!--vps:embed:hero:2:type:carousel-->');

            clickPlaceholder(/hero:2/);
            const dialog = await findDialog('Insert Gallery Embed');
            expect(within(dialog).getByRole('spinbutton')).toHaveValue('5');
            expect(within(dialog).getByText('Slide transition')).toBeInTheDocument();
        });

        it('re-saves a video placeholder', async () => {
            const {onChange} = renderEditor('<!--vps:embed:video:12-->');

            clickPlaceholder(/video:12/);
            const dialog = await findDialog('Insert Video Embed');
            await waitUntilLoaded(dialog);
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:video:12-->'));
        });

        it('re-saves an audio placeholder', async () => {
            const {onChange} = renderEditor('<!--vps:embed:audio:10-->');

            clickPlaceholder(/audio:10/);
            const dialog = await findDialog('Insert Audio Embed');
            await waitUntilLoaded(dialog);
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:audio:10-->'));
        });

        it('edits the URL of a youtube placeholder', async () => {
            const {onChange} = renderEditor('<!--vps:embed:youtube:https://youtu.be/old-->');

            clickPlaceholder(/youtube:/);
            const dialog = await findDialog('Insert YouTube Embed');
            const input = within(dialog).getByPlaceholderText(/youtube\.com/i) as HTMLInputElement;
            expect(input.value).toBe('https://youtu.be/old');
            fireEvent.change(input, {target: {value: 'https://www.youtube.com/watch?v=new'}});
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:youtube:https://www.youtube.com/watch?v=new-->'));
        });

        it('edits the identifier of a music placeholder', async () => {
            const {onChange} = renderEditor('<!--vps:embed:music:my_music-->');

            clickPlaceholder(/music:my_music/);
            const dialog = await findDialog('Insert Music Data Embed');
            const input = within(dialog).getByPlaceholderText('music_library') as HTMLInputElement;
            expect(input.value).toBe('my_music');
            fireEvent.change(input, {target: {value: 'other_music'}});
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:music:other_music-->'));
        });

        it('re-saves a GPS time series placeholder with its identifier preselected', async () => {
            const {onChange} = renderEditor('<!--vps:embed:gps_timeseries:gps_timeseries_2023-->');

            clickPlaceholder(/gps:gps_timeseries_2023/);
            const dialog = await findDialog('Insert GPS Time Series Embed');
            await waitUntilLoaded(dialog);
            expect(within(dialog).getByText(/selected:/i).closest('div')?.textContent).toContain('gps_timeseries_2023');
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:gps_timeseries:gps_timeseries_2023-->'));
        });

        it('opens the last editor with the stored type and count', async () => {
            const {onChange} = renderEditor('<!--vps:embed:last:images:4-->');

            clickPlaceholder(/last 4 images/);
            const dialog = await findDialog('Insert Last Items Embed');
            expect(within(dialog).getByDisplayValue('4')).toBeInTheDocument();
            expect(within(dialog).getByText('Images')).toBeInTheDocument();
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:last:images:4-->'));
        });

        it('falls back to a count of 1 for a last placeholder with an invalid count', async () => {
            renderEditor('<!--vps:embed:last:pages:zero-->');

            clickPlaceholder(/last 1 pages/);
            const dialog = await findDialog('Insert Last Items Embed');
            expect(within(dialog).getByDisplayValue('1')).toBeInTheDocument();
        });

        it('edits a word cloud placeholder and keeps its options', async () => {
            const {onChange} = renderEditor('<!--vps:embed:word_cloud:{"width":640,"height":360,"shape":"star","custom":"x"}-->');

            clickPlaceholder(/word cloud/);
            const dialog = await findDialog('Insert Word Cloud Embed');
            expect(within(dialog).getByDisplayValue('640')).toBeInTheDocument();
            await confirmDialog(dialog);

            await waitFor(() => expect(lastHtml(onChange)).toContain('<!--vps:embed:word_cloud:'));
            const [segment] = parseEmbeds(lastHtml(onChange));
            expect(segment).toEqual({
                kind: 'embed',
                descriptor: {type: 'word_cloud', options: expect.objectContaining({width: 640, height: 360, shape: 'star', custom: 'x'})},
            });
        });

        it('opens the word cloud editor with defaults for a malformed payload', async () => {
            renderEditor('<!--vps:embed:word_cloud:{bad-->');

            clickPlaceholder(/word cloud/);
            const dialog = await findDialog('Insert Word Cloud Embed');
            expect(within(dialog).getByDisplayValue('800')).toBeInTheDocument();
        });

        it('opens the word cloud editor with defaults for an array payload', async () => {
            renderEditor('<!--vps:embed:word_cloud:[1]-->');

            clickPlaceholder(/word cloud/);
            const dialog = await findDialog('Insert Word Cloud Embed');
            expect(within(dialog).getByDisplayValue('500')).toBeInTheDocument();
        });

        it('edits a today random placeholder', async () => {
            const {onChange} = renderEditor('<!--vps:embed:today_random:{"title":"Custom","count":2}-->');

            clickPlaceholder(/today random/);
            const dialog = await findDialog('Insert Today Random Embed');
            const input = within(dialog).getByLabelText('Today random options JSON') as HTMLTextAreaElement;
            expect(JSON.parse(input.value)).toEqual({title: 'Custom', count: 2});
            fireEvent.change(input, {target: {value: '{"title":"Changed"}'}});
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:today_random:{"title":"Changed"}-->'));
        });

        it.each([
            ['malformed', '<!--vps:embed:today_random:{bad-->'],
            ['array', '<!--vps:embed:today_random:[1]-->'],
        ])('opens the today random editor with empty options for a %s payload', async (_name, value) => {
            renderEditor(value);

            clickPlaceholder(/today random/);
            const dialog = await findDialog('Insert Today Random Embed');
            const input = within(dialog).getByLabelText('Today random options JSON') as HTMLTextAreaElement;
            expect(JSON.parse(input.value)).toEqual({});
        });

        it('edits a collapse placeholder with its items prefilled', async () => {
            const {onChange} = renderEditor('<!--vps:embed:collapse:[{"title":"A","body":"B"}]-->');

            clickPlaceholder(/collapse \(1 item\)/);
            const dialog = await findDialog('Insert Collapse Embed');
            expect(within(dialog).getByDisplayValue('A')).toBeInTheDocument();
            fireEvent.change(within(dialog).getByPlaceholderText('Body'), {target: {value: 'C'}});
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:collapse:[{"title":"A","body":"C"}]-->'));
        });

        it('keeps escaped quotes and brackets inside collapse item texts when editing', async () => {
            const {onChange} = renderEditor('<!--vps:embed:collapse:[{"title":"say \\"hi\\" [x]","body":"B"}]-->');

            clickPlaceholder(/collapse \(1 item\)/);
            const dialog = await findDialog('Insert Collapse Embed');
            expect(within(dialog).getByDisplayValue('say "hi" [x]')).toBeInTheDocument();
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:collapse:[{"title":"say \\"hi\\" [x]","body":"B"}]-->'));
        });

        it('opens the collapse editor with an empty row for a malformed payload', async () => {
            renderEditor('<!--vps:embed:collapse:[{bad}]-->');

            clickPlaceholder(/collapse:\[\{bad\}\]/);
            const dialog = await findDialog('Insert Collapse Embed');
            expect((within(dialog).getByPlaceholderText('Title') as HTMLInputElement).value).toBe('');
        });

        it('opens the collapse editor with an empty row for a placeholder whose content is not a JSON array', async () => {
            const {editor} = renderEditor('');
            editor.innerHTML = '<span class="vps-embed-placeholder" data-type="collapse" data-content="30">legacy</span>';

            clickPlaceholder(/legacy/);
            const dialog = await findDialog('Insert Collapse Embed');
            expect((within(dialog).getByPlaceholderText('Title') as HTMLInputElement).value).toBe('');
        });

        it('edits a carousel placeholder with its params prefilled', async () => {
            const {onChange} = renderEditor('<!--vps:embed:carousel:[{"title":"A","body":"B"}]:true:false:700-->');

            clickPlaceholder(/carousel \(1 item\)/);
            const dialog = await findDialog('Insert Carousel Embed');
            expect(within(dialog).getByDisplayValue('700')).toBeInTheDocument();
            expect(within(dialog).getByDisplayValue('A')).toBeInTheDocument();
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:carousel:[{"title":"A","body":"B"}]:true:false:700-->'));
        });

        it('uses the default carousel params for a carousel placeholder without extra params', async () => {
            const {onChange} = renderEditor('<!--vps:embed:carousel:[{"title":"A","body":"B"}]-->');

            clickPlaceholder(/carousel \(1 item\)/);
            const dialog = await findDialog('Insert Carousel Embed');
            expect(within(dialog).getByDisplayValue('500')).toBeInTheDocument();
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<!--vps:embed:carousel:[{"title":"A","body":"B"}]:false:false:500-->'));
        });

        it('appends the embed when the edited placeholder disappeared from the editor', async () => {
            const {onChange, editor} = renderEditor('<!--vps:embed:last:pages:3-->');

            clickPlaceholder(/last 3 pages/);
            const dialog = await findDialog('Insert Last Items Embed');
            editor.innerHTML = '<p>Gone</p>';
            await confirmDialog(dialog);

            await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Gone</p><!--vps:embed:last:pages:3-->'));
        });

        it('ignores clicks on plain content', () => {
            renderEditor('<p>Plain text</p>');

            fireEvent.click(screen.getByText('Plain text'));

            expectNoDialog();
        });

        it('ignores a placeholder without a type', () => {
            const {editor} = renderEditor('');
            editor.innerHTML = '<span class="vps-embed-placeholder">broken</span>';

            clickPlaceholder(/broken/);

            expectNoDialog();
        });

        it('ignores an id-based placeholder with a non-numeric id', () => {
            const {editor} = renderEditor('');
            editor.innerHTML = '<span class="vps-embed-placeholder" data-type="gallery" data-id="abc" data-extra="">bad id</span>';

            clickPlaceholder(/bad id/);

            expectNoDialog();
        });
    });
});
