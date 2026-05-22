import {FileTypeEnum} from '../types';
import {CommonSiteFileSelectorModal} from './CommonSiteFileSelectorModal';

interface RichEmbedVideoEditorProps {
    open: boolean;
    initialId?: number;
    onConfirm: (id: number) => void;
    onCancel: () => void;
}

export function RichEmbedVideoEditor({open, initialId, onConfirm, onCancel}: RichEmbedVideoEditorProps) {
    return (
            <CommonSiteFileSelectorModal
                    open={open}
                    title="Insert Video Embed"
                    fileType={FileTypeEnum.VIDEO}
                    initialId={initialId}
                    searchPlaceholder="Search by video file name..."
                    emptyText="No videos found"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
            />
    );
}
