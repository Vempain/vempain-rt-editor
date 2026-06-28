import {Alert, Modal, Select, Spin} from 'antd';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {DataSummaryResponse} from '../types';
import {useEmbedDataProviders} from './EmbedDataContext';

interface CommonDataSetSelectorModalProps {
    open: boolean;
    title: string;
    datasetType?: string;
    identifierPrefix?: string;
    serverSearchTerm?: string;
    initialIdentifier?: string;
    searchPlaceholder: string;
    emptyText: string;
    onConfirm: (identifier: string) => void;
    onCancel: () => void;
}

export function CommonDataSetSelectorModal({
                                               open,
                                               title,
                                               datasetType,
                                               identifierPrefix,
                                               serverSearchTerm,
                                               initialIdentifier,
                                               searchPlaceholder,
                                               emptyText,
                                               onConfirm,
                                               onCancel,
                                           }: CommonDataSetSelectorModalProps) {
    const {getAllDataSets} = useEmbedDataProviders();
    const [items, setItems] = useState<DataSummaryResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedIdentifier, setSelectedIdentifier] = useState<string | undefined>(initialIdentifier);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setLoadError(null);

        try {
            const response = await getAllDataSets({
                type: datasetType,
                identifier_prefix: identifierPrefix,
                search: serverSearchTerm?.trim() || undefined,
            });
            setItems(response);
        } catch {
            setLoadError('Failed to load data sets. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [datasetType, identifierPrefix, serverSearchTerm, getAllDataSets]);

    useEffect(() => {
        if (!open) {
            return;
        }
        setSelectedIdentifier(initialIdentifier);
        setSearchQuery('');
        void fetchItems();
    }, [open, initialIdentifier, fetchItems]);

    const filteredItems = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        if (normalizedQuery === '') {
            return items;
        }

        return items.filter((item) => {
            const haystack = [item.identifier, item.description, item.type]
                    .filter((value): value is string => Boolean(value))
                    .join(' ')
                    .toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [items, searchQuery]);

    const selectedLabel = useMemo(() => {
        const found = items.find((item) => item.identifier === selectedIdentifier);
        return found ? `${found.identifier}${found.description ? ` — ${found.description}` : ''}` : selectedIdentifier;
    }, [items, selectedIdentifier]);

    return (
            <Modal
                    title={title}
                    open={open}
                    onOk={() => selectedIdentifier != null && onConfirm(selectedIdentifier)}
                    okButtonProps={{disabled: selectedIdentifier == null || loadError != null}}
                    onCancel={onCancel}
                    destroyOnHidden
            >
                <Spin spinning={loading}>
                    {loadError && <Alert type="error" title={loadError} style={{marginBottom: 8}}/>}
                    {selectedLabel && (
                            <div style={{marginBottom: 8}}>
                                <strong>Selected:</strong> {selectedLabel}
                            </div>
                    )}
                    <Select
                            value={selectedIdentifier}
                            onChange={setSelectedIdentifier}
                            showSearch
                            searchValue={searchQuery}
                            onSearch={setSearchQuery}
                            filterOption={false}
                            style={{width: '100%'}}
                            placeholder={searchPlaceholder}
                            disabled={loadError != null}
                            notFoundContent={!loading ? emptyText : null}
                            optionLabelProp="label"
                    >
                        {filteredItems.map((item) => (
                                <Select.Option
                                        key={item.identifier}
                                        value={item.identifier}
                                        label={item.identifier}
                                >
                                    <div>{item.identifier}</div>
                                    {item.description && (
                                            <div style={{fontSize: '0.85em', color: '#999'}}>{item.description}</div>
                                    )}
                                </Select.Option>
                        ))}
                    </Select>
                </Spin>
            </Modal>
    );
}
