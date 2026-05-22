import {FileTypeEnum} from '../types';
import {CommonSiteFileSelectorModal} from './CommonSiteFileSelectorModal';

interface RichEmbedHeroEditorProps {
    open: boolean;
    initialId?: number;
    onConfirm: (id: number) => void;
    onCancel: () => void;
}

export function RichEmbedHeroEditor({open, initialId, onConfirm, onCancel}: RichEmbedHeroEditorProps) {
    return (
            <CommonSiteFileSelectorModal
                    open={open}
                    title="Insert Hero Image Embed"
                    fileType={FileTypeEnum.IMAGE}
                    initialId={initialId}
                    searchPlaceholder="Search by image file name..."
                    emptyText="No images found"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
            />
    );
}
