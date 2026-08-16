import {type ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Modal, Select, Spin} from 'antd';
import type {GalleryVO} from '../types';
import {useEmbedDataProviders} from './EmbedDataContext';

interface RichEmbedGalleryEditorProps {
    open: boolean;
    initialId?: number;
    onConfirm: (id: number) => void;
    onCancel: () => void;
    extraContent?: ReactNode;
}

export function getNextGalleryPage(scrollTop: number, clientHeight: number, scrollHeight: number, currentPage: number, totalPages: number): number | null {
    if (scrollTop + clientHeight < scrollHeight - 8 || currentPage + 1 >= totalPages) {
        return null;
    }
    return currentPage + 1;
}

export function requestNextGalleryPage(
        scrollTop: number,
        clientHeight: number,
        scrollHeight: number,
        currentPage: number,
        totalPages: number,
        loadPage: (page: number) => void,
): void {
    const nextPage = getNextGalleryPage(scrollTop, clientHeight, scrollHeight, currentPage, totalPages);
    if (nextPage !== null) {
        loadPage(nextPage);
    }
}

export function handleGalleryPopupScroll(
        scrollTop: number,
        clientHeight: number,
        scrollHeight: number,
        currentPage: number,
        totalPages: number,
        loading: boolean,
        loadPage: (page: number) => void,
): void {
    if (!loading) {
        requestNextGalleryPage(scrollTop, clientHeight, scrollHeight, currentPage, totalPages, loadPage);
    }
}

export function RichEmbedGalleryEditor({open, initialId, onConfirm, onCancel, extraContent}: RichEmbedGalleryEditorProps) {
    const {findGalleries} = useEmbedDataProviders();
    const [galleries, setGalleries] = useState<GalleryVO[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | undefined>(initialId);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const requestId = useRef(0);
    const loadingRef = useRef(false);

    const loadGalleries = useCallback(async (page: number, search: string, append: boolean) => {
        if (append && loadingRef.current) {
            return;
        }

        const currentRequestId = ++requestId.current;
        loadingRef.current = true;
        setLoading(true);
        try {
            const response = await findGalleries({
                page,
                size: 50,
                sort_by: 'short_name',
                direction: 'ASC',
                search: search || undefined,
            });
            if (currentRequestId !== requestId.current) {
                return;
            }
            setGalleries(current => append ? [...current, ...response.content] : response.content);
            setCurrentPage(response.page);
            setTotalPages(response.total_pages);
            setLoadError(null);
        } catch {
            if (currentRequestId === requestId.current) {
                setLoadError('Failed to load galleries. Please try again.');
            }
        } finally {
            if (currentRequestId === requestId.current) {
                loadingRef.current = false;
                setLoading(false);
            }
        }
    }, [findGalleries]);

    useEffect(() => {
        if (open) {
            setSelectedId(initialId);
            setGalleries([]);
            setCurrentPage(0);
            setTotalPages(0);
            setSearchTerm('');
            setLoadError(null);
            void loadGalleries(0, '', false);
        }
    }, [open, initialId, loadGalleries]);

    function handleSearch(search: string): void {
        setSearchTerm(search);
        void loadGalleries(0, search, false);
    }

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
                    {loadError && <Alert type="error" title={loadError} style={{marginBottom: 8}}/>}
                    {extraContent}
                    <Select
                            value={selectedId}
                            onChange={setSelectedId}
                            options={galleries.map(g => ({label: g.short_name, value: g.id}))}
                            showSearch
                            filterOption={false}
                            onSearch={handleSearch}
                            onPopupScroll={(event) => handleGalleryPopupScroll(
                                    event.currentTarget.scrollTop,
                                    event.currentTarget.clientHeight,
                                    event.currentTarget.scrollHeight,
                                    currentPage,
                                    totalPages,
                                    loadingRef.current,
                                    (nextPage) => void loadGalleries(nextPage, searchTerm, true),
                            )}
                            loading={loading}
                            style={{width: '100%'}}
                            placeholder="Select a gallery"
                            disabled={loadError != null}
                    />
                </Spin>
            </Modal>
    );
}
