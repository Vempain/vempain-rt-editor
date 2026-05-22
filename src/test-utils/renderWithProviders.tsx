/**
 * Shared render helper that wraps a component with the EmbedDataProvider
 * and a set of mock data-provider callbacks.
 */
import React from 'react';
import {render, type RenderOptions} from '@testing-library/react';
import {EmbedDataProvider} from '../embeds/EmbedDataContext';
import type {DataSummaryResponse, EmbedDataProviders, GalleryVO, PagedResponse, SiteFileResponse} from '../types';

export const mockGalleries: GalleryVO[] = [
    {id: 1, short_name: 'Summer 2023'},
    {id: 2, short_name: 'Winter 2024'},
    {id: 3, short_name: 'Spring Flowers'},
];

export const mockSiteFiles: SiteFileResponse[] = [
    {id: 10, file_name: 'photo-01.jpg'},
    {id: 11, file_name: 'photo-02.jpg'},
    {id: 12, file_name: 'video-01.mp4'},
];

export const mockDataSets: DataSummaryResponse[] = [
    {identifier: 'gps_timeseries_2023', type: 'time_series', description: 'GPS 2023 track'},
    {identifier: 'gps_timeseries_2024', type: 'time_series', description: 'GPS 2024 track'},
    {identifier: 'music_library', type: 'music', description: 'Main music library'},
];

/**
 * A looser provider type that allows jest.fn() mocks without requiring exact
 * return-type constraints (jest 30 strict generics).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseProviderOverrides = Partial<Record<keyof EmbedDataProviders, (...args: any[]) => any>>;

function buildDefaultProviders(overrides?: LooseProviderOverrides): EmbedDataProviders {
    return {
        findGalleries: jest.fn<EmbedDataProviders['findGalleries']>().mockResolvedValue(mockGalleries),
        getPagedSiteFiles: jest.fn<EmbedDataProviders['getPagedSiteFiles']>().mockResolvedValue({
            content: mockSiteFiles,
            page: 0,
            total_pages: 1,
        } as PagedResponse<SiteFileResponse>),
        getAllDataSets: jest.fn<EmbedDataProviders['getAllDataSets']>().mockResolvedValue(mockDataSets),
        ...(overrides as Partial<EmbedDataProviders>),
    } as EmbedDataProviders;
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
    providerOverrides?: LooseProviderOverrides;
}

export function renderWithProviders(
        ui: React.ReactElement,
        {providerOverrides, ...renderOptions}: RenderWithProvidersOptions = {},
) {
    const providers = buildDefaultProviders(providerOverrides);

    function Wrapper({children}: { children: React.ReactNode }) {
        return <EmbedDataProvider providers={providers}>{children}</EmbedDataProvider>;
    }

    return {
        ...render(ui, {wrapper: Wrapper, ...renderOptions}),
        providers,
    };
}
