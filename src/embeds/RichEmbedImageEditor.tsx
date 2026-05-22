import {FileTypeEnum} from '../types';
import {CommonSiteFileSelectorModal} from './CommonSiteFileSelectorModal';

interface RichEmbedImageEditorProps {
    open: boolean;
    initialId?: number;
    onConfirm: (id: number) => void;
    onCancel: () => void;
}

export function RichEmbedImageEditor({open, initialId, onConfirm, onCancel}: RichEmbedImageEditorProps) {
    return (
            <CommonSiteFileSelectorModal
                    open={open}
                    title="Insert Image Embed"
                    fileType={FileTypeEnum.IMAGE}
                    initialId={initialId}
                    searchPlaceholder="Search by image file name..."
                    emptyText="No images found"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
            />
    );
}
