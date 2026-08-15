import {InputNumber, Radio, Select, Space} from 'antd';
import {useEffect, useState} from 'react';
import {FileTypeEnum, type HeroEmbedType, HeroTransition, type HeroTransition as HeroTransitionType} from '../types';
import {CommonSiteFileSelectorModal} from './CommonSiteFileSelectorModal';
import {RichEmbedGalleryEditor} from './RichEmbedGalleryEditor';

function isHeroEmbedType(value: string): value is HeroEmbedType {
    return value === 'image' || value === 'video' || value === 'carousel';
}

interface RichEmbedHeroEditorProps {
    open: boolean;
    initialId?: number;
    initialType?: HeroEmbedType;
    initialDuration?: number;
    initialTransition?: HeroTransitionType;
    onConfirm: (id: number, type: HeroEmbedType, duration: number, transition: HeroTransitionType) => void;
    onCancel: () => void;
}

export function RichEmbedHeroEditor({
                                        open,
                                        initialId,
                                        initialType = 'image',
                                        initialDuration = 5,
                                        initialTransition = HeroTransition.SLIDE,
                                        onConfirm,
                                        onCancel,
                                    }: RichEmbedHeroEditorProps) {
    const [heroType, setHeroType] = useState<HeroEmbedType>(initialType);
    const [duration, setDuration] = useState(initialDuration);
    const [transition, setTransition] = useState<HeroTransitionType>(initialTransition);
    useEffect(() => {
        if (open) {
            setHeroType(initialType);
            setDuration(initialDuration);
            setTransition(initialTransition);
        }
    }, [open, initialDuration, initialTransition, initialType]);

    const handleConfirm = (id: number) => {
        onConfirm(id, heroType, duration, transition);
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
    const carouselOptions = heroType === 'carousel' && (
            <Space style={{display: 'flex', marginBottom: 12}}>
                <InputNumber min={1} max={3600} value={duration} addonBefore="Seconds"
                             onChange={(value) => value != null && setDuration(value)}/>
                <Select
                        value={transition}
                        options={[
                            {label: 'Slide transition', value: HeroTransition.SLIDE},
                            {label: 'Fade transition', value: HeroTransition.FADE},
                        ]}
                        onChange={setTransition}
                />
            </Space>
    );
    const selectorContent = <>{typeSelector}{carouselOptions}</>;

    const selector = heroType === 'carousel'
            ? <RichEmbedGalleryEditor
                    open={open}
                    initialId={initialId}
                    onConfirm={(id) => onConfirm(id, heroType, duration, transition)}
                    onCancel={onCancel}
                    extraContent={selectorContent}
            />
            : <CommonSiteFileSelectorModal
                    open={open}
                    title={`Insert Hero ${heroType === 'video' ? 'Video' : 'Image'} Embed`}
                    fileType={heroType === 'video' ? FileTypeEnum.VIDEO : FileTypeEnum.IMAGE}
                    initialId={initialId}
                    searchPlaceholder={`Search by ${heroType === 'video' ? 'video' : 'image'} file name...`}
                    emptyText={`No ${heroType === 'video' ? 'videos' : 'images'} found`}
                    extraContent={selectorContent}
                    onConfirm={handleConfirm}
                    onCancel={onCancel}
            />;

    return (
            selector
    );
}
