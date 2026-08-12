# Integrating `@vempain/vempain-rt-editor`

This document is an implementation guide for an AI agent integrating the Vempain rich-text editor into a new React frontend. The package is an ESM TypeScript
component library published to GitHub Packages.

## Resources

- Package repository: https://github.com/Vempain/vempain-rt-editor
- Renderer repository: https://github.com/Vempain/vempain-rt-renderer
- Example editor host: https://github.com/Vempain/vempain-admin-frontend
- Rich-text renderer host: https://github.com/Vempain/vempain-website

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
                        findGalleries: ({details}) => galleryApi.findAll({details}),
                        getPagedSiteFiles: (params) => fileApi.findPageable(params),
                        getAllDataSets: (params) => dataApi.findAll(params)
                    }}
            />
    );
}
```

`RichTextEditor` props:

| Prop            | Type                          | Meaning                                                                                     |
|-----------------|-------------------------------|---------------------------------------------------------------------------------------------|
| `value`         | `string \| undefined`         | Canonical HTML content. Embed tags are stored as HTML comments.                             |
| `onChange`      | `(value: string) => void`     | Called whenever the content changes; persist this string, not the rendered placeholder DOM. |
| `readOnly`      | `boolean`                     | Hides editing controls and makes the editor non-editable. Defaults to `false`.              |
| `dataProviders` | `Partial<EmbedDataProviders>` | Host callbacks used by embed selector dialogs.                                              |

For preview-only use, pass `readOnly` and omit providers if no selector dialogs are needed:

```tsx
<RichTextEditor value={page.body} readOnly/>
```

## Data providers

The editor accepts partial providers so a host can expose only the selectors it needs. The complete exported `EmbedDataProviders` contract is:

```ts
interface EmbedDataProviders {
    findGalleries: (params: { details: QueryDetailEnum }) => Promise<GalleryVO[]>;
    getPagedSiteFiles: (
            params: Record<string, string | number | boolean | undefined>
    ) => Promise<PagedResponse<SiteFileResponse>>;
    getAllDataSets: (params?: DataSetQueryParams) => Promise<DataSummaryResponse[]>;
}
```

The expected response shapes are also exported from the package. `GalleryVO` contains `id` and
`short_name`; `SiteFileResponse` contains `id` and `file_name`; `PagedResponse` contains
`content`, `page`, and `total_pages`; and `DataSummaryResponse` contains `identifier` plus optional `type` and `description`. Adapt the callbacks to the host
API's naming and response shape at this boundary.

Provider usage by embed selector:

- Gallery embeds use `findGalleries`.
- Image, hero, video, and audio embeds use `getPagedSiteFiles`.
- Music and GPS time-series embeds use `getAllDataSets`.

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

The package also exports `buildCarouselTag`, `buildEmbedTag`,
`convertPlaceholdersToTags`, `convertTagsToPlaceholders`, `parseCarouselParams`, and
`parseEmbeds`, together with their associated types. Use these helpers instead of duplicating tag parsing or string construction in the host application.

## Host integration checklist

1. Install the package from GitHub Packages and ensure all peer dependencies are installed.
2. Map the host's gallery, site-file, and dataset APIs to `EmbedDataProviders`.
3. Pass the current canonical HTML through `value` and persist every `onChange` value.
4. Render the editor inside the host's Ant Design/theme providers.
5. Use `readOnly` for publish previews; do not use a separate HTML conversion pipeline.
6. Keep the corresponding renderer runtime configured in the public frontend; editor tags only become functional when the renderer has the required APIs.

The admin frontend is the reference integration: `PageEditor.tsx` and `PagePublish.tsx` define the provider mapping and editor usage pattern.
