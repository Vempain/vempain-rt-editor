/**
 * Tests for the library entry point – every runtime export of the package root
 * must exist so hosts can rely on the documented public surface.
 */
import {describe, expect, it} from '@jest/globals';
import * as library from '../index';

describe('library entry point', () => {
    it('exports the editor component', () => {
        expect(typeof library.RichTextEditor).toBe('function');
    });

    it('exports the embed tag helpers', () => {
        expect(typeof library.buildCarouselTag).toBe('function');
        expect(typeof library.buildEmbedTag).toBe('function');
        expect(typeof library.convertPlaceholdersToTags).toBe('function');
        expect(typeof library.convertTagsToPlaceholders).toBe('function');
        expect(typeof library.parseCarouselParams).toBe('function');
        expect(typeof library.parseEmbeds).toBe('function');
    });

    it('exports the runtime enum objects', () => {
        expect(library.FileTypeEnum.IMAGE).toBe('IMAGE');
        expect(library.QueryDetailEnum.FULL).toBe('FULL');
    });

    it('exposes exactly the documented runtime exports', () => {
        expect(Object.keys(library).sort()).toEqual([
            'FileTypeEnum',
            'PAGE_CANVAS_CLASS',
            'QueryDetailEnum',
            'RichTextEditor',
            'buildCarouselTag',
            'buildEmbedTag',
            'convertPlaceholdersToTags',
            'convertTagsToPlaceholders',
            'parseCarouselParams',
            'parseEmbeds',
            'sanitizePageStyle',
            'scopePageStyle',
        ]);
    });
});
