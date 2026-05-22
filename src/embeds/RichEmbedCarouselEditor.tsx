import {useEffect} from 'react';
import {Button, Form, Input, InputNumber, Modal, Space, Switch} from 'antd';
import {MinusCircleOutlined, PlusOutlined} from '@ant-design/icons';
import type {CollapseCarouselItem} from '../tools/embedTools';

interface RichEmbedCarouselEditorProps {
    open: boolean;
    initialItems?: CollapseCarouselItem[];
    initialAutoplay?: boolean;
    initialDotDuration?: boolean;
    initialSpeed?: number;
    onConfirm: (items: CollapseCarouselItem[], autoplay: boolean, dotDuration: boolean, speed: number) => void;
    onCancel: () => void;
}

export function RichEmbedCarouselEditor({
                                            open,
                                            initialItems,
                                            initialAutoplay = false,
                                            initialDotDuration = false,
                                            initialSpeed = 500,
                                            onConfirm,
                                            onCancel,
                                        }: RichEmbedCarouselEditorProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                items: initialItems?.length ? initialItems : [{title: '', body: ''}],
                autoplay: initialAutoplay,
                dotDuration: initialDotDuration,
                speed: initialSpeed,
            });
        }
    }, [open, initialItems, initialAutoplay, initialDotDuration, initialSpeed, form]);

    const handleOk = () => {
        form.validateFields().then(values => {
            onConfirm(
                    values.items ?? [],
                    values.autoplay ?? false,
                    values.dotDuration ?? false,
                    values.speed ?? 500,
            );
        }).catch(() => {
            // validation failed — stay in dialog
        });
    };

    return (
            <Modal
                    title="Insert Carousel Embed"
                    open={open}
                    onOk={handleOk}
                    onCancel={onCancel}
                    destroyOnHidden
                    width={600}
            >
                <Form form={form} layout="vertical">
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
                    <Form.Item name="autoplay" label="Autoplay" valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                    <Form.Item name="dotDuration" label="Dot Duration" valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                    <Form.Item name="speed" label="Transition Speed (ms)">
                        <InputNumber min={100} max={10000} style={{width: '100%'}}/>
                    </Form.Item>
                </Form>
            </Modal>
    );
}
