export const FileTypeEnum = {
    ARCHIVE: 'ARCHIVE',
    AUDIO: 'AUDIO',
    BINARY: 'BINARY',
    DATA: 'DATA',
    DOCUMENT: 'DOCUMENT',
    EXECUTABLE: 'EXECUTABLE',
    FONT: 'FONT',
    ICON: 'ICON',
    IMAGE: 'IMAGE',
    INTERACTIVE: 'INTERACTIVE',
    THUMB: 'THUMB',
    UNKNOWN: 'UNKNOWN',
    VECTOR: 'VECTOR',
    VIDEO: 'VIDEO',
} as const;

export type FileTypeEnum = (typeof FileTypeEnum)[keyof typeof FileTypeEnum];

export const QueryDetailEnum = {
    MINIMAL: 'MINIMAL',
    UNPOPULATED: 'UNPOPULATED',
    FULL: 'FULL',
} as const;

export type QueryDetailEnum = (typeof QueryDetailEnum)[keyof typeof QueryDetailEnum];

export interface GalleryVO {
    id: number;
    short_name: string;
}

export interface SiteFileResponse {
    id: number;
    file_name: string;
}

export interface DataSummaryResponse {
    identifier: string;
    type?: string;
    description?: string | null;
}

export interface PagedResponse<T> {
    content: T[];
    page: number;
    total_pages: number;
}

export interface DataSetQueryParams {
    type?: string;
    identifier_prefix?: string;
    search?: string;
}

export interface EmbedDataProviders {
    findGalleries: (params: { details: QueryDetailEnum }) => Promise<GalleryVO[]>;
    getPagedSiteFiles: (params: Record<string, string | number | boolean | undefined>) => Promise<PagedResponse<SiteFileResponse>>;
    getAllDataSets: (params?: DataSetQueryParams) => Promise<DataSummaryResponse[]>;
}

