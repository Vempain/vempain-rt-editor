import {FileTypeEnum} from '../types';
import {CommonSiteFileSelectorModal} from './CommonSiteFileSelectorModal';

interface RichEmbedAudioEditorProps {
    open: boolean;
    initialId?: number;
    onConfirm: (id: number) => void;
    onCancel: () => void;
}

export function RichEmbedAudioEditor({open, initialId, onConfirm, onCancel}: RichEmbedAudioEditorProps) {
    return (
            <CommonSiteFileSelectorModal
                    open={open}
                    title="Insert Audio Embed"
                    fileType={FileTypeEnum.AUDIO}
                    initialId={initialId}
                    searchPlaceholder="Search by audio file name..."
                    emptyText="No audio files found"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
            />
    );
}
