import {useEffect} from 'react';
import {Form, InputNumber, Modal, Select} from 'antd';
import type {LastEmbedType} from '../tools/embedTools';

interface RichEmbedLastEditorProps {
    open: boolean;
    initialType?: LastEmbedType;
    initialCount?: number;
    onConfirm: (type: LastEmbedType, count: number) => void;
    onCancel: () => void;
}

const LAST_TYPE_OPTIONS: { label: string; value: LastEmbedType }[] = [
    {label: 'Pages', value: 'pages'},
    {label: 'Galleries', value: 'galleries'},
    {label: 'Images', value: 'images'},
    {label: 'Videos', value: 'videos'},
    {label: 'Audio', value: 'audio'},
    {label: 'Documents', value: 'documents'},
];

export function RichEmbedLastEditor({
                                        open,
                                        initialType = 'pages',
                                        initialCount = 5,
                                        onConfirm,
                                        onCancel,
                                    }: RichEmbedLastEditorProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({type: initialType, count: initialCount});
        }
    }, [open, initialType, initialCount, form]);

    const handleOk = () => {
        form.validateFields().then((values) => {
            onConfirm(values.type, values.count);
        }).catch(() => {
            // validation failed
        });
    };

    return (
            <Modal
                    title="Insert Last Items Embed"
                    open={open}
                    onOk={handleOk}
                    onCancel={onCancel}
                    destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                            name="type"
                            label="Resource Type"
                            rules={[{required: true, message: 'Please select a type'}]}
                    >
                        <Select options={LAST_TYPE_OPTIONS}/>
                    </Form.Item>
                    <Form.Item
                            name="count"
                            label="Count"
                            rules={[{required: true, message: 'Please enter count'}]}
                    >
                        <InputNumber min={1} max={100} style={{width: '100%'}}/>
                    </Form.Item>
                </Form>
            </Modal>
    );
}
