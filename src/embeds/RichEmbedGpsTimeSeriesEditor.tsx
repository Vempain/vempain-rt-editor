import {CommonDataSetSelectorModal} from './CommonDataSetSelectorModal';

interface RichEmbedGpsTimeSeriesEditorProps {
    open: boolean;
    initialIdentifier?: string;
    onConfirm: (identifier: string) => void;
    onCancel: () => void;
}

export function RichEmbedGpsTimeSeriesEditor({
                                                 open,
                                                 initialIdentifier,
                                                 onConfirm,
                                                 onCancel,
                                             }: RichEmbedGpsTimeSeriesEditorProps) {
    return (
            <CommonDataSetSelectorModal
                    open={open}
                    title="Insert GPS Time Series Embed"
                    datasetType="time_series"
                    serverSearchTerm="gps"
                    initialIdentifier={initialIdentifier}
                    searchPlaceholder="Select or search a GPS time series data set"
                    emptyText="No GPS time series data sets found"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
            />
    );
}

