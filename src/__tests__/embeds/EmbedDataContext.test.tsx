/**
 * Tests for EmbedDataContext – the default providers reject when the host did not
 * configure them, and host providers are merged over the defaults.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {render} from '@testing-library/react';
import {EmbedDataProvider, useEmbedDataProviders} from '../../embeds/EmbedDataContext';
import type {EmbedDataProviders} from '../../types';
import {FileTypeEnum} from '../../types';

function Probe({onProviders}: { onProviders: (providers: EmbedDataProviders) => void }) {
    onProviders(useEmbedDataProviders());
    return null;
}

function captureProviders(ui: (probe: React.ReactElement) => React.ReactElement): EmbedDataProviders {
    let captured: EmbedDataProviders | undefined;
    render(ui(<Probe onProviders={(providers) => {
        captured = providers;
    }}/>));
    if (!captured) {
        throw new Error('providers were not captured');
    }
    return captured;
}

describe('EmbedDataContext', () => {
    it('rejects every default provider when none is configured', async () => {
        const providers = captureProviders((probe) => <EmbedDataProvider>{probe}</EmbedDataProvider>);

        await expect(providers.findGalleries({page: 0, size: 1})).rejects.toThrow('findGalleries is not configured');
        await expect(providers.getPagedSiteFiles({page: 0, size: 1, file_type: FileTypeEnum.IMAGE}))
                .rejects.toThrow('getPagedSiteFiles is not configured');
        await expect(providers.getAllDataSets()).rejects.toThrow('getAllDataSets is not configured');
    });

    it('falls back to the default providers without a provider element', async () => {
        const providers = captureProviders((probe) => probe);

        await expect(providers.getAllDataSets({type: 'music'})).rejects.toThrow('getAllDataSets is not configured');
    });

    it('merges host providers over the defaults', async () => {
        const getAllDataSets = jest.fn<EmbedDataProviders['getAllDataSets']>().mockResolvedValue([{identifier: 'x'}]);
        const providers = captureProviders((probe) => (
                <EmbedDataProvider providers={{getAllDataSets}}>{probe}</EmbedDataProvider>
        ));

        await expect(providers.getAllDataSets()).resolves.toEqual([{identifier: 'x'}]);
        await expect(providers.findGalleries({page: 0, size: 1})).rejects.toThrow('findGalleries is not configured');
    });
});
