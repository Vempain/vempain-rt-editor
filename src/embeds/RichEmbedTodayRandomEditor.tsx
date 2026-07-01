import {useEffect, useMemo} from 'react';
import {Form, Input, Modal, Typography} from 'antd';
import type {TodayRandomEmbedOptions} from '../tools/embedTools';

interface RichEmbedTodayRandomEditorProps {
    open: boolean;
    initialOptions?: TodayRandomEmbedOptions;
    onConfirm: (options: TodayRandomEmbedOptions) => void;
    onCancel: () => void;
}

const DEFAULT_TODAY_RANDOM_OPTIONS: TodayRandomEmbedOptions = {
    title: 'On this day',
};

function removeInjectedData(options: TodayRandomEmbedOptions): TodayRandomEmbedOptions {
    const rest = {...options};
    delete rest.images;
    delete rest.pages;
    return rest;
}

export function RichEmbedTodayRandomEditor({
                                               open,
                                               initialOptions,
                                               onConfirm,
                                               onCancel,
                                           }: RichEmbedTodayRandomEditorProps) {
    const [form] = Form.useForm();

    const initialJson = useMemo(
            () => JSON.stringify(removeInjectedData(initialOptions ?? DEFAULT_TODAY_RANDOM_OPTIONS), null, 2),
            [initialOptions],
    );

    useEffect(() => {
        if (open) {
            form.setFieldsValue({options_json: initialJson});
        }
    }, [form, initialJson, open]);

    const handleOk = () => {
        form.validateFields().then((values) => {
            const parsed = JSON.parse(values.options_json) as TodayRandomEmbedOptions;
            onConfirm(removeInjectedData(parsed));
        }).catch(() => {
            // validation failed
        });
    };

    return (
            <Modal
                    title="Insert Today Random Embed"
                    open={open}
                    onOk={handleOk}
                    onCancel={onCancel}
                    destroyOnHidden
            >
                <Typography.Paragraph type="secondary">
                    Set embed options as JSON. The <code>images</code> and <code>pages</code> fields are injected by the website backend.
                </Typography.Paragraph>
                <Form form={form} layout="vertical">
                    <Form.Item
                            name="options_json"
                            label="Today random options JSON"
                            rules={[
                                {required: true, message: 'Please enter options JSON'},
                                {
                                    validator: (_rule, value: string) => {
                                        try {
                                            const parsed = JSON.parse(value);
                                            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                                                return Promise.reject(new Error('Options must be a JSON object'));
                                            }

                                            if ('images' in (parsed as Record<string, unknown>) || 'pages' in (parsed as Record<string, unknown>)) {
                                                return Promise.reject(new Error('Do not include images or pages in options'));
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
