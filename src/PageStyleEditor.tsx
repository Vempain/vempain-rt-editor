/**
 * Editor of a page's custom CSS (`page_style`) with two modes the author switches between in the UI: the CSS text as it is stored, and
 * a visual mode that lists the rules as cards, where the selector is picked from the CSS elements that exist on a page and every
 * property gets a control fit for its value. Both modes edit the same string: the visual mode is parsed from it and serialized back
 * into it on every change (`src/tools/pageStyleModel.ts`), and what the visual mode cannot represent is kept verbatim.
 *
 * Controlled like an input: `value` + `onChange(css)`, so it drops into an antd `Form.Item` as the "Page style" field of a host.
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, AutoComplete, Button, ColorPicker, Input, Segmented, Space, Tooltip, Typography} from 'antd';
import {DeleteOutlined, PlusOutlined} from '@ant-design/icons';
import {
    controlFor,
    findStyleProperty,
    newRuleBlock,
    PAGE_STYLE_PROPERTIES,
    PAGE_STYLE_SELECTORS,
    type PageStyleBlock,
    parsePageStyle,
    serializePageStyle,
    SITE_ROOT_SELECTOR,
    type StyleDeclaration,
    type StyleRuleBlock,
} from './tools/pageStyleModel';

export type PageStyleEditorMode = 'css' | 'visual';

export interface PageStyleEditorProps {
    /** The CSS of the page; null and undefined mean none. */
    value?: string | null;
    /** Receives the CSS after every change, in either mode; blank when the page has no style left. */
    onChange?: (css: string) => void;
    /** The mode shown first; the author may switch at any time. */
    defaultMode?: PageStyleEditorMode;
    readOnly?: boolean;
    /** Rows of the text area in CSS mode. */
    rows?: number;
    placeholder?: string;
    /** Accessible name of the field; the mode switch and the controls derive theirs from it. */
    'aria-label'?: string;
    id?: string;
}

const SELECTOR_OPTIONS = PAGE_STYLE_SELECTORS.map((group) => ({
    label: group.label,
    options: group.options.map((option) => ({value: option.value, label: option.label})),
}));

const PROPERTY_OPTIONS = PAGE_STYLE_PROPERTIES.map((group) => ({
    label: group.label,
    options: group.options.map((option) => ({value: option.value, label: `${option.label} (${option.value})`})),
}));

/** Matches the typed text against the value and the label of a catalog option. */
function matchesOption(input: string, option?: {value?: string | number | null; label?: React.ReactNode}): boolean {
    const needle = input.toLowerCase();
    return typeof option?.value === 'string'
            && (option.value.toLowerCase().includes(needle) || String(option.label ?? '').toLowerCase().includes(needle));
}

const MODE_OPTIONS: Array<{label: string; value: PageStyleEditorMode}> = [
    {label: 'CSS', value: 'css'},
    {label: 'Visual', value: 'visual'},
];

export function PageStyleEditor({
    value,
    onChange,
    defaultMode = 'css',
    readOnly = false,
    rows = 6,
    placeholder = '.vps-page-canvas { max-width: 60rem; }',
    'aria-label': ariaLabel = 'Page style',
    id,
}: PageStyleEditorProps) {
    const [mode, setMode] = useState<PageStyleEditorMode>(defaultMode);
    const [blocks, setBlocks] = useState<PageStyleBlock[]>(() => parsePageStyle(value));
    // The CSS the visual mode produced last; a value equal to it is our own echo and must not re-parse (empty rows would vanish)
    const emitted = useRef<string | null>(null);

    useEffect(() => {
        const css = value ?? '';
        if (emitted.current !== null && css === emitted.current) {
            return;
        }
        emitted.current = null;
        setBlocks(parsePageStyle(css));
    }, [value]);

    const update = useCallback((next: PageStyleBlock[]) => {
        setBlocks(next);
        const css = serializePageStyle(next);
        emitted.current = css;
        onChange?.(css);
    }, [onChange]);

    const changeBlock = (index: number, block: PageStyleBlock) => update(blocks.map((current, position) => (position === index ? block : current)));
    const removeBlock = (index: number) => update(blocks.filter((_, position) => position !== index));
    const addRule = () => update([...blocks, newRuleBlock()]);

    const rawCount = blocks.filter((block) => block.kind === 'raw').length;
    const hasRootRule = blocks.some((block) => block.kind === 'rule' && block.selector.trim().startsWith(SITE_ROOT_SELECTOR));

    return (
            <div className="vps-page-style-editor" id={id}>
                <Space vertical size="small" style={{width: '100%'}}>
                    <Segmented<PageStyleEditorMode>
                            aria-label={`${ariaLabel} mode`}
                            options={MODE_OPTIONS}
                            value={mode}
                            onChange={(next) => setMode(next)}
                            size="small"
                    />
                    {mode === 'css' && (
                            <Input.TextArea
                                    rows={rows}
                                    aria-label={ariaLabel}
                                    placeholder={placeholder}
                                    style={{fontFamily: 'monospace'}}
                                    spellCheck={false}
                                    readOnly={readOnly}
                                    value={value ?? ''}
                                    onChange={(event) => {
                                        emitted.current = null;
                                        onChange?.(event.target.value);
                                    }}
                            />
                    )}
                    {mode === 'visual' && (
                            <div className="vps-page-style-visual" data-testid="vps-page-style-visual">
                                {rawCount > 0 && (
                                        <Alert
                                                type="info"
                                                showIcon
                                                style={{marginBottom: 8}}
                                                title={`${rawCount} block${rawCount === 1 ? '' : 's'} (comments, @-rules or nested rules) kept as written; edit them in CSS mode`}
                                        />
                                )}
                                {hasRootRule && (
                                        <Alert
                                                type="warning"
                                                showIcon
                                                style={{marginBottom: 8}}
                                                title="Rules on :root apply on the website only; the editing canvas cannot preview them"
                                        />
                                )}
                                {blocks.length === 0 && <Typography.Text type="secondary">No rules yet. Add a rule to style an element of the page.</Typography.Text>}
                                {blocks.map((block, index) => (
                                        block.kind === 'rule'
                                                ? <RuleCard key={index} index={index} block={block} readOnly={readOnly} ariaLabel={ariaLabel}
                                                            onChange={(next) => changeBlock(index, next)} onRemove={() => removeBlock(index)}/>
                                                : <RawCard key={index} index={index} text={block.text} readOnly={readOnly} ariaLabel={ariaLabel}
                                                           onRemove={() => removeBlock(index)}/>
                                ))}
                                {!readOnly && (
                                        <Button icon={<PlusOutlined/>} size="small" onClick={addRule} aria-label={`${ariaLabel}: add rule`}
                                                style={{marginTop: 8}}>
                                            Add rule
                                        </Button>
                                )}
                            </div>
                    )}
                </Space>
            </div>
    );
}

interface RuleCardProps {
    index: number;
    block: StyleRuleBlock;
    readOnly: boolean;
    ariaLabel: string;
    onChange: (block: StyleRuleBlock) => void;
    onRemove: () => void;
}

function RuleCard({index, block, readOnly, ariaLabel, onChange, onRemove}: RuleCardProps) {
    const label = `${ariaLabel} rule ${index + 1}`;
    const changeDeclaration = (position: number, declaration: StyleDeclaration) =>
            onChange({...block, declarations: block.declarations.map((current, at) => (at === position ? declaration : current))});
    const removeDeclaration = (position: number) =>
            onChange({...block, declarations: block.declarations.filter((_, at) => at !== position)});
    const addDeclaration = () => onChange({...block, declarations: [...block.declarations, {property: '', value: ''}]});

    return (
            <div className="vps-page-style-rule" data-testid="vps-page-style-rule"
                 style={{border: '1px solid rgba(128,128,128,0.4)', borderRadius: 6, padding: 8, marginBottom: 8}}>
                <Space style={{width: '100%', marginBottom: 8}} align="center">
                    <Typography.Text strong>Element</Typography.Text>
                    <AutoComplete
                            aria-label={`${label} selector`}
                            style={{minWidth: 320}}
                            options={SELECTOR_OPTIONS}
                            value={block.selector}
                            onChange={(selector) => onChange({...block, selector: String(selector ?? '')})}
                            disabled={readOnly}
                            placeholder="Pick an element or type a selector"
                            showSearch={{filterOption: matchesOption}}
                    />
                    {!readOnly && (
                            <Tooltip title="Remove this rule">
                                <Button size="small" danger icon={<DeleteOutlined/>} onClick={onRemove} aria-label={`${label}: remove rule`}/>
                            </Tooltip>
                    )}
                </Space>
                {block.declarations.map((declaration, position) => (
                        <DeclarationRow key={position} label={`${label} property ${position + 1}`} declaration={declaration} readOnly={readOnly}
                                        onChange={(next) => changeDeclaration(position, next)} onRemove={() => removeDeclaration(position)}/>
                ))}
                {!readOnly && (
                        <Button type="link" size="small" icon={<PlusOutlined/>} onClick={addDeclaration} aria-label={`${label}: add property`}>
                            Add property
                        </Button>
                )}
            </div>
    );
}

interface DeclarationRowProps {
    label: string;
    declaration: StyleDeclaration;
    readOnly: boolean;
    onChange: (declaration: StyleDeclaration) => void;
    onRemove: () => void;
}

function DeclarationRow({label, declaration, readOnly, onChange, onRemove}: DeclarationRowProps) {
    const control = controlFor(declaration.property);
    const catalog = findStyleProperty(declaration.property);
    const valueLabel = `${label} value`;

    let valueControl: React.ReactNode;
    if (control === 'color') {
        valueControl = (
                <Space.Compact>
                    <ColorPicker
                            value={declaration.value || undefined}
                            disabled={readOnly}
                            size="small"
                            onChange={(_, css) => onChange({...declaration, value: css})}
                    />
                    <Input
                            aria-label={valueLabel}
                            size="small"
                            style={{width: 160}}
                            value={declaration.value}
                            readOnly={readOnly}
                            placeholder="#rrggbb or var(--x)"
                            onChange={(event) => onChange({...declaration, value: event.target.value})}
                    />
                </Space.Compact>
        );
    } else if (control === 'choice') {
        valueControl = (
                <AutoComplete
                        aria-label={valueLabel}
                        size="small"
                        style={{minWidth: 200}}
                        options={(catalog?.choices ?? []).map((choice) => ({value: choice}))}
                        value={declaration.value}
                        disabled={readOnly}
                        placeholder={catalog?.placeholder ?? 'value'}
                        onChange={(next) => onChange({...declaration, value: String(next ?? '')})}
                />
        );
    } else {
        valueControl = (
                <Input
                        aria-label={valueLabel}
                        size="small"
                        style={{minWidth: 200}}
                        value={declaration.value}
                        readOnly={readOnly}
                        placeholder={catalog?.placeholder ?? (control === 'length' ? 'e.g. 1rem' : 'value')}
                        onChange={(event) => onChange({...declaration, value: event.target.value})}
                />
        );
    }

    return (
            <Space style={{marginBottom: 4}} align="center" wrap>
                <AutoComplete
                        aria-label={label}
                        size="small"
                        style={{minWidth: 240}}
                        options={PROPERTY_OPTIONS}
                        value={declaration.property}
                        disabled={readOnly}
                        placeholder="Property"
                        onChange={(property) => onChange({...declaration, property: String(property ?? '')})}
                        showSearch={{filterOption: matchesOption}}
                />
                {valueControl}
                {!readOnly && (
                        <Button size="small" type="text" icon={<DeleteOutlined/>} onClick={onRemove} aria-label={`${label}: remove property`}/>
                )}
            </Space>
    );
}

interface RawCardProps {
    index: number;
    text: string;
    readOnly: boolean;
    ariaLabel: string;
    onRemove: () => void;
}

function RawCard({index, text, readOnly, ariaLabel, onRemove}: RawCardProps) {
    const label = `${ariaLabel} block ${index + 1}`;
    return (
            <div className="vps-page-style-raw" data-testid="vps-page-style-raw"
                 style={{border: '1px dashed rgba(128,128,128,0.4)', borderRadius: 6, padding: 8, marginBottom: 8}}>
                <Space style={{width: '100%', marginBottom: 4}} align="center">
                    <Typography.Text type="secondary">Kept as written</Typography.Text>
                    {!readOnly && (
                            <Tooltip title="Remove this block">
                                <Button size="small" danger icon={<DeleteOutlined/>} onClick={onRemove} aria-label={`${label}: remove block`}/>
                            </Tooltip>
                    )}
                </Space>
                <Input.TextArea aria-label={label} value={text} readOnly autoSize={{minRows: 1, maxRows: 8}} style={{fontFamily: 'monospace'}}/>
            </div>
    );
}
