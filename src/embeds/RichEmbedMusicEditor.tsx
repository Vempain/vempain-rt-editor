import {useEffect} from 'react';
import {Form, Input, Modal} from 'antd';

interface RichEmbedMusicEditorProps {
    open: boolean;
    initialIdentifier?: string;
    onConfirm: (identifier: string) => void;
    onCancel: () => void;
}

const IDENTIFIER_REGEX = /^[a-z][a-z0-9_]*$/;

export function RichEmbedMusicEditor({
                                         open,
                                         initialIdentifier = 'music_library',
                                         onConfirm,
                                         onCancel,
                                     }: RichEmbedMusicEditorProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({identifier: initialIdentifier || 'music_library'});
        }
    }, [open, initialIdentifier, form]);

    const handleOk = () => {
        form.validateFields().then((values) => {
            onConfirm(values.identifier.trim());
        }).catch(() => {
            // validation failed
        });
    };

    return (
            <Modal
                    title="Insert Music Data Embed"
                    open={open}
                    onOk={handleOk}
                    onCancel={onCancel}
                    destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                            name="identifier"
                            label="Data set identifier"
                            extra="By default the music embed uses the published music_library data set."
                            rules={[
                                {required: true, message: 'Please enter the music data set identifier'},
                                {
                                    validator: (_, value: string) => {
                                        if (IDENTIFIER_REGEX.test(value.trim())) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Identifier must start with a lowercase letter and contain only lowercase letters, numbers, and underscores'));
                                    }
                                }
                            ]}
                    >
                        <Input placeholder="music_library"/>
                    </Form.Item>
                </Form>
            </Modal>
    );
}

