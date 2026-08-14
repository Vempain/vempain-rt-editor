import {Radio, Space} from 'antd';
import {useEffect, useState} from 'react';
import {FileTypeEnum, type HeroEmbedType} from '../types';
import {CommonSiteFileSelectorModal} from './CommonSiteFileSelectorModal';
import {RichEmbedGalleryEditor} from './RichEmbedGalleryEditor';

function isHeroEmbedType(value: string): value is HeroEmbedType {
    return value === 'image' || value === 'video' || value === 'carousel';
}

interface RichEmbedHeroEditorProps {
    open: boolean;
    initialId?: number;
    initialType?: HeroEmbedType;
    onConfirm: (id: number, type: HeroEmbedType) => void;
    onCancel: () => void;
}

export function RichEmbedHeroEditor({open, initialId, initialType = 'image', onConfirm, onCancel}: RichEmbedHeroEditorProps) {
    const [heroType, setHeroType] = useState<HeroEmbedType>(initialType);
    useEffect(() => {
        if (open) setHeroType(initialType);
    }, [open, initialType]);

    const handleConfirm = (id: number) => {
        onConfirm(id, heroType);
    };

    const typeSelector = (
            <Radio.Group value={heroType} onChange={(event) => {
                if (isHeroEmbedType(event.target.value)) setHeroType(event.target.value);
            }}
                         style={{marginBottom: 12}}>
                <Space>
                    <Radio value="image">Image</Radio>
                    <Radio value="video">Video</Radio>
                    <Radio value="carousel">Carousel</Radio>
                </Space>
            </Radio.Group>
    );

    const selector = heroType === 'carousel'
            ? <RichEmbedGalleryEditor
                    open={open}
                    initialId={initialId}
                    onConfirm={(id) => onConfirm(id, heroType)}
                    onCancel={onCancel}
                    extraContent={typeSelector}
            />
            : <CommonSiteFileSelectorModal
                    open={open}
                    title={`Insert Hero ${heroType === 'video' ? 'Video' : 'Image'} Embed`}
                    fileType={heroType === 'video' ? FileTypeEnum.VIDEO : FileTypeEnum.IMAGE}
                    initialId={initialId}
                    searchPlaceholder={`Search by ${heroType === 'video' ? 'video' : 'image'} file name...`}
                    emptyText={`No ${heroType === 'video' ? 'videos' : 'images'} found`}
                    extraContent={typeSelector}
                    onConfirm={handleConfirm}
                    onCancel={onCancel}
            />;

    return (
            selector
    );
}
