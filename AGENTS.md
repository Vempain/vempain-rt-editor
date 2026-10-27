# AGENTS.md

## Project Snapshot

- Package: `@vempain/vempain-rt-editor` (React 19 + TypeScript library, ESM output) (`package.json`).
- Main public surface is `RichTextEditor` + embed utilities/types re-exported from `src/index.ts`.
- This repo is a library, not an app: embed data comes from host-provided callbacks, never from internal API clients.
- Public usage docs are mirrored in `vempain-site` (`src/components/RtEditor.tsx`) and the host-integration guide is `AGENTS.integration.md`; keep the
  editor props, exported helpers, and provider contract aligned with both.

## Architecture and Data Flow

- `src/RichTextEditor.tsx` is the orchestration hub: toolbar actions -> editor DOM mutations -> HTML sync -> `onChange`.
- `onEmbedsChange` is the second, optional output: the `EmbedDescriptor` list of the canonical content (`parseEmbeds`), reported with every
  `onChange` and once per externally supplied `value`. It stays generic (all embed types, document order) so hosts such as the admin
  frontend can derive their own relations (page -> gallery links) from it; never add host-specific filtering to the editor.
- Canonical content is embed-comment HTML (for example `<!--vps:embed:gallery:7-->`), not placeholder spans.
- WYSIWYG mode uses placeholder spans via `convertTagsToPlaceholders`; source mode edits raw HTML directly.
- Conversion/parsing rules live in `src/tools/embedTools.ts`; keep UI placeholder behavior aligned with parser behavior.
- Embed dialogs are split by type under `src/embeds/`; many are thin wrappers over shared selectors:
    - site files: `CommonSiteFileSelectorModal.tsx` (image/hero/video/audio)
    - data sets: `CommonDataSetSelectorModal.tsx`
- Unpublished resources: `GalleryVO`, `SiteFileResponse` and `DataSummaryResponse` carry the optional `published` timestamp of the admin
  database (`PublishedTimestamp`). The gallery, site file and data set dialogs show `UnpublishedWarning` (`src/embeds/UnpublishedWarning.tsx`,
  `.vps-unpublished-warning`, a tooltip "Not yet published to the website") next to the label and the "Selected:" line of every resource
  whose `published` is explicitly `null`; an absent field means the host does not know and shows no mark (`isUnpublished`). The editor
  never blocks the insert, it only warns. The link dialog needs no mark: its targets come from the site database and are published by
  definition.
- Data provider injection path: `RichTextEditor` prop `dataProviders` -> `EmbedDataProvider` context (`src/embeds/EmbedDataContext.tsx`) -> embed dialogs.
- Page style preview: the optional `pageStyle` prop is the custom CSS of the page being edited (`page_style` of the admin page). The
  canvas (the contentEditable div, also in read-only mode) carries `PAGE_CANVAS_CLASS` (`vps-page-canvas`, the class of the website's page
  canvas) plus a per-instance scope class, and the CSS is rendered in a `<style data-testid="vps-page-style">` wrapped in
  `@scope (.<scope class>)` so the host application is never restyled (`src/tools/pageStyleTools.ts`: `sanitizePageStyle` trims and
  neutralises `</style`, `scopePageStyle` wraps). Site-wide rules (`:root {...}`) therefore show no effect in the preview, only on the
  website. The helpers and the class are exported for hosts.
- Internal links: the optional provider `findInternalLinks({search, limit})` (`InternalLinkTarget[]`: `href`, `label`, `kind?`) turns the URL
  field of the link dialog into an `AutoComplete` (`.vps-link-target-search`) that asks the host when the dialog opens and, debounced
  (`LINK_SEARCH_DEBOUNCE_MS`), for the typed text; a picked target fills the href and, when the user typed no link text, the label. The
  editor never decides what may be linked: the host offers only what exists on the website and builds the hrefs. Without the provider the
  dialog is the plain URL field (`RichTextEditor.links.test.tsx`).

## Code Patterns Specific to This Repo

- Toolbar buttons use `onMouseDown` + `preventDefault()` (not `onClick`) to preserve text selection before modal open/edit actions.
- Selection persistence for modal workflows is explicit (`saveSelection` / `restoreSelection` refs in `RichTextEditor.tsx`).
- Embed placeholders are clickable edit handles (`.vps-embed-placeholder`) with `data-type` plus either `data-content` or `data-id`/`data-extra`.
- Collapse/carousel tags are JSON-in-comment payloads; parser uses bracket-depth scanning (not naive regex) for robustness.
- User-provided embed/link content is sanitized with delimiter stripping (`stripCommentTags`) and URL scheme checks + `DOMPurify`.
- When moving existing files from one location to another and the files have already been added to the git, use `git mv` to preserve the file history. If the
  files have not been added to git, you can use `mv` or your file explorer to move them, and then add the changes to git with `git add`.

## Testing and Debugging Workflow

- Primary commands from `package.json`:
    - `yarn test` / `yarn test:watch` / `yarn test:coverage`
    - `yarn lint` / `yarn lint:fix`
    - `yarn build`
- Jest uses `ts-jest` + jsdom and has non-obvious setup in `src/setupTests.ts` (MessageChannel, ResizeObserver, matchMedia, getComputedStyle patching).
- `rc-virtual-list` is mocked in `__mocks__/rc-virtual-list.tsx`; tests rely on `data-testid="virtual-list"` for scroll simulation.
- Use `src/test-utils/renderWithProviders.tsx` for component tests; it injects `EmbedDataProvider` and provider mocks.
- Existing tests are example-driven and granular; follow style in `src/__tests__/RichTextEditor.test.tsx` and `src/__tests__/tools/embedTools.test.ts`.
- Test files must all be placed in a separate directory under src called `__tests__` folders and named `*.test.ts` / `*.test.tsx` for Jest discovery. Under the
  main directory of src/__tests__/ are subfolders reflecting the main src structure (for example, `src/__tests__/embeds/` for embed dialog tests and
  `src/__tests__/tools/` for parser tests).
- All tasks must always be validated by running the test suite, coverage and linting before pushing commits or creating pull requests. Use `yarn test`,
  `yarn test:coverage` and `yarn lint` for this purpose. If you want to automatically fix linting issues, you can use `yarn lint:fix`. All errors and warnings
  must be resolved before the task can be considered complete.
- `yarn lint` is type-aware (`parserOptions.projectService`) and fails on `@typescript-eslint/no-deprecated`: any use of functionality that the type
  declarations mark `@deprecated` (Ant Design props, DOM or library APIs) must be replaced by the documented successor. CI runs it before the build.
- Treat all deprecation warnings as required maintenance work: whenever `yarn test`, `yarn test:coverage`, `yarn lint`, or build output reports deprecated
  APIs/props/behavior, update the implementation and tests immediately so no deprecation warnings remain (same rule as in `vempain-rt-renderer`).
- Do not add TypeScript `enum`; use `as const` objects like the other Vempain frontends.

## Integration and Release Notes

- Host apps must pass provider callbacks compatible with `EmbedDataProviders` in `src/types.ts`.
- CI delegates to a reusable workflow (`.github/workflows/ci.yaml` -> `Vempain/vempain-workflows/.../frontend-library.yaml`).
- `prebuild`/`build:production` run `node generateBuildInfo.js`, which writes `src/buildInfo.json` (a derived artifact, excluded from the published
  `dist/`).
- Package publishes only `dist/` artifacts (`package.json` `files` and `exports`).

## Tag ACL rule

Tags are metadata, not ACL-bearing resources. Tag entities have no ACL information, so tag list, search, and mutation endpoints must not perform ACL checks on tags. ACL checks apply only to resources that explicitly carry an ACL.
