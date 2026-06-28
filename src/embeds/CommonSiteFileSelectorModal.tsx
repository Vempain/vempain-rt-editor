import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Input, Modal, Spin} from 'antd';
import VirtualList from 'rc-virtual-list';
import {useEmbedDataProviders} from './EmbedDataContext';
import type {FileTypeEnum, SiteFileResponse} from '../types';

const PAGE_SIZE = 50;
const FILTER_COLUMN = 'fileName';
const SORT_BY = 'fileName';
const SORT_DIRECTION = 'ASC';
const LIST_HEIGHT = 320;
const ITEM_HEIGHT = 36;

interface CommonSiteFileSelectorModalProps {
    open: boolean;
    title: string;
    fileType: FileTypeEnum;
    initialId?: number;
    searchPlaceholder: string;
    emptyText: string;
    onConfirm: (id: number) => void;
    onCancel: () => void;
}

export function CommonSiteFileSelectorModal({
                                                open,
                                                title,
                                                fileType,
                                                initialId,
                                                searchPlaceholder,
                                                emptyText,
                                                onConfirm,
                                                onCancel,
                                            }: CommonSiteFileSelectorModalProps) {
    const {getPagedSiteFiles} = useEmbedDataProviders();
    const [items, setItems] = useState<SiteFileResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | undefined>(initialId);
    const [searchQuery, setSearchQuery] = useState('');

    const pageRef = useRef(0);
    const totalPagesRef = useRef(0);
    const loadingMoreRef = useRef(false);
    const searchQueryRef = useRef('');

    const selectedLabel = useMemo(() => {
        const found = items.find((f) => f.id === selectedId);
        return found ? found.file_name : selectedId != null ? `#${selectedId}` : undefined;
    }, [items, selectedId]);

    const fetchItems = useCallback(async (pageNumber = 0, append = false, query = '') => {
        if (append) {
            setLoadingMore(true);
            loadingMoreRef.current = true;
        } else {
            setLoading(true);
        }
        setLoadError(null);

        try {
            const trimmed = query.trim();
            const params: Record<string, string | number> = {
                page_size: PAGE_SIZE,
                page_number: pageNumber,
                file_type: fileType,
                sort_by: SORT_BY,
                direction: SORT_DIRECTION,
                filter: trimmed,
                filter_column: FILTER_COLUMN,
            };
            const response = await getPagedSiteFiles(params);
            pageRef.current = response.page;
            totalPagesRef.current = response.total_pages;
            setItems((prev) => {
                const next = append ? new Map(prev.map((item) => [item.id, item])) : new Map<number, SiteFileResponse>();
                (response.content ?? []).forEach((item) => next.set(item.id, item));
                return Array.from(next.values());
            });
        } catch {
            setLoadError('Failed to load site files. Please try again.');
        } finally {
            if (append) {
                setLoadingMore(false);
                loadingMoreRef.current = false;
            } else {
                setLoading(false);
            }
        }
    }, [fileType, getPagedSiteFiles]);

    useEffect(() => {
        if (open) {
            setSelectedId(initialId);
            setSearchQuery('');
            searchQueryRef.current = '';
            pageRef.current = 0;
            totalPagesRef.current = 0;
            void fetchItems(0, false, '');
        }
    }, [open, initialId, fetchItems]);

    const handleVirtualScroll: React.UIEventHandler<HTMLElement> = (event) => {
        const target = event.currentTarget;
        if (loadingMoreRef.current) {
            return;
        }
        const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 20;
        if (nearBottom && pageRef.current + 1 < totalPagesRef.current) {
            void fetchItems(pageRef.current + 1, true, searchQueryRef.current);
        }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchQuery(value);
        searchQueryRef.current = value;
        pageRef.current = 0;
        totalPagesRef.current = 0;
        void fetchItems(0, false, value);
    };

    return (
            <Modal
                    title={title}
                    open={open}
                    onOk={() => selectedId != null && onConfirm(selectedId)}
                    okButtonProps={{disabled: selectedId == null || loadError != null}}
                    onCancel={onCancel}
                    destroyOnHidden={true}
            >
                <Spin spinning={loading}>
                    {loadError && <Alert type="error" title={loadError} style={{marginBottom: 8}}/>}
                    {selectedLabel && (
                            <div style={{marginBottom: 8}}>
                                <strong>Selected:</strong> {selectedLabel}
                            </div>
                    )}
                    <Input.Search
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={handleSearch}
                            allowClear
                            style={{marginBottom: 8}}
                    />
                    <VirtualList
                            data={items}
                            height={LIST_HEIGHT}
                            itemHeight={ITEM_HEIGHT}
                            itemKey="id"
                            onScroll={handleVirtualScroll}
                    >
                        {(item) => (
                                <div
                                        key={item.id}
                                        style={{
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            background: item.id === selectedId ? '#1a3a5c' : undefined,
                                            borderBottom: '1px solid #303030',
                                        }}
                                        onClick={() => setSelectedId(item.id)}
                                >
                                    {item.file_name}
                                </div>
                        )}
                    </VirtualList>
                    {!loading && items.length === 0 && (
                            <div style={{padding: '8px 12px', color: '#999'}}>{emptyText}</div>
                    )}
                    {loadingMore && (
                            <div style={{padding: '8px 12px', textAlign: 'center'}}>
                                <Spin size="small"/>
                            </div>
                    )}
                </Spin>
            </Modal>
    );
}
