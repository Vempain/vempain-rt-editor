import {useEffect, useMemo} from 'react';
import {Form, Input, Modal, Typography} from 'antd';
import type {WordCloudEmbedOptions} from '../tools/embedTools';

interface RichEmbedWordCloudEditorProps {
    open: boolean;
    initialOptions?: WordCloudEmbedOptions;
    onConfirm: (options: WordCloudEmbedOptions) => void;
    onCancel: () => void;
}

const DEFAULT_WORD_CLOUD_OPTIONS: WordCloudEmbedOptions = {
    shape: 'circle',
    fontSize: [14, 56],
    spiral: 'rectangular',
    padding: 1,
};

function removeDataProperty(options: WordCloudEmbedOptions): WordCloudEmbedOptions {
    const rest = {...options};
    delete rest.data;
    return rest;
}

export function RichEmbedWordCloudEditor({
                                             open,
                                             initialOptions,
                                             onConfirm,
                                             onCancel,
                                         }: RichEmbedWordCloudEditorProps) {
    const [form] = Form.useForm();

    const initialJson = useMemo(
            () => JSON.stringify(removeDataProperty(initialOptions ?? DEFAULT_WORD_CLOUD_OPTIONS), null, 2),
            [initialOptions],
    );

    useEffect(() => {
        if (open) {
            form.setFieldsValue({options_json: initialJson});
        }
    }, [form, initialJson, open]);

    const handleOk = () => {
        form.validateFields().then((values) => {
            const parsed = JSON.parse(values.options_json) as WordCloudEmbedOptions;
            onConfirm(removeDataProperty(parsed));
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
                    Set Ant Design WordCloud options as JSON. The <code>data</code> field is injected by the website backend.
                </Typography.Paragraph>
                <Form form={form} layout="vertical">
                    <Form.Item
                            name="options_json"
                            label="Word cloud options JSON"
                            rules={[
                                {required: true, message: 'Please enter options JSON'},
                                {
                                    validator: (_rule, value: string) => {
                                        try {
                                            const parsed = JSON.parse(value);
                                            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                                                return Promise.reject(new Error('Options must be a JSON object'));
                                            }

                                            if ('data' in (parsed as Record<string, unknown>)) {
                                                return Promise.reject(new Error('Do not include data in options'));
                                            }

                                            return Promise.resolve();
                                        } catch {
                                            return Promise.reject(new Error('Invalid JSON'));
                                        }
                                    },
                                },
                            ]}
                    >
                        <Input.TextArea rows={10} spellCheck={false}/>
                    </Form.Item>
                </Form>
            </Modal>
    );
}
