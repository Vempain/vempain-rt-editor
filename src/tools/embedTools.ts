/**
 * Utility functions for parsing and rendering Vempain embed tags.
 *
 * Supported embed tag formats:
 *   <!--vps:embed:gallery:%d-->
 *   <!--vps:embed:image:%d-->
 *   <!--vps:embed:hero:%d-->
 *   <!--vps:embed:video:%d-->
 *   <!--vps:embed:audio:%d-->
 *   <!--vps:embed:youtube:%s-->
 *   <!--vps:embed:last:{type}:{count}-->
 *   <!--vps:embed:collapse:<json-array>-->
 *   <!--vps:embed:carousel:<json-array>:autoplay:dotDuration:speed-->
 *
 * The JSON payload for collapse/carousel is stored as plain JSON.
 * No other HTML comments are allowed in content except embed tags.
 */

export type EmbedType =
    | 'gallery'
    | 'image'
    | 'hero'
    | 'video'
    | 'audio'
    | 'youtube'
    | 'music'
    | 'gps_timeseries'
    | 'last'
    | 'collapse'
    | 'carousel';

export type LastEmbedType = 'pages' | 'galleries' | 'images' | 'videos' | 'audio' | 'documents';

export interface CollapseCarouselItem {
    title: string;
    body: string;
}

/**
 * Discriminated union so TypeScript consumers get correct types for each embed.
 * gallery/image/hero use a numeric `id`; collapse/carousel carry inline `items`.
 */
export type EmbedDescriptor =
    | { type: 'gallery'; id: number; extra?: string }
    | { type: 'image'; id: number; extra?: string }
    | { type: 'hero'; id: number; extra?: string }
    | { type: 'video'; id: number; extra?: string }
    | { type: 'audio'; id: number; extra?: string }
    | { type: 'youtube'; url: string }
    | { type: 'music'; identifier: string }
    | { type: 'gps_timeseries'; identifier: string }
    | { type: 'last'; itemType: LastEmbedType; count: number }
    | { type: 'collapse'; items: CollapseCarouselItem[] }
    | { type: 'carousel'; items: CollapseCarouselItem[]; extra?: string };

export interface CarouselParams {
    autoplay: boolean;
    dotDuration: boolean;
    speed: number;
}

/**
 * Matches simple (non-JSON) embed tags.
 * These contain plain values and optional extra params — no newlines or
 * dangerous `-->` sequences in their content.
 */
const SIMPLE_EMBED_REGEX = /<!--vps:embed:(gallery|image|hero|video|audio|youtube|music|gps_timeseries|last):([\s\S]*?)-->/g;

const CONTENT_EMBED_TYPES = new Set<EmbedType>(['collapse', 'carousel', 'youtube', 'music', 'gps_timeseries', 'last']);
const LAST_TYPES: LastEmbedType[] = ['pages', 'galleries', 'images', 'videos', 'audio', 'documents'];

/**
 * Detects the opening of a collapse/carousel embed tag.
 * We cannot use a simple regex for the full tag because the JSON payload may
 * contain `-->` sequences or newlines which break `.*?` matching.
 * Instead we locate the opening marker and then use bracket-depth parsing to
 * find where the JSON array ends, followed by the closing `-->`.
 */
const JSON_EMBED_OPEN = '<!--vps:embed:';

/**
 * Find all embed tags in `html`, returning their start index, length and raw
 * content string (everything between the type colon and the closing `-->`).
 *
 * For simple tags (gallery/image/hero) we use a normal regex.
 * For JSON-carrying tags (collapse/carousel) we use bracket-depth parsing so
 * that `-->` inside JSON string values does not prematurely close the match
 * and newlines inside the content are handled correctly.
 */
interface RawEmbedMatch {
    index: number;
    length: number;
    type: EmbedType;
    content: string; // raw content between type: and -->
}

function findAllEmbedMatches(html: string): RawEmbedMatch[] {
    const matches: RawEmbedMatch[] = [];

    // 1. Find simple embeds via regex
    const simpleRe = new RegExp(SIMPLE_EMBED_REGEX.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = simpleRe.exec(html)) !== null) {
        matches.push({
            index: m.index,
            length: m[0].length,
            type: m[1] as EmbedType,
            content: m[2],
        });
    }

    // 2. Find collapse/carousel embeds using bracket-depth parsing
    let searchFrom = 0;
    while (searchFrom < html.length) {
        const openIdx = html.indexOf(JSON_EMBED_OPEN, searchFrom);
        if (openIdx === -1) break;

        // Extract the type name (characters up to the next ':')
        const afterOpen = openIdx + JSON_EMBED_OPEN.length;
        const typeEnd = html.indexOf(':', afterOpen);
        if (typeEnd === -1) {
            searchFrom = afterOpen;
            continue;
        }
        const type = html.substring(afterOpen, typeEnd);
        if (type !== 'collapse' && type !== 'carousel') {
            searchFrom = afterOpen;
            continue;
        }

        // Content starts after "<!--vps:embed:<type>:"
        const contentStart = typeEnd + 1;

        // The content must start with '[' for the JSON format
        // (skip whitespace for robustness)
        let jsonStart = contentStart;
        while (jsonStart < html.length && html[jsonStart] === ' ') jsonStart++;

        if (html[jsonStart] === '[') {
            // Parse with bracket depth tracking, respecting JSON string escaping
            const jsonEnd = findJsonArrayEnd(html, jsonStart);
            if (jsonEnd !== -1) {
                // After the JSON array, look for --> (with optional extra params for carousel)
                const afterJson = jsonEnd + 1;
                const closingIdx = html.indexOf('-->', afterJson);
                if (closingIdx !== -1) {
                    const fullLength = (closingIdx + 3) - openIdx;
                    const content = html.substring(contentStart, closingIdx);
                    matches.push({
                        index: openIdx,
                        length: fullLength,
                        type: type as EmbedType,
                        content,
                    });
                    searchFrom = closingIdx + 3;
                    continue;
                }
            }
        }

        // If we get here, the tag is malformed — skip past this opening marker
        searchFrom = afterOpen;
    }

    // Sort by index so segments are produced in document order
    matches.sort((a, b) => a.index - b.index);
    return matches;
}

/**
 * Starting at `html[startIdx]` which must be `[`, find the index of the
 * matching `]` by tracking bracket depth.  Handles JSON string escaping
 * so that `]` inside quoted strings is not counted.
 *
 * Returns the index of the closing `]`, or -1 if not found.
 */
function findJsonArrayEnd(html: string, startIdx: number): number {
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < html.length; i++) {
        const ch = html[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (ch === '\\' && inString) {
            escape = true;
            continue;
        }

        if (ch === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (ch === '[') {
            depth++;
        } else if (ch === ']') {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }

    return -1; // unbalanced
}

/**
 * Escape a string for safe use inside an HTML attribute value (double-quoted).
 */
function escapeAttr(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Unescape an HTML-escaped attribute value back to the original string.
 * Inverse of escapeAttr.
 */
function unescapeAttr(value: string): string {
    return value
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
}

/**
 * Parse a carousel extra-params string into structured params.
 * Format: "<autoplay>:<dotDuration>:<speed>"
 */
export function parseCarouselParams(extra: string): CarouselParams {
    const parts = extra.split(':');
    return {
        autoplay: parts[0] === 'true',
        dotDuration: parts[1] === 'true',
        speed: parts[2] ? parseInt(parts[2], 10) : 500,
    };
}

/**
 * Build a carousel embed tag from a list of items and carousel params.
 * The JSON payload is stored as plain JSON (no URL-encoding).
 */
export function buildCarouselTag(items: CollapseCarouselItem[], params: CarouselParams): string {
    const safeItems = sanitizeCollapseCarouselItems(items);
    const json = JSON.stringify(safeItems);
    return `<!--vps:embed:carousel:${json}:${params.autoplay}:${params.dotDuration}:${params.speed}-->`;
}

/**
 * Build an embed tag string from an EmbedDescriptor.
 */
export function buildEmbedTag(descriptor: EmbedDescriptor): string {
    if (descriptor.type === 'collapse') {
        const safeItems = sanitizeCollapseCarouselItems(descriptor.items);
        return `<!--vps:embed:collapse:${JSON.stringify(safeItems)}-->`;
    }
    if (descriptor.type === 'carousel') {
        const safeItems = sanitizeCollapseCarouselItems(descriptor.items);
        const extra = descriptor.extra ? `:${descriptor.extra}` : '';
        return `<!--vps:embed:carousel:${JSON.stringify(safeItems)}${extra}-->`;
    }
    if (descriptor.type === 'youtube') {
        return `<!--vps:embed:youtube:${stripCommentTags(descriptor.url)}-->`;
    }
    if (descriptor.type === 'music' || descriptor.type === 'gps_timeseries') {
        return `<!--vps:embed:${descriptor.type}:${stripCommentTags(descriptor.identifier)}-->`;
    }
    if (descriptor.type === 'last') {
        return `<!--vps:embed:last:${descriptor.itemType}:${descriptor.count}-->`;
    }
    // gallery, image, hero, video, audio — numeric ID based
    if (descriptor.extra) {
        return `<!--vps:embed:${descriptor.type}:${descriptor.id}:${descriptor.extra}-->`;
    }
    return `<!--vps:embed:${descriptor.type}:${descriptor.id}-->`;
}

/**
 * Split an HTML string into a sequence of plain-HTML segments and embed descriptors.
 * Returns an array where each element is either:
 *   - { kind: 'html', content: string }
 *   - { kind: 'embed', descriptor: EmbedDescriptor }
 */
export type ContentSegment =
    | { kind: 'html'; content: string }
    | { kind: 'embed'; descriptor: EmbedDescriptor };


/**
 * Strip HTML comment delimiters from user content.
 * Only embed tags are allowed to use comment syntax.
 *
 * The replacement is applied in a loop to prevent incomplete sanitization
 * when nested or overlapping patterns like "<!<!---->" produce new comment
 * delimiters after a single pass.  The end-tag pattern also matches the
 * non-standard but browser-accepted "--!>" form.
 */
function stripCommentTags(value: string): string {
    const pattern = /<!--|--!?>/g;
    let previous: string;
    do {
        previous = value;
        value = value.replace(pattern, '');
    } while (value !== previous);
    return value;
}

function sanitizeCollapseCarouselItems(items: CollapseCarouselItem[]): CollapseCarouselItem[] {
    return items.map(item => ({
        title: stripCommentTags(item.title ?? ''),
        body: stripCommentTags(item.body ?? ''),
    }));
}

/**
 * Parse the raw content string (everything after the type colon) into an EmbedDescriptor.
 * Supports:
 *   - Plain JSON array for collapse/carousel
 *   - Legacy numeric id (optionally followed by extra params)
 */
function parseEmbedContent(type: EmbedType, raw: string): EmbedDescriptor {
    if (type === 'collapse' || type === 'carousel') {
        // Trim leading whitespace for robustness
        const trimmed = raw.trimStart();

        if (trimmed.startsWith('[')) {
            // Use bracket-depth parsing to find the end of the JSON array
            const jsonEnd = findJsonArrayEnd(trimmed, 0);
            if (jsonEnd !== -1) {
                const jsonStr = trimmed.substring(0, jsonEnd + 1);
                const rest = trimmed.substring(jsonEnd + 1);
                let items: CollapseCarouselItem[] = [];
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (Array.isArray(parsed)) {
                        items = parsed as CollapseCarouselItem[];
                    }
                } catch {
                    // malformed JSON — treat as empty items list
                }
                if (type === 'collapse') {
                    return {type, items};
                }
                const extra = rest.startsWith(':') ? rest.substring(1) : undefined;
                return extra ? {type, items, extra} : {type, items};
            }
        }

        // Legacy numeric format (e.g. <!--vps:embed:collapse:30-->)
        // Return with empty items array
        if (type === 'collapse') {
            return {type, items: []};
        }
        // Legacy numeric carousel: try to preserve the extra params
        const firstColon = raw.indexOf(':');
        const extra = firstColon !== -1 ? raw.substring(firstColon + 1) : undefined;
        return extra ? {type, items: [], extra} : {type, items: []};
    }

    if (type === 'youtube') {
        return {type, url: raw};
    }

    if (type === 'music' || type === 'gps_timeseries') {
        return {type, identifier: raw.trim()};
    }

    if (type === 'last') {
        const parts = raw.split(':');
        const parsedType = (parts[0] ?? '').trim().toLowerCase() as LastEmbedType;
        const itemType = LAST_TYPES.includes(parsedType) ? parsedType : 'pages';
        const parsedCount = parseInt(parts[1] ?? '0', 10);
        const count = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;
        return {type, itemType, count};
    }

    // Numeric-ID format: used for gallery, image, hero, video, audio
    const firstColon = raw.indexOf(':');
    const idStr = firstColon === -1 ? raw : raw.substring(0, firstColon);
    const extra = firstColon === -1 ? undefined : raw.substring(firstColon + 1);
    const id = parseInt(idStr, 10);
    if (type === 'gallery') return {type, id, extra};
    if (type === 'image') return {type, id, extra};
    if (type === 'hero') return {type, id, extra};
    if (type === 'video') return {type, id, extra};
    return {type: 'audio', id, extra};
}

export function parseEmbeds(html: string): ContentSegment[] {
    const segments: ContentSegment[] = [];
    const matches = findAllEmbedMatches(html);
    let lastIndex = 0;

    for (const match of matches) {
        // Skip overlapping matches (shouldn't happen, but be safe)
        if (match.index < lastIndex) continue;

        if (match.index > lastIndex) {
            segments.push({kind: 'html', content: html.slice(lastIndex, match.index)});
        }

        segments.push({
            kind: 'embed',
            descriptor: parseEmbedContent(match.type, match.content),
        });

        lastIndex = match.index + match.length;
    }

    if (lastIndex < html.length) {
        segments.push({kind: 'html', content: html.slice(lastIndex)});
    }

    return segments;
}

/**
 * Convert embed comment tags in HTML to visual placeholder spans
 * for display in the rich text editor (WYSIWYG mode).
 *
 * For gallery/image/hero the placeholder stores data-id and data-extra (HTML-escaped).
 * For collapse/carousel the placeholder stores data-content with raw JSON (HTML-escaped).
 */
export function convertTagsToPlaceholders(html: string): string {
    const matches = findAllEmbedMatches(html);
    if (matches.length === 0) return html;

    let result = '';
    let lastIndex = 0;

    for (const match of matches) {
        if (match.index < lastIndex) continue;

        result += html.slice(lastIndex, match.index);

        const embedType = match.type;
        const content = match.content;
        let dataAttrs: string;

        if (CONTENT_EMBED_TYPES.has(embedType)) {
            dataAttrs = `data-type="${escapeAttr(embedType)}" data-content="${escapeAttr(content)}"`;
        } else {
            const firstColon = content.indexOf(':');
            const id = firstColon === -1 ? content : content.substring(0, firstColon);
            const extra = firstColon === -1 ? '' : content.substring(firstColon + 1);
            dataAttrs = `data-type="${escapeAttr(embedType)}" data-id="${escapeAttr(id)}" data-extra="${escapeAttr(extra)}"`;
        }

        const label = buildPlaceholderLabel(embedType, content);
        result +=
            `<span class="vps-embed-placeholder" ` +
            `${dataAttrs} ` +
            `contenteditable="false" ` +
            `style="display:inline-block;background:#1a3a5c;border:1px solid #4a90d9;` +
            `border-radius:4px;padding:2px 8px;margin:2px 4px;cursor:pointer;` +
            `user-select:none;color:#90c4f8;font-size:0.85em;white-space:nowrap;"` +
            `>${label}</span>`;

        lastIndex = match.index + match.length;
    }

    result += html.slice(lastIndex);
    return result;
}

function buildPlaceholderLabel(type: EmbedType, content: string): string {
    switch (type) {
        case 'gallery':
            return `🖼 gallery:${content}`;
        case 'image':
            return `🖼 image:${content}`;
        case 'hero':
            return `🎨 hero:${content}`;
        case 'video':
            return `🎬 video:${content}`;
        case 'audio':
            return `🎵 audio:${content}`;
        case 'youtube': {
            const short = content.length > 40 ? `${content.substring(0, 40)}...` : content;
            return `▶ youtube:${short}`;
        }
        case 'music':
            return `🎼 music:${content}`;
        case 'gps_timeseries':
            return `🗺 gps:${content}`;
        case 'last': {
            const parts = content.split(':');
            const itemType = (parts[0] ?? 'pages').toLowerCase();
            const count = parseInt(parts[1] ?? '1', 10);
            const safeCount = Number.isFinite(count) && count > 0 ? count : 1;
            return `🧾 last ${safeCount} ${itemType}`;
        }
        case 'collapse': {
            const trimmed = content.trimStart();
            if (trimmed.startsWith('[')) {
                try {
                    const jsonEnd = findJsonArrayEnd(trimmed, 0);
                    if (jsonEnd !== -1) {
                        const parsed = JSON.parse(trimmed.substring(0, jsonEnd + 1));
                        if (Array.isArray(parsed)) {
                            const count = parsed.length;
                            return `📂 collapse (${count} item${count !== 1 ? 's' : ''})`;
                        }
                    }
                } catch { /* ignore */
                }
            }
            return `📂 collapse:${content.substring(0, 30)}…`;
        }
        case 'carousel': {
            const trimmed = content.trimStart();
            if (trimmed.startsWith('[')) {
                try {
                    const jsonEnd = findJsonArrayEnd(trimmed, 0);
                    if (jsonEnd !== -1) {
                        const parsed = JSON.parse(trimmed.substring(0, jsonEnd + 1));
                        if (Array.isArray(parsed)) {
                            const count = parsed.length;
                            const rest = trimmed.substring(jsonEnd + 1);
                            const extra = rest.startsWith(':') ? rest.substring(1) : '';
                            const params = extra ? parseCarouselParams(extra) : null;
                            const speedInfo = params ? ` speed:${params.speed}ms` : '';
                            return `🎠 carousel (${count} item${count !== 1 ? 's' : ''})${speedInfo}`;
                        }
                    }
                } catch { /* ignore */
                }
            }
            return `🎠 carousel:${content.substring(0, 30)}…`;
        }
        default:
            return `embed:${content}`;
    }
}

/**
 * Convert visual placeholder spans back to embed comment tags.
 * Inverse of convertTagsToPlaceholders.
 */
export function convertPlaceholdersToTags(html: string): string {
    // Handle placeholders that use data-content.
    // The stored value was HTML-escaped; unescape it to restore the original embed content.
    let result = html.replace(
        /<span[^>]+class="vps-embed-placeholder"[^>]+data-type="([^"]+)"[^>]+data-content="([^"]*)"[^>]*>.*?<\/span>/g,
        (_match, type, rawContent) => {
            const content = unescapeAttr(rawContent);
            return `<!--vps:embed:${type}:${content}-->`;
        },
    );
    // Handle placeholders that use data-id and data-extra
    result = result.replace(
        /<span[^>]+class="vps-embed-placeholder"[^>]+data-type="([^"]+)"[^>]+data-id="([^"]+)"[^>]+data-extra="([^"]*)"[^>]*>.*?<\/span>/g,
        (_match, type, id, extra) => {
            if (extra) {
                return `<!--vps:embed:${type}:${id}:${extra}-->`;
            }
            return `<!--vps:embed:${type}:${id}-->`;
        },
    );
    return result;
}
