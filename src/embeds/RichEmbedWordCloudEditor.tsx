import React, {useEffect, useMemo} from 'react';
import {InfoCircleOutlined} from '@ant-design/icons';
import {Form, Input, InputNumber, Modal, Select, Tooltip, Typography} from 'antd';
import type {WordCloudEmbedOptions} from '../tools/embedTools';

interface RichEmbedWordCloudEditorProps {
    open: boolean;
    initialOptions?: WordCloudEmbedOptions;
    onConfirm: (options: WordCloudEmbedOptions) => void;
    onCancel: () => void;
}

const DEFAULT_WORD_CLOUD_OPTIONS: WordCloudEmbedOptions = {
    width: 800,
    height: 500,
    shape: 'circle',
    layout: {
        fontSize: [14, 56],
        spiral: 'rectangular',
        padding: 1,
    },
};

function removeDataProperty(options: WordCloudEmbedOptions): WordCloudEmbedOptions {
    const rest = {...options};
    delete rest.data;
    return rest;
}

interface WordCloudFormValues {
    width?: number;
    height?: number;
    textField?: string;
    colorField?: string;
    shape?: string;
    layoutFont?: string;
    layoutFontSizeMin?: number;
    layoutFontSizeMax?: number;
    layoutImageMask?: string;
    layoutPadding?: number;
    layoutRotate?: number;
    layoutRandom?: number;
    layoutSpiral?: 'archimedean' | 'rectangular';
    layoutTimeInterval?: number;
    styleJson?: string;
}

const ROOT_MANAGED_KEYS = new Set(['width', 'height', 'textField', 'colorField', 'shape', 'layout', 'style', 'fontSize', 'spiral', 'padding']);
const LAYOUT_MANAGED_KEYS = new Set(['font', 'fontSize', 'imageMask', 'padding', 'rotate', 'random', 'spiral', 'timeInterval', 'size']);

function toObjectRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

function toNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function toLabelWithTooltip(label: string, tooltip: string): React.ReactNode {
    return (
            <span>
                {label}{' '}
                <Tooltip title={tooltip}>
                    <InfoCircleOutlined style={{color: '#8c8c8c'}}/>
                </Tooltip>
            </span>
    );
}

function formatStyleJson(value: unknown): string {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return JSON.stringify(value, null, 2);
    }
    return '';
}

function createInitialFormValues(options: WordCloudEmbedOptions): WordCloudFormValues {
    const defaultLayout = toObjectRecord(DEFAULT_WORD_CLOUD_OPTIONS.layout);
    const inputLayout = toObjectRecord(options.layout);
    const normalized: WordCloudEmbedOptions = {
        ...DEFAULT_WORD_CLOUD_OPTIONS,
        ...removeDataProperty(options),
        layout: {
            ...defaultLayout,
            ...inputLayout,
        },
    };
    const layout = toObjectRecord(normalized.layout);
    const topLevelFontSize = Array.isArray(normalized.fontSize) ? normalized.fontSize : [];
    const layoutFontSize = Array.isArray(layout.fontSize) ? layout.fontSize : topLevelFontSize;
    const layoutSize = Array.isArray(layout.size) ? layout.size : [];

    return {
        width: toNumber(normalized.width) ?? toNumber(layoutSize[0]),
        height: toNumber(normalized.height) ?? toNumber(layoutSize[1]),
        textField: toString(normalized.textField),
        colorField: toString(normalized.colorField),
        shape: toString(normalized.shape),
        layoutFont: toString(layout.font),
        layoutFontSizeMin: toNumber(layoutFontSize[0]),
        layoutFontSizeMax: toNumber(layoutFontSize[1]),
        layoutImageMask: toString(layout.imageMask),
        layoutPadding: toNumber(layout.padding) ?? toNumber(normalized.padding),
        layoutRotate: toNumber(layout.rotate),
        layoutRandom: toNumber(layout.random),
        layoutSpiral: (toString(layout.spiral) ?? toString(normalized.spiral)) as 'archimedean' | 'rectangular' | undefined,
        layoutTimeInterval: toNumber(layout.timeInterval),
        styleJson: formatStyleJson(normalized.style),
    };
}

function splitUnmanagedOptions(options: WordCloudEmbedOptions): {
    root: Record<string, unknown>;
    layout: Record<string, unknown>;
} {
    const root: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(options)) {
        if (!ROOT_MANAGED_KEYS.has(key)) {
            root[key] = value;
        }
    }

    const layoutSource = toObjectRecord(options.layout);
    const layout: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(layoutSource)) {
        if (!LAYOUT_MANAGED_KEYS.has(key)) {
            layout[key] = value;
        }
    }

    return {root, layout};
}

function parseStyle(styleJson: string | undefined): Record<string, unknown> | undefined {
    const trimmed = (styleJson ?? '').trim();
    if (!trimmed) {
        return undefined;
    }
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Style must be a JSON object');
    }
    return parsed as Record<string, unknown>;
}

export function RichEmbedWordCloudEditor({
                                             open,
                                             initialOptions,
                                             onConfirm,
                                             onCancel,
                                         }: RichEmbedWordCloudEditorProps) {
    const [form] = Form.useForm();

    const initialValues = useMemo(
            () => createInitialFormValues(initialOptions ?? {}),
            [initialOptions],
    );
    const unmanagedOptions = useMemo(
            () => splitUnmanagedOptions(removeDataProperty(initialOptions ?? {})),
            [initialOptions],
    );

    useEffect(() => {
        if (open) {
            form.setFieldsValue(initialValues);
        }
    }, [form, initialValues, open]);

    const handleOk = () => {
        form.validateFields().then((values) => {
            const typedValues = values as WordCloudFormValues;
            const options: WordCloudEmbedOptions = {...unmanagedOptions.root};
            const layout: Record<string, unknown> = {...unmanagedOptions.layout};

            if (typedValues.width !== undefined) {
                options.width = typedValues.width;
            }
            if (typedValues.height !== undefined) {
                options.height = typedValues.height;
            }
            if (typedValues.textField) {
                options.textField = typedValues.textField.trim();
            }
            if (typedValues.colorField) {
                options.colorField = typedValues.colorField.trim();
            }
            if (typedValues.shape) {
                options.shape = typedValues.shape;
            }
            if (typedValues.layoutFont) {
                layout.font = typedValues.layoutFont.trim();
            }
            if (typedValues.layoutImageMask) {
                layout.imageMask = typedValues.layoutImageMask.trim();
            }
            if (typedValues.layoutPadding !== undefined) {
                layout.padding = typedValues.layoutPadding;
                options.padding = typedValues.layoutPadding;
            }
            if (typedValues.layoutRotate !== undefined) {
                layout.rotate = typedValues.layoutRotate;
            }
            if (typedValues.layoutRandom !== undefined) {
                layout.random = typedValues.layoutRandom;
            }
            if (typedValues.layoutSpiral) {
                layout.spiral = typedValues.layoutSpiral;
                options.spiral = typedValues.layoutSpiral;
            }
            if (typedValues.layoutTimeInterval !== undefined) {
                layout.timeInterval = typedValues.layoutTimeInterval;
            }

            if (typedValues.layoutFontSizeMin !== undefined && typedValues.layoutFontSizeMax !== undefined) {
                const fontSize = [typedValues.layoutFontSizeMin, typedValues.layoutFontSizeMax];
                layout.fontSize = fontSize;
                options.fontSize = fontSize;
            }

            if (typedValues.width !== undefined && typedValues.height !== undefined) {
                layout.size = [typedValues.width, typedValues.height];
            }

            if (Object.keys(layout).length > 0) {
                options.layout = layout;
            }

            const style = parseStyle(typedValues.styleJson);
            if (style) {
                options.style = style;
            }

            onConfirm(removeDataProperty(options));
        }).catch(() => {
            // validation failed
        });
    };

    return (
            <Modal
                    title="Insert Word Cloud Embed"
                    open={open}
                    onOk={handleOk}
                    onCancel={onCancel}
                    destroyOnHidden
            >
                <Typography.Paragraph type="secondary">
                    Configure WordCloud settings using dedicated fields. The <code>data</code> field is injected by the website backend,
                    and <code>style</code> is the only JSON blob.
                </Typography.Paragraph>
                <Form form={form} layout="vertical">
                    <Form.Item
                            name="width"
                            label={toLabelWithTooltip('Width (px)', 'Canvas width in pixels. Added explicitly because some docs omit width.')}
                            rules={[{required: true, message: 'Please enter width'}]}
                    >
                        <InputNumber min={1} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item
                            name="height"
                            label={toLabelWithTooltip('Height (px)', 'Canvas height in pixels. Added explicitly because some docs omit height.')}
                            rules={[{required: true, message: 'Please enter height'}]}
                    >
                        <InputNumber min={1} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item
                            name="textField"
                            label={toLabelWithTooltip('Text field', 'The data field name used as rendered word text.')}
                    >
                        <Input placeholder="text"/>
                    </Form.Item>
                    <Form.Item
                            name="colorField"
                            label={toLabelWithTooltip('Color field', 'Optional data field name used for color mapping.')}
                    >
                        <Input placeholder="category"/>
                    </Form.Item>
                    <Form.Item
                            name="shape"
                            label={toLabelWithTooltip('Shape', 'Overall word cloud shape.')}
                    >
                        <Select
                                options={[
                                    {label: 'Circle', value: 'circle'},
                                    {label: 'Cardioid', value: 'cardioid'},
                                    {label: 'Diamond', value: 'diamond'},
                                    {label: 'Triangle', value: 'triangle'},
                                    {label: 'Triangle Forward', value: 'triangle-forward'},
                                    {label: 'Square', value: 'square'},
                                    {label: 'Pentagon', value: 'pentagon'},
                                    {label: 'Star', value: 'star'},
                                ]}
                        />
                    </Form.Item>

                    <Typography.Title level={5} style={{marginTop: 8}}>Layout</Typography.Title>

                    <Form.Item
                            name="layoutFont"
                            label={toLabelWithTooltip('Font', 'Layout font family used when placing words.')}
                    >
                        <Input placeholder="Impact"/>
                    </Form.Item>
                    <Form.Item
                            name="layoutFontSizeMin"
                            label={toLabelWithTooltip('Minimum font size', 'Minimum font size in pixels for layout.fontSize range.')}
                            rules={[{required: true, message: 'Please enter minimum font size'}]}
                    >
                        <InputNumber min={1} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item
                            name="layoutFontSizeMax"
                            label={toLabelWithTooltip('Maximum font size', 'Maximum font size in pixels for layout.fontSize range.')}
                            dependencies={['layoutFontSizeMin']}
                            rules={[
                                {required: true, message: 'Please enter maximum font size'},
                                ({getFieldValue}) => ({
                                    validator: (_rule, value: number | undefined) => {
                                        const min = getFieldValue('layoutFontSizeMin') as number | undefined;
                                        if (min === undefined || value === undefined || value >= min) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Maximum font size must be greater than or equal to minimum font size'));
                                    },
                                }),
                            ]}
                    >
                        <InputNumber min={1} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item
                            name="layoutPadding"
                            label={toLabelWithTooltip('Word padding', 'Space between words in pixels.')}
                            rules={[{required: true, message: 'Please enter word padding'}]}
                    >
                        <InputNumber min={0} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item
                            name="layoutSpiral"
                            label={toLabelWithTooltip('Spiral', 'Placement pattern for word layout.')}
                            rules={[{required: true, message: 'Please select a spiral'}]}
                    >
                        <Select
                                options={[
                                    {label: 'Archimedean', value: 'archimedean'},
                                    {label: 'Rectangular', value: 'rectangular'},
                                ]}
                        />
                    </Form.Item>
                    <Form.Item
                            name="layoutRotate"
                            label={toLabelWithTooltip('Rotate (degrees)', 'Fixed rotation angle in degrees (optional).')}
                    >
                        <InputNumber style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item
                            name="layoutRandom"
                            label={toLabelWithTooltip('Random seed/value', 'Optional numeric random source value for deterministic layouts.')}
                    >
                        <InputNumber style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item
                            name="layoutTimeInterval"
                            label={toLabelWithTooltip('Time interval (ms)', 'Optional layout algorithm time interval in milliseconds.')}
                    >
                        <InputNumber min={0} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item
                            name="layoutImageMask"
                            label={toLabelWithTooltip('Image mask', 'Optional image URL/base64 mask path to shape the layout.')}
                    >
                        <Input placeholder="https://example.com/mask.png"/>
                    </Form.Item>

                    <Typography.Title level={5} style={{marginTop: 8}}>Style (JSON)</Typography.Title>
                    <Form.Item
                            name="styleJson"
                            label={toLabelWithTooltip('Style JSON', 'Only JSON blob field. Must be a JSON object if provided.')}
                            rules={[
                                {
                                    validator: (_rule, value: string | undefined) => {
                                        const trimmed = (value ?? '').trim();
                                        if (!trimmed) {
                                            return Promise.resolve();
                                        }
                                        try {
                                            const parsed = JSON.parse(trimmed);
                                            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                                                return Promise.reject(new Error('Style must be a JSON object'));
                                            }
                                            return Promise.resolve();
                                        } catch {
                                            return Promise.reject(new Error('Invalid JSON'));
                                        }
                                    },
                                },
                            ]}
                    >
                        <Input.TextArea rows={6} spellCheck={false} placeholder='{"fill":"#1677ff"}'/>
                    </Form.Item>
                </Form>
            </Modal>
    );
}
