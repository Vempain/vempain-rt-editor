import React, {createContext, useContext} from 'react';
import type {EmbedDataProviders, QueryDetailEnum} from '../types';

const defaultProviders: EmbedDataProviders = {
    findGalleries: async (_params: { details: QueryDetailEnum }) => {
        throw new Error('Embed data provider findGalleries is not configured.');
    },
    getPagedSiteFiles: async (_params) => {
        throw new Error('Embed data provider getPagedSiteFiles is not configured.');
    },
    getAllDataSets: async (_params) => {
        throw new Error('Embed data provider getAllDataSets is not configured.');
    },
};

const EmbedDataContext = createContext<EmbedDataProviders>(defaultProviders);

interface EmbedDataProviderProps {
    providers?: Partial<EmbedDataProviders>;
    children: React.ReactNode;
}

export function EmbedDataProvider({providers, children}: EmbedDataProviderProps) {
    const merged = {
        ...defaultProviders,
        ...providers,
    } satisfies EmbedDataProviders;

    return <EmbedDataContext.Provider value={merged}>{children}</EmbedDataContext.Provider>;
}

export function useEmbedDataProviders(): EmbedDataProviders {
    return useContext(EmbedDataContext);
}

