import {useEffect, useState} from 'react';
import {Alert, Modal, Select, Spin} from 'antd';
import {type GalleryVO, QueryDetailEnum} from '../types';
import {useEmbedDataProviders} from './EmbedDataContext';

interface RichEmbedGalleryEditorProps {
    open: boolean;
    initialId?: number;
    onConfirm: (id: number) => void;
    onCancel: () => void;
}

export function RichEmbedGalleryEditor({open, initialId, onConfirm, onCancel}: RichEmbedGalleryEditorProps) {
    const {findGalleries} = useEmbedDataProviders();
    const [galleries, setGalleries] = useState<GalleryVO[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | undefined>(initialId);

    useEffect(() => {
        if (open) {
            setSelectedId(initialId);
            setLoadError(null);
            setLoading(true);
            findGalleries({details: QueryDetailEnum.MINIMAL})
                    .then(setGalleries)
                    .catch((error) => {
                        console.error(error);
                        setLoadError('Failed to load galleries. Please try again.');
                    })
                    .finally(() => setLoading(false));
        }
    }, [open, initialId, findGalleries]);

    return (
            <Modal
                    title="Insert Gallery Embed"
                    open={open}
                    onOk={() => selectedId != null && onConfirm(selectedId)}
                    okButtonProps={{disabled: selectedId == null || loadError != null}}
                    onCancel={onCancel}
                    destroyOnHidden
            >
                <Spin spinning={loading}>
                    {loadError && <Alert type="error" message={loadError} style={{marginBottom: 8}}/>}
                    <Select
                            value={selectedId}
                            onChange={setSelectedId}
                            options={galleries.map(g => ({label: g.short_name, value: g.id}))}
                            showSearch
                            optionFilterProp="label"
                            style={{width: '100%'}}
                            placeholder="Select a gallery"
                            disabled={loadError != null}
                    />
                </Spin>
            </Modal>
    );
}
