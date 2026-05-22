import {useEffect} from 'react';
import {Button, Form, Input, Modal, Space} from 'antd';
import {MinusCircleOutlined, PlusOutlined} from '@ant-design/icons';
import type {CollapseCarouselItem} from '../tools/embedTools';

interface RichEmbedCollapseEditorProps {
    open: boolean;
    initialItems?: CollapseCarouselItem[];
    onConfirm: (items: CollapseCarouselItem[]) => void;
    onCancel: () => void;
}

export function RichEmbedCollapseEditor({open, initialItems, onConfirm, onCancel}: RichEmbedCollapseEditorProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                items: initialItems?.length ? initialItems : [{title: '', body: ''}],
            });
        }
    }, [open, initialItems, form]);

    const handleOk = () => {
        form.validateFields().then(values => {
            onConfirm(values.items ?? []);
        }).catch(() => {
            // validation failed — stay in dialog
        });
    };

    return (
            <Modal
                    title="Insert Collapse Embed"
                    open={open}
                    onOk={handleOk}
                    onCancel={onCancel}
                    destroyOnHidden
                    width={600}
            >
                <Form form={form}>
                    <Form.List name="items">
                        {(fields, {add, remove}) => (
                                <>
                                    {fields.map(({key, name, ...restField}) => (
                                            <Space key={key} style={{display: 'flex', marginBottom: 8}} align="baseline">
                                                <Form.Item
                                                        {...restField}
                                                        name={[name, 'title']}
                                                        rules={[{required: true, message: 'Please enter a title'}]}
                                                        style={{marginBottom: 0, flex: 1}}
                                                >
                                                    <Input placeholder="Title"/>
                                                </Form.Item>
                                                <Form.Item
                                                        {...restField}
                                                        name={[name, 'body']}
                                                        rules={[{required: true, message: 'Please enter body text'}]}
                                                        style={{marginBottom: 0, flex: 2}}
                                                >
                                                    <Input.TextArea placeholder="Body" autoSize={{minRows: 1, maxRows: 4}}/>
                                                </Form.Item>
                                                <MinusCircleOutlined onClick={() => remove(name)}/>
                                            </Space>
                                    ))}
                                    <Form.Item>
                                        <Button type="dashed" onClick={() => add({title: '', body: ''})} block
                                                icon={<PlusOutlined/>}>
                                            Add Item
                                        </Button>
                                    </Form.Item>
                                </>
                        )}
                    </Form.List>
                </Form>
            </Modal>
    );
}
