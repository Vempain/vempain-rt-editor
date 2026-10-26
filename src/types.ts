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

export const HeroEmbedType = {
    IMAGE: 'image',
    VIDEO: 'video',
    CAROUSEL: 'carousel',
} as const;

export type HeroEmbedType = (typeof HeroEmbedType)[keyof typeof HeroEmbedType];

export const HeroTransition = {
    FADE: 'fade',
    SLIDE: 'slide',
} as const;

export type HeroTransition = (typeof HeroTransition)[keyof typeof HeroTransition];

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

export interface GalleryQueryParams {
    page: number;
    size: number;
    sort_by?: string;
    direction?: 'ASC' | 'DESC';
    search?: string;
}

export interface SiteFileQueryParams {
    page: number;
    size: number;
    sort_by?: string;
    direction?: 'ASC' | 'DESC';
    search?: string;
    file_type: FileTypeEnum;
    filter_column?: string;
}

export interface DataSetQueryParams {
    type?: string;
    identifier_prefix?: string;
    search?: string;
}

/**
 * A published page or file of the website that content may link to, offered by the link dialog when the host provides
 * {@link EmbedDataProviders.findInternalLinks}.
 */
export interface InternalLinkTarget {
    /** The href the link gets, for example `/pages/about` or `/file/image/2024/trip/a.jpg`; must be unique in one answer */
    href: string;
    /** Shown in the suggestion list; used as the link text when the user typed none */
    label: string;
    /** Optional kind shown next to the label, for example `page` or `file` */
    kind?: string;
}

export interface InternalLinkQueryParams {
    /** The text the user typed into the URL field; empty when the dialog opens */
    search: string;
    /** How many targets the dialog wants at most */
    limit?: number;
}

export interface EmbedDataProviders {
    findGalleries: (params: GalleryQueryParams) => Promise<PagedResponse<GalleryVO>>;
    getPagedSiteFiles: (params: SiteFileQueryParams) => Promise<PagedResponse<SiteFileResponse>>;
    getAllDataSets: (params?: DataSetQueryParams) => Promise<DataSummaryResponse[]>;
    /**
     * Internal link targets for the link dialog: the published pages and files whose title or path contain the search text. Optional;
     * without it the dialog is a plain URL field. The host decides what is offered (only what exists on the website) and builds the hrefs.
     */
    findInternalLinks?: (params: InternalLinkQueryParams) => Promise<InternalLinkTarget[]>;
}
