import {
    buildCarouselTag,
    buildEmbedTag,
    type CollapseCarouselItem,
    convertPlaceholdersToTags,
    convertTagsToPlaceholders,
    type EmbedType,
    type LastEmbedType,
    parseCarouselParams,
    type TodayRandomEmbedOptions,
    type WordCloudEmbedOptions
} from './tools/embedTools';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Button, Form, Input, Modal, Select, Space, Tooltip} from 'antd';
import {
    BoldOutlined,
    CalendarOutlined,
    CaretRightOutlined,
    CloudOutlined,
    CodeOutlined,
    DatabaseOutlined,
    EnvironmentOutlined,
    ItalicOutlined,
    LinkOutlined,
    OrderedListOutlined,
    PictureFilled,
    PictureOutlined,
    StrikethroughOutlined,
    TableOutlined,
    UnderlineOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import DOMPurify from 'dompurify';
import {
    RichEmbedAudioEditor,
    RichEmbedCarouselEditor,
    RichEmbedCollapseEditor,
    RichEmbedGalleryEditor,
    RichEmbedGpsTimeSeriesEditor,
    RichEmbedHeroEditor,
    RichEmbedImageEditor,
    RichEmbedLastEditor,
    RichEmbedMusicEditor,
    RichEmbedTodayRandomEditor,
    RichEmbedVideoEditor,
    RichEmbedWordCloudEditor,
    RichEmbedYoutubeEditor
} from './embeds';
import {EmbedDataProvider} from './embeds/EmbedDataContext';
import type {EmbedDataProviders, HeroEmbedType, HeroTransition} from './types';

function parseHeroEmbedType(value: string | undefined): HeroEmbedType {
    return value === 'video' || value === 'carousel' ? value : 'image';
}

function parseHeroDuration(value: string | undefined): number {
    const match = value?.match(/duration:(\d+)/);
    const duration = match ? Number(match[1]) : 5;
    return Number.isFinite(duration) && duration > 0 ? duration : 5;
}

function parseHeroTransition(value: string | undefined): HeroTransition {
    return value?.includes('transition:fade') ? 'fade' : 'slide';
}

export interface RichTextEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    /** When true, hides the toolbar and makes the content non-editable */
    readOnly?: boolean;
    /** Data provider callbacks for embed selectors */
    dataProviders?: Partial<EmbedDataProviders>;
}

interface EmbedDialogState {
    open: boolean;
    type: EmbedType | null;
    /** ID of the embed being edited — used for gallery/image/hero/video/audio types */
    initialId?: number;
    /** Extra params string for carousel edits (e.g. "true:false:500") */
    initialExtra?: string;
    /** JSON items for collapse and carousel embed types */
    initialItems?: CollapseCarouselItem[];
    /** URL for youtube embed edits */
    initialUrl?: string;
    /** Identifier for music and GPS time-series embeds */
    initialIdentifier?: string;
    /** last embed edits */
    initialLastType?: LastEmbedType;
    initialCount?: number;
    /** word cloud embed edits */
    initialWordCloudOptions?: WordCloudEmbedOptions;
    /** today-random embed edits */
    initialTodayRandomOptions?: TodayRandomEmbedOptions;
}

/**
 * Custom rich text editor component that replaces the plain TextArea
 * for editing page body content.
 *
 * Features:
 * - Basic formatting (bold, italic, underline, strikethrough)
 * - Headings (H1–H6)
 * - Lists (ordered, unordered)
 * - Link insertion
 * - Table insertion
 * - Embed tag insertion (gallery, image, hero, video, audio, youtube, music, gps_timeseries, last, word_cloud, today_random, collapse, carousel)
 * - Toggle between WYSIWYG and HTML source view
 * - Click-to-edit for existing embed placeholders
 */
export function RichTextEditor({value, onChange, readOnly = false, dataProviders}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [sourceMode, setSourceMode] = useState(false);
    const [sourceValue, setSourceValue] = useState(value || '');
    // htmlContent mirrors the canonical HTML without placeholders
    const htmlContentRef = useRef<string>(value || '');
    // Reference to the placeholder span being edited (null = new insertion)
    const editingPlaceholderRef = useRef<HTMLElement | null>(null);
    // Saved selection range so we can restore cursor position after a modal closes
    const savedRangeRef = useRef<Range | null>(null);

    const [embedDialog, setEmbedDialog] = useState<EmbedDialogState>({open: false, type: null});
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);

    const [linkForm] = Form.useForm();

    // Initialise htmlContentRef on mount
    useEffect(() => {
        htmlContentRef.current = value || '';
        setSourceValue(value || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Restore editor content whenever switching back to WYSIWYG mode.
    // This runs after the render that mounts the contentEditable div,
    // so editorRef.current is guaranteed to be non-null.
    useEffect(() => {
        if (!sourceMode && editorRef.current) {
            editorRef.current.innerHTML = convertTagsToPlaceholders(htmlContentRef.current);
        }
    }, [sourceMode]);

    // Sync from outside (e.g. form reset) when value changes significantly
    const prevValueRef = useRef<string>(value || '');
    useEffect(() => {
        if (value !== prevValueRef.current && value !== htmlContentRef.current) {
            prevValueRef.current = value || '';
            htmlContentRef.current = value || '';
            setSourceValue(value || '');
            if (!sourceMode && editorRef.current) {
                editorRef.current.innerHTML = convertTagsToPlaceholders(value || '');
            }
        }
    }, [value, sourceMode]);

    const getEditorHtml = useCallback((): string => {
        if (!editorRef.current) return htmlContentRef.current;
        return convertPlaceholdersToTags(editorRef.current.innerHTML);
    }, []);

    const handleEditorInput = useCallback(() => {
        const html = getEditorHtml();
        htmlContentRef.current = html;
        setSourceValue(html);
        prevValueRef.current = html;
        onChange?.(html);
    }, [getEditorHtml, onChange]);

    const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        htmlContentRef.current = e.target.value;
        setSourceValue(e.target.value);
        prevValueRef.current = e.target.value;
        onChange?.(e.target.value);
    };

    const handleModeSwitch = (toSource: boolean) => {
        if (toSource) {
            // Capture current WYSIWYG content before switching to source view
            const html = getEditorHtml();
            htmlContentRef.current = html;
            setSourceValue(html);
            prevValueRef.current = html;
        }
        // When switching back to WYSIWYG the useEffect on sourceMode restores the content
        setSourceMode(toSource);
    };

    // Execute rich text commands using Selection/Range APIs (execCommand replacement).
    const withEditorRange = useCallback((action: (range: Range) => void): boolean => {
        editorRef.current?.focus();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editorRef.current) return false;
        const range = sel.getRangeAt(0);
        if (!editorRef.current.contains(range.commonAncestorContainer)) return false;
        action(range);
        handleEditorInput();
        return true;
    }, [handleEditorInput]);

    const insertHtmlAtRange = useCallback((range: Range, html: string) => {
        const template = document.createElement('template');
        template.innerHTML = html;
        const fragment = template.content;
        const lastNode = fragment.lastChild;
        range.deleteContents();
        range.insertNode(fragment);
        if (lastNode) {
            const after = document.createRange();
            after.setStartAfter(lastNode);
            after.collapse(true);
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(after);
            }
        }
    }, []);

    const wrapSelectionWithTag = useCallback((tagName: 'b' | 'i' | 'u' | 's') => {
        withEditorRange((range) => {
            const wrapper = document.createElement(tagName);
            if (range.collapsed) {
                wrapper.appendChild(document.createTextNode('\u200b'));
                range.insertNode(wrapper);
                const caret = document.createRange();
                caret.setStart(wrapper.firstChild as Node, 1);
                caret.collapse(true);
                const sel = window.getSelection();
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(caret);
                }
                return;
            }

            const content = range.extractContents();
            wrapper.appendChild(content);
            range.insertNode(wrapper);
            const sel = window.getSelection();
            if (sel) {
                const after = document.createRange();
                after.setStartAfter(wrapper);
                after.collapse(true);
                sel.removeAllRanges();
                sel.addRange(after);
            }
        });
    }, [withEditorRange]);

    const findBlockElement = useCallback((node: Node | null): HTMLElement | null => {
        let current: Node | null = node;
        while (current && current !== editorRef.current) {
            if (
                    current instanceof HTMLElement &&
                    ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(current.tagName)
            ) {
                return current;
            }
            current = current.parentNode;
        }
        return null;
    }, []);

    const replaceBlockTag = useCallback((tagName: string) => {
        withEditorRange((range) => {
            const block = findBlockElement(range.startContainer) ?? editorRef.current;
            if (!block || !(block instanceof HTMLElement) || !editorRef.current) return;
            if (block === editorRef.current) {
                insertHtmlAtRange(range, `<${tagName}></${tagName}>`);
                return;
            }
            if (block.tagName.toLowerCase() === tagName.toLowerCase()) return;

            const replacement = document.createElement(tagName);
            replacement.innerHTML = block.innerHTML;
            block.replaceWith(replacement);

            const sel = window.getSelection();
            if (sel) {
                const caret = document.createRange();
                caret.selectNodeContents(replacement);
                caret.collapse(false);
                sel.removeAllRanges();
                sel.addRange(caret);
            }
        });
    }, [findBlockElement, insertHtmlAtRange, withEditorRange]);

    const toggleList = useCallback((listTag: 'ol' | 'ul') => {
        withEditorRange((range) => {
            const block = findBlockElement(range.startContainer);
            if (!block || !editorRef.current) return;

            const parent = block.parentElement;
            if (parent && parent.tagName.toLowerCase() === listTag && block.tagName.toLowerCase() === 'li') {
                const p = document.createElement('p');
                p.innerHTML = block.innerHTML;
                parent.replaceWith(p);
                return;
            }

            const list = document.createElement(listTag);
            const li = document.createElement('li');
            li.innerHTML = block.innerHTML || '\u200b';
            list.appendChild(li);
            block.replaceWith(list);

            const sel = window.getSelection();
            if (sel) {
                const caret = document.createRange();
                caret.selectNodeContents(li);
                caret.collapse(false);
                sel.removeAllRanges();
                sel.addRange(caret);
            }
        });
    }, [findBlockElement, withEditorRange]);

    const createLinkAtSelection = useCallback((href: string, text: string) => {
        withEditorRange((range) => {
            const link = document.createElement('a');
            link.setAttribute('href', href);

            if (!range.collapsed) {
                const content = range.extractContents();
                link.appendChild(content);
                range.insertNode(link);
            } else {
                link.textContent = text;
                range.insertNode(link);
            }

            const sel = window.getSelection();
            if (sel) {
                const after = document.createRange();
                after.setStartAfter(link);
                after.collapse(true);
                sel.removeAllRanges();
                sel.addRange(after);
            }
        });
    }, [withEditorRange]);

    const insertHtmlAtSelection = useCallback((html: string) => {
        withEditorRange((range) => insertHtmlAtRange(range, html));
    }, [insertHtmlAtRange, withEditorRange]);

    const insertHeading = (level: string) => {
        replaceBlockTag(level);
    };

    const insertTable = () => {
        const rows = 3;
        const cols = 3;
        let html = '<table style="border-collapse:collapse;width:100%;border:1px solid #666"><tbody>';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                html += r === 0
                        ? '<th style="padding:4px;border:1px solid #666"></th>'
                        : '<td style="padding:4px;border:1px solid #666"></td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table><p></p>';
        insertHtmlAtSelection(html);
    };

    const insertLink = (url: string, text: string) => {
        restoreSelection();
        editorRef.current?.focus();
        // Reject dangerous URL schemes (javascript:, data:, vbscript:, etc.)
        const trimmedUrl = url.trim().toLowerCase();
        const dangerousSchemes = ['javascript:', 'data:', 'vbscript:'];
        const safeUrl = dangerousSchemes.some(s => trimmedUrl.startsWith(s)) ? '#' : url;
        const escapedUrl = DOMPurify.sanitize(safeUrl, {ALLOWED_TAGS: []});
        const escapedText = DOMPurify.sanitize(text || safeUrl, {ALLOWED_TAGS: []});
        createLinkAtSelection(escapedUrl, escapedText);
    };

    const saveSelection = useCallback(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current) {
            const range = sel.getRangeAt(0);
            if (editorRef.current.contains(range.commonAncestorContainer)) {
                savedRangeRef.current = range.cloneRange();
                return;
            }
        }
        savedRangeRef.current = null;
    }, []);

    const restoreSelection = useCallback((): boolean => {
        const range = savedRangeRef.current;
        if (range && editorRef.current) {
            if (!editorRef.current.contains(range.startContainer)) {
                return false;
            }
            editorRef.current.focus();
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
                return true;
            }
        }
        return false;
    }, []);

    const openEmbedDialog = (type: EmbedType) => {
        saveSelection();
        editingPlaceholderRef.current = null;
        setEmbedDialog({open: true, type});
    };

    /** Replace a placeholder span in the editor with a new one, or insert at cursor if none. */
    const insertOrReplacePlaceholder = useCallback((tag: string) => {
        const placeholder = editingPlaceholderRef.current;
        const newHtml = convertTagsToPlaceholders(tag);

        if (placeholder && editorRef.current?.contains(placeholder)) {
            placeholder.outerHTML = newHtml;
            handleEditorInput();
        } else {
            // Restore saved cursor position, then insert there.
            // IMPORTANT: we must NOT call execCmd() here because it calls
            // editorRef.current.focus() which moves the cursor to the start
            // of the editor, wiping the selection we just restored.
            const restored = restoreSelection();

            if (restored) {
                insertHtmlAtSelection(newHtml);
            } else {
                // Fallback: append at the end of the editor content
                if (editorRef.current) {
                    editorRef.current.insertAdjacentHTML('beforeend', newHtml);
                    handleEditorInput();
                }
            }
        }
        editingPlaceholderRef.current = null;
        savedRangeRef.current = null;
    }, [handleEditorInput, insertHtmlAtSelection, restoreSelection]);

    const handleGalleryConfirm = (id: number) => {
        const tag = buildEmbedTag({type: 'gallery', id});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleImageConfirm = (id: number) => {
        const tag = buildEmbedTag({type: 'image', id});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleHeroConfirm = (id: number, heroType: HeroEmbedType, heroDuration: number, heroTransition: HeroTransition) => {
        const tag = buildEmbedTag({type: 'hero', id, heroType, heroDuration, heroTransition});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleCollapseConfirm = (items: CollapseCarouselItem[]) => {
        const tag = buildEmbedTag({type: 'collapse', items});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleCarouselConfirm = (items: CollapseCarouselItem[], autoplay: boolean, dotDuration: boolean, speed: number) => {
        const tag = buildCarouselTag(items, {autoplay, dotDuration, speed});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleVideoConfirm = (id: number) => {
        const tag = buildEmbedTag({type: 'video', id});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleAudioConfirm = (id: number) => {
        const tag = buildEmbedTag({type: 'audio', id});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleYoutubeConfirm = (url: string) => {
        const tag = buildEmbedTag({type: 'youtube', url});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleMusicConfirm = (identifier: string) => {
        const tag = buildEmbedTag({type: 'music', identifier});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleGpsTimeSeriesConfirm = (identifier: string) => {
        const tag = buildEmbedTag({type: 'gps_timeseries', identifier});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleLastConfirm = (itemType: LastEmbedType, count: number) => {
        const tag = buildEmbedTag({type: 'last', itemType, count});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleWordCloudConfirm = (options: WordCloudEmbedOptions) => {
        const tag = buildEmbedTag({type: 'word_cloud', options});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleTodayRandomConfirm = (options: TodayRandomEmbedOptions) => {
        const tag = buildEmbedTag({type: 'today_random', options});
        insertOrReplacePlaceholder(tag);
        setEmbedDialog({open: false, type: null});
    };

    const handleEmbedCancel = () => {
        editingPlaceholderRef.current = null;
        setEmbedDialog({open: false, type: null});
    };

    const handleLinkInsert = () => {
        linkForm.validateFields().then((values) => {
            insertLink(values.url, values.text);
            setLinkDialogOpen(false);
        });
    };

    /** Handle clicks on the contentEditable area to detect placeholder clicks. */
    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const placeholder = target.closest('.vps-embed-placeholder') as HTMLElement | null;
        if (placeholder) {
            const type = placeholder.dataset.type as EmbedType;
            if (!type) return;

            if (type === 'collapse' || type === 'carousel') {
                // data-content stores the raw embed tag content (plain JSON).
                // The browser auto-unescapes HTML entities from dataset attributes.
                const rawContent = placeholder.dataset.content || '';

                let items: CollapseCarouselItem[] = [];
                let extra: string | undefined;

                const trimmed = rawContent.trimStart();
                if (trimmed.startsWith('[')) {
                    try {
                        let depth = 0;
                        let inStr = false;
                        let esc = false;
                        let jsonEnd = -1;
                        for (let i = 0; i < trimmed.length; i++) {
                            const ch = trimmed[i];
                            if (esc) {
                                esc = false;
                                continue;
                            }
                            if (ch === '\\' && inStr) {
                                esc = true;
                                continue;
                            }
                            if (ch === '"') {
                                inStr = !inStr;
                                continue;
                            }
                            if (inStr) continue;
                            if (ch === '[') depth++;
                            else if (ch === ']') {
                                depth--;
                                if (depth === 0) {
                                    jsonEnd = i;
                                    break;
                                }
                            }
                        }
                        if (jsonEnd !== -1) {
                            const parsed = JSON.parse(trimmed.substring(0, jsonEnd + 1));
                            if (Array.isArray(parsed)) {
                                items = parsed as CollapseCarouselItem[];
                            }
                            const rest = trimmed.substring(jsonEnd + 1);
                            extra = rest.startsWith(':') ? rest.substring(1) : undefined;
                        }
                    } catch {
                        // ignore malformed JSON
                    }
                }

                editingPlaceholderRef.current = placeholder;
                setEmbedDialog({open: true, type, initialItems: items, initialExtra: extra});
                return;
            }

            if (type === 'youtube') {
                editingPlaceholderRef.current = placeholder;
                setEmbedDialog({open: true, type, initialUrl: placeholder.dataset.content || ''});
                return;
            }

            if (type === 'music' || type === 'gps_timeseries') {
                editingPlaceholderRef.current = placeholder;
                setEmbedDialog({open: true, type, initialIdentifier: placeholder.dataset.content || ''});
                return;
            }

            if (type === 'word_cloud') {
                const rawContent = placeholder.dataset.content || '';
                let parsedOptions: WordCloudEmbedOptions = {};
                try {
                    const parsed = JSON.parse(rawContent);
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                        parsedOptions = parsed as WordCloudEmbedOptions;
                    }
                } catch {
                    // ignore malformed JSON
                }

                editingPlaceholderRef.current = placeholder;
                setEmbedDialog({open: true, type, initialWordCloudOptions: parsedOptions});
                return;
            }

            if (type === 'today_random') {
                const rawContent = placeholder.dataset.content || '';
                let parsedOptions: TodayRandomEmbedOptions = {};
                try {
                    const parsed = JSON.parse(rawContent);
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                        parsedOptions = parsed as TodayRandomEmbedOptions;
                    }
                } catch {
                    // ignore malformed JSON
                }

                editingPlaceholderRef.current = placeholder;
                setEmbedDialog({open: true, type, initialTodayRandomOptions: parsedOptions});
                return;
            }

            if (type === 'last') {
                const rawContent = placeholder.dataset.content || '';
                const parts = rawContent.split(':');
                const parsedType = (parts[0] ?? 'pages').toLowerCase() as LastEmbedType;
                const count = parseInt(parts[1] ?? '1', 10);
                editingPlaceholderRef.current = placeholder;
                setEmbedDialog({
                    open: true,
                    type,
                    initialLastType: parsedType,
                    initialCount: Number.isFinite(count) && count > 0 ? count : 1,
                });
                return;
            }

            // Gallery/image/hero/video/audio placeholders use data-id and data-extra
            const rawId = placeholder.dataset.id;
            const id = rawId ? parseInt(rawId, 10) : NaN;
            if (isNaN(id)) return;
            const extra = placeholder.dataset.extra || '';
            editingPlaceholderRef.current = placeholder;
            setEmbedDialog({open: true, type, initialId: id, initialExtra: extra || undefined});
        }
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        padding: '6px 8px',
        background: '#1a1a2e',
        border: '1px solid #333',
        borderBottom: 'none',
        borderRadius: '4px 4px 0 0',
    };

    const editorContainerStyle: React.CSSProperties = {
        border: '1px solid #333',
        borderRadius: '0 0 4px 4px',
        minHeight: 300,
        background: '#0d0d1a',
    };

    const editorStyle: React.CSSProperties = {
        padding: '8px',
        minHeight: 300,
        outline: 'none',
        color: '#E0E0E0',
        fontSize: '14px',
        lineHeight: '1.6',
    };

    const sourceStyle: React.CSSProperties = {
        width: '100%',
        minHeight: 300,
        padding: '8px',
        background: '#0d0d1a',
        color: '#E0E0E0',
        fontFamily: 'monospace',
        fontSize: '13px',
        border: 'none',
        resize: 'vertical',
        outline: 'none',
    };

    const embedButtonStyle: React.CSSProperties = {
        background: '#1a3a5c',
        borderColor: '#4a90d9',
        color: '#90c4f8',
        fontSize: '11px',
    };

    const headingOptions = [
        {label: 'Normal', value: 'p'},
        {label: 'H1', value: 'h1'},
        {label: 'H2', value: 'h2'},
        {label: 'H3', value: 'h3'},
        {label: 'H4', value: 'h4'},
        {label: 'H5', value: 'h5'},
        {label: 'H6', value: 'h6'},
    ];

    const carouselParams = embedDialog.initialExtra
            ? parseCarouselParams(embedDialog.initialExtra)
            : undefined;

    return (
            <EmbedDataProvider providers={dataProviders}>
                <div style={{width: '98%'}}>
                    {/* Toolbar — hidden in readOnly mode */}
                    {!readOnly && (
                            <div style={toolbarStyle}>
                                {/* Format block selector */}
                                <Select
                                        size="small"
                                        defaultValue="p"
                                        style={{width: 90}}
                                        options={headingOptions}
                                        onChange={(v) => insertHeading(v)}
                                />
                                <Space.Compact size="small">
                                    <Tooltip title="Bold (Ctrl+B)">
                                        <Button size="small" icon={<BoldOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            wrapSelectionWithTag('b');
                                        }}/>
                                    </Tooltip>
                                    <Tooltip title="Italic (Ctrl+I)">
                                        <Button size="small" icon={<ItalicOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            wrapSelectionWithTag('i');
                                        }}/>
                                    </Tooltip>
                                    <Tooltip title="Underline (Ctrl+U)">
                                        <Button size="small" icon={<UnderlineOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            wrapSelectionWithTag('u');
                                        }}/>
                                    </Tooltip>
                                    <Tooltip title="Strikethrough">
                                        <Button size="small" icon={<StrikethroughOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            wrapSelectionWithTag('s');
                                        }}/>
                                    </Tooltip>
                                </Space.Compact>

                                <Space.Compact size="small">
                                    <Tooltip title="Ordered List">
                                        <Button size="small" icon={<OrderedListOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            toggleList('ol');
                                        }}/>
                                    </Tooltip>
                                    <Tooltip title="Unordered List">
                                        <Button size="small" icon={<UnorderedListOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            toggleList('ul');
                                        }}/>
                                    </Tooltip>
                                </Space.Compact>

                                <Space.Compact size="small">
                                    <Tooltip title="Insert Link">
                                        <Button size="small" icon={<LinkOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setLinkDialogOpen(true);
                                        }}/>
                                    </Tooltip>
                                    <Tooltip title="Insert Table (3x3)">
                                        <Button size="small" icon={<TableOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            insertTable();
                                        }}/>
                                    </Tooltip>
                                </Space.Compact>

                                {/* Embed insertion buttons */}
                                <Space.Compact size="small">
                                    <Tooltip title="Insert Gallery Embed">
                                        <Button size="small" style={embedButtonStyle} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('gallery');
                                        }}>Gallery</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Image Embed">
                                        <Button size="small" style={embedButtonStyle} icon={<PictureOutlined/>}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    openEmbedDialog('image');
                                                }}>Img</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Hero Image Embed">
                                        <Button size="small" style={embedButtonStyle} icon={<PictureFilled/>}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    openEmbedDialog('hero');
                                                }}>Hero</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Video Embed">
                                        <Button size="small" style={embedButtonStyle} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('video');
                                        }}>Video</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Audio Embed">
                                        <Button size="small" style={embedButtonStyle} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('audio');
                                        }}>Audio</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert YouTube Embed">
                                        <Button size="small" style={embedButtonStyle} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('youtube');
                                        }}>YouTube</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Music Data Embed">
                                        <Button size="small" style={embedButtonStyle} icon={<DatabaseOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('music');
                                        }}>Music</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert GPS Time Series Embed">
                                        <Button size="small" style={embedButtonStyle} icon={<EnvironmentOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('gps_timeseries');
                                        }}>GPS</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Last Items Embed">
                                        <Button size="small" style={embedButtonStyle} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('last');
                                        }}>Last</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Word Cloud Embed">
                                        <Button size="small" style={embedButtonStyle} icon={<CloudOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('word_cloud');
                                        }}>Cloud</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Today Random Embed">
                                        <Button size="small" style={embedButtonStyle} icon={<CalendarOutlined/>} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('today_random');
                                        }}>Today</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Collapse Embed">
                                        <Button size="small" style={embedButtonStyle} onMouseDown={(e) => {
                                            e.preventDefault();
                                            openEmbedDialog('collapse');
                                        }}>Collapse</Button>
                                    </Tooltip>
                                    <Tooltip title="Insert Carousel Embed">
                                        <Button size="small" style={embedButtonStyle} icon={<CaretRightOutlined/>}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    openEmbedDialog('carousel');
                                                }}>Carousel</Button>
                                    </Tooltip>
                                </Space.Compact>

                                {/* Source mode toggle */}
                                <Tooltip title={sourceMode ? 'Switch to WYSIWYG' : 'Switch to HTML source'}>
                                    <Button
                                            size="small"
                                            icon={<CodeOutlined/>}
                                            type={sourceMode ? 'primary' : 'default'}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleModeSwitch(!sourceMode);
                                            }}
                                    >
                                        {sourceMode ? 'WYSIWYG' : 'HTML'}
                                    </Button>
                                </Tooltip>
                            </div>
                    )}

                    {/* Editor area */}
                    <div style={{
                        ...editorContainerStyle,
                        ...(readOnly ? {borderRadius: '4px'} : {}),
                    }}>
                        {sourceMode && !readOnly ? (
                                <textarea
                                        style={sourceStyle}
                                        value={sourceValue}
                                        onChange={handleSourceChange}
                                />
                        ) : (
                                <div
                                        ref={editorRef}
                                        contentEditable={!readOnly}
                                        suppressContentEditableWarning={true}
                                        style={editorStyle}
                                        onInput={readOnly ? undefined : handleEditorInput}
                                        onBlur={readOnly ? undefined : handleEditorInput}
                                        onClick={readOnly ? undefined : handleEditorClick}
                                />
                        )}
                    </div>

                    {/* Modals — only rendered in editable mode */}
                    {!readOnly && (
                            <>
                                {/* Link insertion dialog */}
                                <Modal
                                        title="Insert Link"
                                        open={linkDialogOpen}
                                        onOk={handleLinkInsert}
                                        onCancel={() => setLinkDialogOpen(false)}
                                        destroyOnHidden={true}
                                >
                                    <Form form={linkForm} layout="vertical">
                                        <Form.Item name="url" label="URL" rules={[{required: true, message: 'Please enter a URL'}]}>
                                            <Input placeholder="https://example.com"/>
                                        </Form.Item>
                                        <Form.Item name="text" label="Link text (optional)">
                                            <Input placeholder="Link text"/>
                                        </Form.Item>
                                    </Form>
                                </Modal>

                                {/* Per-embed editor dialogs */}
                                <RichEmbedGalleryEditor
                                        open={embedDialog.open && embedDialog.type === 'gallery'}
                                        initialId={embedDialog.initialId}
                                        onConfirm={handleGalleryConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedImageEditor
                                        open={embedDialog.open && embedDialog.type === 'image'}
                                        initialId={embedDialog.initialId}
                                        onConfirm={handleImageConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedHeroEditor
                                        open={embedDialog.open && embedDialog.type === 'hero'}
                                        initialId={embedDialog.initialId}
                                        initialType={parseHeroEmbedType(
                                                embedDialog.initialExtra?.startsWith('type:')
                                                        ? embedDialog.initialExtra.substring(5)
                                                        : undefined
                                        )}
                                        initialDuration={parseHeroDuration(embedDialog.initialExtra)}
                                        initialTransition={parseHeroTransition(embedDialog.initialExtra)}
                                        onConfirm={handleHeroConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedCollapseEditor
                                        open={embedDialog.open && embedDialog.type === 'collapse'}
                                        initialItems={embedDialog.initialItems}
                                        onConfirm={handleCollapseConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedCarouselEditor
                                        open={embedDialog.open && embedDialog.type === 'carousel'}
                                        initialItems={embedDialog.initialItems}
                                        initialAutoplay={carouselParams?.autoplay}
                                        initialDotDuration={carouselParams?.dotDuration}
                                        initialSpeed={carouselParams?.speed}
                                        onConfirm={handleCarouselConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedVideoEditor
                                        open={embedDialog.open && embedDialog.type === 'video'}
                                        initialId={embedDialog.initialId}
                                        onConfirm={handleVideoConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedAudioEditor
                                        open={embedDialog.open && embedDialog.type === 'audio'}
                                        initialId={embedDialog.initialId}
                                        onConfirm={handleAudioConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedYoutubeEditor
                                        open={embedDialog.open && embedDialog.type === 'youtube'}
                                        initialUrl={embedDialog.initialUrl}
                                        onConfirm={handleYoutubeConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedMusicEditor
                                        open={embedDialog.open && embedDialog.type === 'music'}
                                        initialIdentifier={embedDialog.initialIdentifier}
                                        onConfirm={handleMusicConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedGpsTimeSeriesEditor
                                        open={embedDialog.open && embedDialog.type === 'gps_timeseries'}
                                        initialIdentifier={embedDialog.initialIdentifier}
                                        onConfirm={handleGpsTimeSeriesConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedLastEditor
                                        open={embedDialog.open && embedDialog.type === 'last'}
                                        initialType={embedDialog.initialLastType}
                                        initialCount={embedDialog.initialCount}
                                        onConfirm={handleLastConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedWordCloudEditor
                                        open={embedDialog.open && embedDialog.type === 'word_cloud'}
                                        initialOptions={embedDialog.initialWordCloudOptions}
                                        onConfirm={handleWordCloudConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                                <RichEmbedTodayRandomEditor
                                        open={embedDialog.open && embedDialog.type === 'today_random'}
                                        initialOptions={embedDialog.initialTodayRandomOptions}
                                        onConfirm={handleTodayRandomConfirm}
                                        onCancel={handleEmbedCancel}
                                />
                            </>
                    )}
                </div>
            </EmbedDataProvider>
    );
}
