# Integrating `@vempain/vempain-rt-editor`

This document is an implementation guide for an AI agent integrating the Vempain rich-text editor into a new React frontend. The package is an ESM TypeScript
component library published to GitHub Packages.

## Resources

- Package repository: https://github.com/Vempain/vempain-rt-editor
- Renderer repository: https://github.com/Vempain/vempain-rt-renderer
- Example editor host: https://github.com/Vempain/vempain-admin-frontend
- Rich-text renderer host: https://github.com/Vempain/vempain-website-frontend

Read `src/index.ts`, `src/RichTextEditor.tsx`, and `src/types.ts` in the package when a published type declaration differs from this guide. The public API is
intentionally re-exported from the package root.

## Installation

The package is published in the GitHub Packages npm registry. Configure npm/Yarn authentication for the scope before installing:

```bash
yarn config set npmScopes.vempain.npmRegistryServer https://npm.pkg.github.com
yarn add @vempain/vempain-rt-editor
```

The host application must provide these peer dependencies:

- `react` and `react-dom` 19
- `antd` 6
- `@ant-design/icons` 6
- `dompurify` 3
- `rc-virtual-list` 3

Use versions compatible with the application instead of blindly copying the package's development dependencies. The editor itself does not create HTTP clients
and does not know the host's API base URL.

## Public component

```tsx
import {RichTextEditor} from '@vempain/vempain-rt-editor';

export function PageBodyEditor({body, saveBody}: { body: string; saveBody: (body: string) => void }) {
    return (
            <RichTextEditor
                    value={body}
                    onChange={saveBody}
                    dataProviders={{
                        findGalleries: (params) => galleryApi.findPageableList(params),
                        getPagedSiteFiles: (params) => fileApi.findPageable(params),
                        getAllDataSets: (params) => dataApi.findAll(params)
                    }}
            />
    );
}
```

`RichTextEditor` props:

| Prop             | Type                                  | Meaning                                                                                                                                                                                                                                                                    |
|------------------|---------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `value`          | `string \| undefined`                 | Canonical HTML content. Embed tags are stored as HTML comments.                                                                                                                                                                                                            |
| `onChange`       | `(value: string) => void`             | Called whenever the content changes; persist this string, not the rendered placeholder DOM.                                                                                                                                                                                |
| `onEmbedsChange` | `(embeds: EmbedDescriptor[]) => void` | Called with the embeds of the canonical content, in document order, whenever the content changes and once when a `value` arrives from outside (mount, form reset). Lets the host derive data from the embeds without parsing the HTML; see below.                          |
| `readOnly`       | `boolean`                             | Hides editing controls and makes the editor non-editable. Defaults to `false`.                                                                                                                                                                                             |
| `pageStyle`      | `string \| null`                      | The custom CSS of the page being edited. Previewed on the editing canvas only: the canvas carries the `vps-page-canvas` class of the website's page canvas and the rules are scoped to it with `@scope`, so the host UI is never restyled. Blank or null previews nothing. |
| `dataProviders`  | `Partial<EmbedDataProviders>`         | Host callbacks used by embed selector dialogs.                                                                                                                                                                                                                             |

`onEmbedsChange` is the hook for host-side bookkeeping that depends on the embeds, for example the list of galleries a page depends on. The
editor itself knows nothing about such relations: it reports every embed (`gallery`, `image`, `hero` with its `heroType`, …) and the host
filters what it needs. The admin frontend derives the page's gallery links from the `gallery` embeds and the `hero` embeds of type
`carousel` this way and saves them together with the page. Keep the callback stable with `useCallback` when it is defined in a component;
the editor parses the content only when the prop is present.

For preview-only use, pass `readOnly` and omit providers if no selector dialogs are needed:

```tsx
<RichTextEditor value={page.body} readOnly/>
```

## Data providers

The editor accepts partial providers so a host can expose only the selectors it needs. The complete exported `EmbedDataProviders` contract is:

```ts
interface EmbedDataProviders {
    findGalleries: (params: { page: number; size: number; sort_by?: string; direction?: 'ASC' | 'DESC'; search?: string }) => Promise<PagedResponse<GalleryVO>>;
    getPagedSiteFiles: (
            params: Record<string, string | number | boolean | undefined>
    ) => Promise<PagedResponse<SiteFileResponse>>;
    getAllDataSets: (params?: DataSetQueryParams) => Promise<DataSummaryResponse[]>;
    findInternalLinks?: (params: { search: string; limit?: number }) => Promise<InternalLinkTarget[]>;
}
```

`findInternalLinks` is optional. When it is present the URL field of the link dialog suggests internal targets: the editor calls it with an
empty search when the dialog opens and again, after a short pause, with whatever the user typed; the host answers with
`InternalLinkTarget` objects (`href`, `label`, optional `kind` such as `page` or `file`). A picked target becomes the link's href and, when
the user typed no link text, its label. The host decides what is offered, for example only the pages and files published on the website,
and builds hrefs the website resolves (the admin frontend uses `/pages/<path>` and `/file/<path>`). Any URL can still be typed by hand.

The expected response shapes are also exported from the package. `GalleryVO` contains `id` and
`short_name`; `SiteFileResponse` contains `id` and `file_name`; `PagedResponse` contains
`content`, `page`, and `total_pages`; and `DataSummaryResponse` contains `identifier` plus optional `type` and `description`.
All three resource shapes accept an optional `published` timestamp (`PublishedTimestamp`, `string | null`): send the "last published to
the website" column of your database and the dialogs mark every resource whose value is `null` with a warning triangle ("Not yet
published to the website"); leave the field out when you do not track it and nothing is marked. Adapt the callbacks to the host
API's naming and response shape at this boundary.

Provider usage by embed selector:

- Gallery embeds use `findGalleries`.
- Image, hero, video, and audio embeds use `getPagedSiteFiles`.
- Music and GPS time-series embeds use `getAllDataSets`.
- The link dialog uses `findInternalLinks` when the host provides it.

`QueryDetailEnum` values are `MINIMAL`, `UNPOPULATED`, and `FULL`. Keep provider functions stable with `useMemo` or module-level constants when passing them
from a component.

## Stored content and embed tags

The editor stores canonical HTML containing Vempain comment tags, for example:

```html
<p>Summer collection</p><!--vps:embed:image:42-->
```

Do not store the editor's WYSIWYG placeholder spans. The package converts tags to clickable placeholders while editing and converts them back before calling
`onChange`. Supported embed families include gallery, image, hero, video, audio, YouTube, music, GPS time series, last-items, word cloud, today-random,
collapse, and carousel.

Hero embeds support an image, video, or gallery carousel selected by the editor's Ant Design radio group. The editor uses
`getPagedSiteFiles` with `file_type: IMAGE` or `VIDEO` for the first two choices and `findGalleries` for the carousel choice. New hero tags have the form
`<!--vps:embed:hero:[id]:type:[image|video|carousel]-->`. When an existing `<!--vps:embed:hero:[id]-->` tag is opened, it is treated as an image and saved back
in the typed format. Carousel heroes additionally store `:duration:[seconds]:transition:[fade|slide]`; the editor defaults to 5 seconds and a slide transition.

The package also exports `buildCarouselTag`, `buildEmbedTag`,
`convertPlaceholdersToTags`, `convertTagsToPlaceholders`, `parseCarouselParams`, and
`parseEmbeds`, together with their associated types. Use these helpers instead of duplicating tag parsing or string construction in the host application.

## Host integration checklist

1. Install the package from GitHub Packages and ensure all peer dependencies are installed.
2. Map the host's gallery, site-file, and dataset APIs to `EmbedDataProviders`.
3. Pass the current canonical HTML through `value` and persist every `onChange` value; use `onEmbedsChange` for host data that follows
   the embeds (such as which galleries a page links to) instead of parsing the HTML in the host.
4. Render the editor inside the host's Ant Design/theme providers.
5. Use `readOnly` for publish previews; do not use a separate HTML conversion pipeline.
6. Keep the corresponding renderer runtime configured in the public frontend; editor tags only become functional when the renderer has the required APIs.

The admin frontend is the reference integration: `PageEditor.tsx` and `PagePublish.tsx` define the provider mapping and editor usage pattern.
