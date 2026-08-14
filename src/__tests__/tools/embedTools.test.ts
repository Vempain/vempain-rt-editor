import {describe, expect, it} from '@jest/globals';
import {
    buildCarouselTag,
    buildEmbedTag,
    type CollapseCarouselItem,
    type ContentSegment,
    convertPlaceholdersToTags,
    convertTagsToPlaceholders,
    type EmbedDescriptor,
    parseCarouselParams,
    parseEmbeds,
} from '../../tools/embedTools';

// ---------------------------------------------------------------------------
// buildEmbedTag
// ---------------------------------------------------------------------------
describe('buildEmbedTag', () => {
    it('builds a gallery embed tag', () => {
        expect(buildEmbedTag({type: 'gallery', id: 7})).toBe('<!--vps:embed:gallery:7-->');
    });

    it('builds a gallery embed tag with extra params', () => {
        expect(buildEmbedTag({type: 'gallery', id: 3, extra: 'large'})).toBe('<!--vps:embed:gallery:3:large-->');
    });

    it('builds an image embed tag', () => {
        expect(buildEmbedTag({type: 'image', id: 42})).toBe('<!--vps:embed:image:42-->');
    });

    it('builds a hero embed tag', () => {
        expect(buildEmbedTag({type: 'hero', id: 5, heroType: 'image'})).toBe('<!--vps:embed:hero:5:type:image-->');
    });

    it('builds a video embed tag', () => {
        expect(buildEmbedTag({type: 'video', id: 99})).toBe('<!--vps:embed:video:99-->');
    });

    it('builds an audio embed tag', () => {
        expect(buildEmbedTag({type: 'audio', id: 11})).toBe('<!--vps:embed:audio:11-->');
    });

    it('builds a youtube embed tag', () => {
        expect(buildEmbedTag({type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}))
            .toBe('<!--vps:embed:youtube:https://www.youtube.com/watch?v=dQw4w9WgXcQ-->');
    });

    it('strips HTML comment tags from youtube URL to prevent injection', () => {
        expect(buildEmbedTag({type: 'youtube', url: 'https://youtu.be/<!--evil-->'}))
            .toBe('<!--vps:embed:youtube:https://youtu.be/evil-->');
    });

    it('builds a music embed tag', () => {
        expect(buildEmbedTag({type: 'music', identifier: 'music_library'}))
            .toBe('<!--vps:embed:music:music_library-->');
    });

    it('strips comment delimiters from music identifier', () => {
        expect(buildEmbedTag({type: 'music', identifier: 'my<!--evil-->lib'}))
            .toBe('<!--vps:embed:music:myevillib-->');
    });

    it('builds a gps_timeseries embed tag', () => {
        expect(buildEmbedTag({type: 'gps_timeseries', identifier: 'gps_route_2024'}))
            .toBe('<!--vps:embed:gps_timeseries:gps_route_2024-->');
    });

    it('builds a last embed tag for pages', () => {
        expect(buildEmbedTag({type: 'last', itemType: 'pages', count: 5}))
            .toBe('<!--vps:embed:last:pages:5-->');
    });

    it('builds a last embed tag for galleries', () => {
        expect(buildEmbedTag({type: 'last', itemType: 'galleries', count: 3}))
            .toBe('<!--vps:embed:last:galleries:3-->');
    });

    it('builds a last embed tag for images', () => {
        expect(buildEmbedTag({type: 'last', itemType: 'images', count: 10}))
            .toBe('<!--vps:embed:last:images:10-->');
    });

    it('builds a last embed tag for videos', () => {
        expect(buildEmbedTag({type: 'last', itemType: 'videos', count: 2}))
            .toBe('<!--vps:embed:last:videos:2-->');
    });

    it('builds a last embed tag for audio', () => {
        expect(buildEmbedTag({type: 'last', itemType: 'audio', count: 1}))
            .toBe('<!--vps:embed:last:audio:1-->');
    });

    it('builds a last embed tag for documents', () => {
        expect(buildEmbedTag({type: 'last', itemType: 'documents', count: 8}))
            .toBe('<!--vps:embed:last:documents:8-->');
    });

    it('builds a word cloud embed tag', () => {
        expect(buildEmbedTag({type: 'word_cloud', options: {shape: 'circle', fontSize: [10, 40]}}))
            .toBe('<!--vps:embed:word_cloud:{"shape":"circle","fontSize":[10,40]}-->');
    });

    it('builds a today random embed tag', () => {
        expect(buildEmbedTag({type: 'today_random', options: {title: 'On this day', columns: 3}}))
            .toBe('<!--vps:embed:today_random:{"title":"On this day","columns":3}-->');
    });

    it('builds a collapse embed tag', () => {
        const items: CollapseCarouselItem[] = [
            {title: 'Section A', body: 'Content A'},
            {title: 'Section B', body: 'Content B'},
        ];
        const tag = buildEmbedTag({type: 'collapse', items});
        expect(tag).toBe(
            `<!--vps:embed:collapse:${JSON.stringify(items)}-->`,
        );
    });

    it('sanitizes comment delimiters inside collapse items', () => {
        const items: CollapseCarouselItem[] = [{title: 'a<!--bad-->', body: 'b--!>c'}];
        const tag = buildEmbedTag({type: 'collapse', items});
        expect(tag).toContain('"title":"abad"');
        expect(tag).toContain('"body":"bc"');
    });

    it('builds a carousel embed tag without extra', () => {
        const items: CollapseCarouselItem[] = [{title: 'Slide 1', body: 'img1'}];
        const tag = buildEmbedTag({type: 'carousel', items});
        expect(tag).toBe(`<!--vps:embed:carousel:${JSON.stringify(items)}-->`);
    });

    it('builds a carousel embed tag with extra params string', () => {
        const items: CollapseCarouselItem[] = [{title: 'Slide 1', body: 'img1'}];
        const tag = buildEmbedTag({type: 'carousel', items, extra: 'true:false:800'});
        expect(tag).toBe(`<!--vps:embed:carousel:${JSON.stringify(items)}:true:false:800-->`);
    });
});

// ---------------------------------------------------------------------------
// buildCarouselTag
// ---------------------------------------------------------------------------
describe('buildCarouselTag', () => {
    it('includes autoplay, dotDuration and speed in the tag', () => {
        const items: CollapseCarouselItem[] = [{title: 'A', body: 'B'}];
        const tag = buildCarouselTag(items, {autoplay: true, dotDuration: false, speed: 600});
        expect(tag).toBe(`<!--vps:embed:carousel:${JSON.stringify(items)}:true:false:600-->`);
    });

    it('round-trips through parseCarouselParams', () => {
        const items: CollapseCarouselItem[] = [{title: 'X', body: 'Y'}];
        const tag = buildCarouselTag(items, {autoplay: false, dotDuration: true, speed: 300});
        // Extract the extra params portion (everything after the JSON array)
        const jsonStr = JSON.stringify(items);
        const suffix = tag.slice(tag.indexOf(jsonStr) + jsonStr.length, tag.length - 3);
        expect(suffix).toBe(':false:true:300');
        const params = parseCarouselParams(suffix.slice(1)); // strip leading colon
        expect(params).toEqual({autoplay: false, dotDuration: true, speed: 300});
    });
});

// ---------------------------------------------------------------------------
// parseCarouselParams
// ---------------------------------------------------------------------------
describe('parseCarouselParams', () => {
    it('parses true:true:500', () => {
        expect(parseCarouselParams('true:true:500')).toEqual({autoplay: true, dotDuration: true, speed: 500});
    });

    it('parses false:false:200', () => {
        expect(parseCarouselParams('false:false:200')).toEqual({autoplay: false, dotDuration: false, speed: 200});
    });

    it('defaults speed to 500 when not present', () => {
        expect(parseCarouselParams('true:false:')).toMatchObject({speed: 500});
    });

    it('parses speed 1000', () => {
        expect(parseCarouselParams('true:false:1000')).toMatchObject({speed: 1000});
    });
});

// ---------------------------------------------------------------------------
// parseEmbeds
// ---------------------------------------------------------------------------
describe('parseEmbeds', () => {
    it('returns a single html segment for plain content', () => {
        const result = parseEmbeds('<p>Hello world</p>');
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({kind: 'html', content: '<p>Hello world</p>'});
    });

    it('parses a gallery embed', () => {
        const html = '<!--vps:embed:gallery:4-->';
        const result = parseEmbeds(html);
        expect(result).toHaveLength(1);
        expect(result[0].kind).toBe('embed');
        const desc = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor;
        expect(desc).toMatchObject({type: 'gallery', id: 4});
    });

    it('parses an image embed', () => {
        const result = parseEmbeds('<!--vps:embed:image:7-->');
        expect(result[0].kind).toBe('embed');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'image' }>;
        expect(d.id).toBe(7);
    });

    it('parses a hero embed', () => {
        const result = parseEmbeds('<!--vps:embed:hero:12-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'hero' }>;
        expect(d.type).toBe('hero');
        expect(d.id).toBe(12);
        expect(d.heroType).toBe('image');
    });

    it('parses a video embed', () => {
        const result = parseEmbeds('<!--vps:embed:video:55-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'video' }>;
        expect(d.id).toBe(55);
    });

    it('parses an audio embed', () => {
        const result = parseEmbeds('<!--vps:embed:audio:3-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'audio' }>;
        expect(d.id).toBe(3);
    });

    it('parses a youtube embed', () => {
        const url = 'https://www.youtube.com/watch?v=abc123';
        const result = parseEmbeds(`<!--vps:embed:youtube:${url}-->`);
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'youtube' }>;
        expect(d.url).toBe(url);
    });

    it('parses a music embed', () => {
        const result = parseEmbeds('<!--vps:embed:music:music_library-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'music' }>;
        expect(d.identifier).toBe('music_library');
    });

    it('parses a gps_timeseries embed', () => {
        const result = parseEmbeds('<!--vps:embed:gps_timeseries:gps_route_2024-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'gps_timeseries' }>;
        expect(d.identifier).toBe('gps_route_2024');
    });

    it('parses a last embed', () => {
        const result = parseEmbeds('<!--vps:embed:last:pages:10-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'last' }>;
        expect(d.itemType).toBe('pages');
        expect(d.count).toBe(10);
    });

    it('parses a word cloud embed', () => {
        const result = parseEmbeds('<!--vps:embed:word_cloud:{"shape":"diamond","fontSize":[12,60]}-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'word_cloud' }>;
        expect(d.options).toEqual({shape: 'diamond', fontSize: [12, 60]});
    });

    it('parses a today random embed', () => {
        const result = parseEmbeds('<!--vps:embed:today_random:{"title":"On this day","columns":2}-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'today_random' }>;
        expect(d.options).toEqual({title: 'On this day', columns: 2});
    });

    it('defaults invalid last type to pages', () => {
        const result = parseEmbeds('<!--vps:embed:last:unknown:5-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'last' }>;
        expect(d.itemType).toBe('pages');
    });

    it('defaults invalid last count to 1', () => {
        const result = parseEmbeds('<!--vps:embed:last:pages:0-->');
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'last' }>;
        expect(d.count).toBe(1);
    });

    it('parses a collapse embed with JSON items', () => {
        const items: CollapseCarouselItem[] = [{title: 'T1', body: 'B1'}, {title: 'T2', body: 'B2'}];
        const tag = `<!--vps:embed:collapse:${JSON.stringify(items)}-->`;
        const result = parseEmbeds(tag);
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'collapse' }>;
        expect(d.type).toBe('collapse');
        expect(d.items).toHaveLength(2);
        expect(d.items[0].title).toBe('T1');
    });

    it('handles collapse embed with JSON containing special characters', () => {
        const items: CollapseCarouselItem[] = [{title: 'A "quoted" title', body: 'Body with <b>HTML</b>'}];
        const tag = `<!--vps:embed:collapse:${JSON.stringify(items)}-->`;
        const result = parseEmbeds(tag);
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'collapse' }>;
        expect(d.items[0].title).toBe('A "quoted" title');
        expect(d.items[0].body).toBe('Body with <b>HTML</b>');
    });

    it('parses a carousel embed with params', () => {
        const items: CollapseCarouselItem[] = [{title: 'S1', body: 'img1'}];
        const tag = `<!--vps:embed:carousel:${JSON.stringify(items)}:true:false:700-->`;
        const result = parseEmbeds(tag);
        const d = (result[0] as Extract<ContentSegment, { kind: 'embed' }>).descriptor as Extract<EmbedDescriptor, { type: 'carousel' }>;
        expect(d.type).toBe('carousel');
        expect(d.items).toHaveLength(1);
        expect(d.extra).toBe('true:false:700');
    });

    it('separates surrounding HTML from embeds', () => {
        const html = '<p>Before</p><!--vps:embed:gallery:1--><p>After</p>';
        const result = parseEmbeds(html);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({kind: 'html', content: '<p>Before</p>'});
        expect(result[1].kind).toBe('embed');
        expect(result[2]).toEqual({kind: 'html', content: '<p>After</p>'});
    });

    it('handles multiple embeds in sequence', () => {
        const html =
            '<!--vps:embed:gallery:1--><!--vps:embed:image:2--><!--vps:embed:hero:3-->';
        const result = parseEmbeds(html);
        // Only embed segments (no empty html segments between consecutive tags)
        const embeds = result.filter(s => s.kind === 'embed');
        expect(embeds).toHaveLength(3);
    });

    it('returns an empty array for empty input', () => {
        expect(parseEmbeds('')).toHaveLength(0);
    });

    it('handles malformed collapse JSON gracefully (returns empty items)', () => {
        const tag = '<!--vps:embed:collapse:[bad json-->'; // note: not a valid balanced array
        const result = parseEmbeds(tag);
        // Should either return an embed with empty items or a raw html segment; must not throw
        expect(Array.isArray(result)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// convertTagsToPlaceholders / convertPlaceholdersToTags  (round-trip)
// ---------------------------------------------------------------------------
describe('convertTagsToPlaceholders and convertPlaceholdersToTags', () => {
    function roundTrip(tag: string): string {
        const withPlaceholders = convertTagsToPlaceholders(tag);
        return convertPlaceholdersToTags(withPlaceholders);
    }

    it('round-trips a gallery embed', () => {
        const tag = '<!--vps:embed:gallery:7-->';
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips an image embed', () => {
        expect(roundTrip('<!--vps:embed:image:42-->')).toBe('<!--vps:embed:image:42-->');
    });

    it('round-trips a hero embed', () => {
        expect(roundTrip('<!--vps:embed:hero:5-->')).toBe('<!--vps:embed:hero:5-->');
    });

    it('round-trips a video embed', () => {
        expect(roundTrip('<!--vps:embed:video:13-->')).toBe('<!--vps:embed:video:13-->');
    });

    it('round-trips an audio embed', () => {
        expect(roundTrip('<!--vps:embed:audio:8-->')).toBe('<!--vps:embed:audio:8-->');
    });

    it('round-trips a youtube embed', () => {
        const tag = '<!--vps:embed:youtube:https://www.youtube.com/watch?v=test-->';
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips a music embed', () => {
        const tag = '<!--vps:embed:music:my_music_set-->';
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips a gps_timeseries embed', () => {
        const tag = '<!--vps:embed:gps_timeseries:gps_europe_2024-->';
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips a last embed', () => {
        const tag = '<!--vps:embed:last:galleries:5-->';
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips a word cloud embed', () => {
        const tag = '<!--vps:embed:word_cloud:{"shape":"circle","fontSize":[12,56]}-->';
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips a today random embed', () => {
        const tag = '<!--vps:embed:today_random:{"title":"On this day","columns":2}-->';
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips a collapse embed', () => {
        const items: CollapseCarouselItem[] = [{title: 'T', body: 'B'}];
        const tag = `<!--vps:embed:collapse:${JSON.stringify(items)}-->`;
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips a collapse embed with special characters in JSON', () => {
        const items: CollapseCarouselItem[] = [{title: 'Has "quotes"', body: '<b>HTML</b> & ampersand'}];
        const tag = `<!--vps:embed:collapse:${JSON.stringify(items)}-->`;
        expect(roundTrip(tag)).toBe(tag);
    });

    it('round-trips a carousel embed with params', () => {
        const items: CollapseCarouselItem[] = [{title: 'S1', body: 'Body 1'}, {title: 'S2', body: 'Body 2'}];
        const tag = `<!--vps:embed:carousel:${JSON.stringify(items)}:true:false:500-->`;
        expect(roundTrip(tag)).toBe(tag);
    });

    it('preserves surrounding HTML text during round-trip', () => {
        const html = '<p>Intro</p><!--vps:embed:gallery:1--><p>Outro</p>';
        expect(roundTrip(html)).toBe(html);
    });

    it('preserves multiple embeds during round-trip', () => {
        const tag1 = '<!--vps:embed:gallery:1-->';
        const tag2 = '<!--vps:embed:image:2-->';
        const html = `<p>Start</p>${tag1}<p>Middle</p>${tag2}<p>End</p>`;
        expect(roundTrip(html)).toBe(html);
    });

    it('does not double-convert plain HTML without embeds', () => {
        const html = '<p>Just some plain <strong>text</strong>.</p>';
        expect(convertTagsToPlaceholders(html)).toBe(html);
        expect(convertPlaceholdersToTags(html)).toBe(html);
    });

    it('produces a placeholder span with proper data attributes for gallery', () => {
        const placeholder = convertTagsToPlaceholders('<!--vps:embed:gallery:3-->');
        expect(placeholder).toContain('class="vps-embed-placeholder"');
        expect(placeholder).toContain('data-type="gallery"');
        expect(placeholder).toContain('data-id="3"');
    });

    it('produces placeholder label for collapse with item count', () => {
        const items: CollapseCarouselItem[] = [{title: 'A', body: 'B'}, {title: 'C', body: 'D'}];
        const tag = `<!--vps:embed:collapse:${JSON.stringify(items)}-->`;
        const placeholder = convertTagsToPlaceholders(tag);
        expect(placeholder).toContain('collapse (2 items)');
    });

    it('produces placeholder label for carousel with speed info', () => {
        const items: CollapseCarouselItem[] = [{title: 'Slide', body: 'Body'}];
        const tag = buildCarouselTag(items, {autoplay: true, dotDuration: false, speed: 750});
        const placeholder = convertTagsToPlaceholders(tag);
        expect(placeholder).toContain('carousel (1 item)');
        expect(placeholder).toContain('speed:750ms');
    });

    it('produces placeholder label for last with count and type', () => {
        const tag = '<!--vps:embed:last:images:7-->';
        const placeholder = convertTagsToPlaceholders(tag);
        expect(placeholder).toContain('last 7 images');
    });

    it('produces placeholder label for gps_timeseries', () => {
        const tag = '<!--vps:embed:gps_timeseries:gps_route_eu-->';
        const placeholder = convertTagsToPlaceholders(tag);
        expect(placeholder).toContain('gps:gps_route_eu');
    });

    it('produces placeholder label for word cloud', () => {
        const tag = '<!--vps:embed:word_cloud:{"shape":"circle"}-->';
        const placeholder = convertTagsToPlaceholders(tag);
        expect(placeholder).toContain('word cloud');
    });

    it('produces placeholder label for today random', () => {
        const tag = '<!--vps:embed:today_random:{"title":"On this day"}-->';
        const placeholder = convertTagsToPlaceholders(tag);
        expect(placeholder).toContain('today random');
    });
});

// ---------------------------------------------------------------------------
// buildEmbedTag → parseEmbeds full round-trip (tag → parse → tag)
// ---------------------------------------------------------------------------
describe('buildEmbedTag → parseEmbeds full round-trip', () => {
    function tagFromDescriptor(descriptor: EmbedDescriptor): string {
        if (descriptor.type === 'carousel') {
            return buildCarouselTag(descriptor.items, parseCarouselParams(descriptor.extra ?? 'false:false:500'));
        }
        return buildEmbedTag(descriptor);
    }

    function firstDescriptor(tag: string): EmbedDescriptor {
        const segments = parseEmbeds(tag);
        const embedSeg = segments.find(s => s.kind === 'embed');
        if (!embedSeg || embedSeg.kind !== 'embed') throw new Error('No embed found');
        return embedSeg.descriptor;
    }

    it('gallery round-trip', () => {
        const tag = buildEmbedTag({type: 'gallery', id: 99});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'gallery' }>;
        expect(desc.type).toBe('gallery');
        expect(desc.id).toBe(99);
    });

    it('image round-trip', () => {
        const tag = buildEmbedTag({type: 'image', id: 100});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'image' }>;
        expect(desc.id).toBe(100);
    });

    it('hero round-trip', () => {
        const tag = buildEmbedTag({type: 'hero', id: 1, heroType: 'carousel'});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'hero' }>;
        expect(desc.id).toBe(1);
        expect(desc.heroType).toBe('carousel');
    });

    it('video round-trip', () => {
        const tag = buildEmbedTag({type: 'video', id: 50});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'video' }>;
        expect(desc.id).toBe(50);
    });

    it('audio round-trip', () => {
        const tag = buildEmbedTag({type: 'audio', id: 22});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'audio' }>;
        expect(desc.id).toBe(22);
    });

    it('youtube round-trip', () => {
        const url = 'https://www.youtube.com/watch?v=abc';
        const tag = buildEmbedTag({type: 'youtube', url});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'youtube' }>;
        expect(desc.url).toBe(url);
    });

    it('music round-trip', () => {
        const tag = buildEmbedTag({type: 'music', identifier: 'my_music_lib'});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'music' }>;
        expect(desc.identifier).toBe('my_music_lib');
    });

    it('gps_timeseries round-trip', () => {
        const tag = buildEmbedTag({type: 'gps_timeseries', identifier: 'gps_hike_2025'});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'gps_timeseries' }>;
        expect(desc.identifier).toBe('gps_hike_2025');
    });

    it('last round-trip', () => {
        const tag = buildEmbedTag({type: 'last', itemType: 'documents', count: 4});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'last' }>;
        expect(desc.itemType).toBe('documents');
        expect(desc.count).toBe(4);
    });

    it('word cloud round-trip', () => {
        const tag = buildEmbedTag({type: 'word_cloud', options: {shape: 'diamond', spiral: 'rectangular'}});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'word_cloud' }>;
        expect(desc.options).toEqual({shape: 'diamond', spiral: 'rectangular'});
    });

    it('today random round-trip', () => {
        const tag = buildEmbedTag({type: 'today_random', options: {title: 'On this day'}});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'today_random' }>;
        expect(desc.options).toEqual({title: 'On this day'});
    });

    it('collapse round-trip preserves items', () => {
        const items: CollapseCarouselItem[] = [
            {title: 'FAQ 1', body: 'Answer 1'},
            {title: 'FAQ 2', body: 'Answer 2'},
        ];
        const tag = buildEmbedTag({type: 'collapse', items});
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'collapse' }>;
        expect(desc.items).toEqual(items);
    });

    it('carousel round-trip via buildCarouselTag preserves items and extra', () => {
        const items: CollapseCarouselItem[] = [{title: 'A', body: 'B'}];
        const params = {autoplay: true, dotDuration: true, speed: 1000};
        const tag = buildCarouselTag(items, params);
        const desc = firstDescriptor(tag) as Extract<EmbedDescriptor, { type: 'carousel' }>;
        expect(desc.items).toEqual(items);
        const parsed = parseCarouselParams(desc.extra!);
        expect(parsed).toEqual(params);
        // Build a second tag from parsed descriptor and verify it matches
        const tag2 = tagFromDescriptor(desc);
        expect(tag2).toBe(tag);
    });
});
