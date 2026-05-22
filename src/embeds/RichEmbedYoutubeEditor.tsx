import {useEffect} from 'react';
import {Form, Input, Modal} from 'antd';

interface RichEmbedYoutubeEditorProps {
    open: boolean;
    initialUrl?: string;
    onConfirm: (url: string) => void;
    onCancel: () => void;
}

export function RichEmbedYoutubeEditor({open, initialUrl, onConfirm, onCancel}: RichEmbedYoutubeEditorProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({url: initialUrl ?? ''});
        }
    }, [open, initialUrl, form]);

    const handleOk = () => {
        form.validateFields().then((values) => {
            onConfirm(values.url.trim());
        }).catch(() => {
            // validation failed
        });
    };

    return (
            <Modal
                    title="Insert YouTube Embed"
                    open={open}
                    onOk={handleOk}
                    onCancel={onCancel}
                    destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                            name="url"
                            label="YouTube URL"
                            rules={[
                                {required: true, message: 'Please enter a YouTube URL'},
                                {
                                    validator: async (_rule, value) => {
                                        const input = (value ?? '').trim();
                                        if (!input) return;
                                        try {
                                            const parsed = new URL(input);
                                            const host = parsed.hostname.toLowerCase();
                                            if (
                                                    host === 'youtube.com' ||
                                                    host.endsWith('.youtube.com') ||
                                                    host === 'youtu.be' ||
                                                    host.endsWith('.youtu.be')
                                            ) {
                                                return;
                                            }
                                        } catch {
                                            // invalid url
                                        }
                                        return Promise.reject('Please enter a valid YouTube URL');
                                    },
                                },
                            ]}
                    >
                        <Input placeholder="https://www.youtube.com/watch?v=..."/>
                    </Form.Item>
                </Form>
            </Modal>
    );
}

