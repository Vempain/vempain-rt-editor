# @vempain/vempain-rt-editor

React component library for Vempain rich text editing.

## What this package contains

- `RichTextEditor` extracted from `vempain-admin-frontend`
- Full embed editor suite (gallery/image/hero/video/audio/youtube/music/gps/last/word-cloud/today-random/collapse/carousel)
- Embed tag parsing/building helpers from `embedTools`

## Provider-based integration

The editor no longer imports admin frontend services directly. Host apps must inject provider callbacks via `dataProviders`.

```tsx
import {RichTextEditor, type EmbedDataProviders} from '@vempain/vempain-rt-editor';

const providers: EmbedDataProviders = {
    findGalleries: (params) => galleryAPI.findPageableList(params),
    getPagedSiteFiles: (params) => siteFileAPI.getPagedSiteFiles(params),
    getAllDataSets: (params) => dataAPI.getAllDataSets(params),
};

<RichTextEditor value={value} onChange={setValue} dataProviders={providers}/>
```

Gallery providers receive a zero-based `page`, `size`, sorting, and optional `search` value. The editor requests the first page when opened or searched and
requests subsequent pages as the gallery dropdown is scrolled.

The optional `onEmbedsChange` prop receives the `EmbedDescriptor` list of the canonical content, in document order, whenever the content changes and once
per value supplied from outside. Hosts use it for bookkeeping that follows the embeds, such as the galleries a page links to, instead of parsing the HTML
themselves.

## Page style editing

`PageStyleEditor` edits the custom CSS of a page (the string the host previews through the editor's `pageStyle` prop). It is a controlled
field (`value`, `onChange(css)`) with two modes the author switches between: the CSS text, and a visual mode that lists the rules as
cards where the element is picked from the CSS elements of a page (`.vps-page-canvas`, headings, paragraphs, links, lists, tables, images,
the embed containers, `:root` for the website's variables) and every property gets a fitting control (colour picker, value lists, text).
Comments, `@media` and other at-rules and nested rules are kept as written and edited in CSS mode.

```tsx
import {PageStyleEditor, RichTextEditor} from '@vempain/vempain-rt-editor';

<RichTextEditor value={body} onChange={setBody} pageStyle={pageStyle}/>
<PageStyleEditor value={pageStyle} onChange={setPageStyle}/>
```

## Scripts

- `yarn build` - Build TS output to `dist/`
- `yarn lint` - Run ESLint
- `yarn lint:fix` - Run ESLint with fixes

## Local checks

```bash
npm install
npx tsc -p tsconfig.build.json
npx eslint .
```

## Word cloud embed usage

1. In the toolbar, click **Cloud**.
2. Configure WordCloud options with dedicated form fields (including explicit `width`/`height` in pixels and separate layout settings).
3. Use JSON only for the optional `style` field.
4. Save the embed.

Example stored tag:

```html
<!--vps:embed:word_cloud:{"width":800,"height":500,"shape":"circle","layout":{"fontSize":[14,56],"spiral":"rectangular","padding":1,"size":[800,500]},"fontSize":[14,56],"spiral":"rectangular","padding":1}-->
```

The website backend injects the `data` array at page request time, so editors should not include it manually.

## Today random embed usage

1. In the toolbar, click **Today**.
2. Configure embed options as JSON (without `images` or `pages`).
3. Save the embed.

Example stored tag:

```html
<!--vps:embed:today_random:{"title":"On this day"}-->
```

The website backend injects the `images` and `pages` arrays at page request time.
