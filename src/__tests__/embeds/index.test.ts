/**
 * Tests for the embeds barrel – every dialog component must be re-exported.
 */
import {describe, expect, it} from '@jest/globals';
import * as embeds from '../../embeds';

const EXPECTED_EXPORTS = [
    'CommonDataSetSelectorModal',
    'CommonSiteFileSelectorModal',
    'RichEmbedAudioEditor',
    'RichEmbedCarouselEditor',
    'RichEmbedCollapseEditor',
    'RichEmbedGalleryEditor',
    'RichEmbedGpsTimeSeriesEditor',
    'RichEmbedHeroEditor',
    'RichEmbedImageEditor',
    'RichEmbedLastEditor',
    'RichEmbedMusicEditor',
    'RichEmbedTodayRandomEditor',
    'RichEmbedVideoEditor',
    'RichEmbedWordCloudEditor',
    'RichEmbedYoutubeEditor',
] as const;

describe('embeds barrel', () => {
    it.each(EXPECTED_EXPORTS)('exports %s as a component', (name) => {
        expect(typeof embeds[name]).toBe('function');
    });

    it('exports nothing else', () => {
        expect(Object.keys(embeds).sort()).toEqual([...EXPECTED_EXPORTS].sort());
    });
});
