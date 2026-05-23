# AGENTS.md

## Project Snapshot

- Package: `@vempain/vempain-rt-editor` (React 19 + TypeScript library, ESM output) (`package.json`).
- Main public surface is `RichTextEditor` + embed utilities/types re-exported from `src/index.ts`.
- This repo is a library, not an app: embed data comes from host-provided callbacks, never from internal API clients.

## Architecture and Data Flow

- `src/RichTextEditor.tsx` is the orchestration hub: toolbar actions -> editor DOM mutations -> HTML sync -> `onChange`.
- Canonical content is embed-comment HTML (for example `<!--vps:embed:gallery:7-->`), not placeholder spans.
- WYSIWYG mode uses placeholder spans via `convertTagsToPlaceholders`; source mode edits raw HTML directly.
- Conversion/parsing rules live in `src/tools/embedTools.ts`; keep UI placeholder behavior aligned with parser behavior.
- Embed dialogs are split by type under `src/embeds/`; many are thin wrappers over shared selectors:
    - site files: `CommonSiteFileSelectorModal.tsx` (image/hero/video/audio)
    - data sets: `CommonDataSetSelectorModal.tsx`
- Data provider injection path: `RichTextEditor` prop `dataProviders` -> `EmbedDataProvider` context (`src/embeds/EmbedDataContext.tsx`) -> embed dialogs.

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
- Existing tests are example-driven and granular; follow style in `src/__tests__/RichTextEditor.test.tsx` and `src/tools/__tests__/embedTools.test.ts`.
- Test files must all be placed in a separate directory under src called `__tests__` folders and named `*.test.ts` / `*.test.tsx` for Jest discovery. Under the
  main directory of src/__tests__/ are subfolders reflecting the main src structure (for example, `src/__tests__/embeds/` for embed dialog tests and
  `src/__tests__/tools/` for parser tests).
- All tasks must always be validated by running the test suite, coverage and linting before pushing commits or creating pull requests. Use `yarn test`,
  `yarn test:coverage` and `yarn lint` for this purpose. If you want to automatically fix linting issues, you can use `yarn lint:fix`.

## Integration and Release Notes

- Host apps must pass provider callbacks compatible with `EmbedDataProviders` in `src/types.ts`.
- CI delegates to a reusable workflow (`.github/workflows/ci.yaml` -> `Vempain/vempain-workflows/.../frontend-library.yaml`).
- `build:production` references `generateBuildInfo.cjs`, while repository contains `generateBuildInfo.js`; verify release script expectations before changing
  build/version flow.
- Package publishes only `dist/` artifacts (`package.json` `files` and `exports`).

