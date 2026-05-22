# @vempain/vempain-rt-editor

React component library for Vempain rich text editing.

## What this package contains

- `RichTextEditor` extracted from `vempain-admin-frontend`
- Full embed editor suite (gallery/image/hero/video/audio/youtube/music/gps/last/collapse/carousel)
- Embed tag parsing/building helpers from `embedTools`

## Provider-based integration

The editor no longer imports admin frontend services directly. Host apps must inject provider callbacks via `dataProviders`.

```tsx
import {RichTextEditor, QueryDetailEnum, type EmbedDataProviders} from '@vempain/vempain-rt-editor';

const providers: EmbedDataProviders = {
    findGalleries: (params) => galleryAPI.findAll(params),
    getPagedSiteFiles: (params) => siteFileAPI.getPagedSiteFiles(params),
    getAllDataSets: (params) => dataAPI.getAllDataSets(params),
};

<RichTextEditor value={value} onChange={setValue} dataProviders={providers}/>
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
