---
name: add-embed-type
description: Add or change an embed type of the Vempain rich-text editor (comment-tag syntax, placeholder conversion, dialog, data providers) together with the renderer, the hosts and the mirrored docs. Use for any embed syntax or dialog change.
---

# Add an embed type to vempain-rt-editor

1. Syntax: canonical content is embed-comment HTML (`<!--vps:embed:<type>:<payload>-->`); JSON payloads (collapse, carousel) are parsed with
   bracket-depth scanning, not regex. Define the conversion in `src/tools/embedTools.ts` (tag <-> placeholder span with `data-type` and
   `data-content` or `data-id`/`data-extra`) and keep `parseEmbeds` behaviour aligned with the placeholder behaviour.
2. Dialog under `src/embeds/`, usually a thin wrapper over `CommonSiteFileSelectorModal.tsx` (image/hero/video/audio) or
   `CommonDataSetSelectorModal.tsx` (data sets); data comes only from the host's `dataProviders` (`EmbedDataProviders` in `src/types.ts`)
   through `EmbedDataContext`, never from internal API clients.
3. Toolbar button in `src/RichTextEditor.tsx`: `onMouseDown` + `preventDefault()` (not `onClick`), save/restore the selection around the
   modal (`saveSelection`/`restoreSelection`). `onEmbedsChange` must keep reporting every embed type in document order with no
   host-specific filtering.
4. Sanitize user content: `stripCommentTags` for delimiters, URL scheme checks, `DOMPurify`.
5. Export new helpers/types from `src/index.ts`; the same type must be added to `vempain-rt-renderer` (`parseEmbeds`, component,
   `PageBodyRenderer`), to the hosts (`vempain-admin-frontend` PageEditor providers, `vempain-website-frontend` runtime) and to the
   mirrored docs in `vempain-site` (`src/components/RtEditor.tsx`) and `AGENTS.integration.md`.
6. Tests: `src/__tests__/tools/embedTools.test.ts` for parsing/conversion, `src/__tests__/embeds/` for the dialog (render with
   `src/test-utils/renderWithProviders.tsx`), `src/__tests__/RichTextEditor.test.tsx` for the toolbar flow; `rc-virtual-list` is mocked.
7. Bump `VERSION`; `yarn lint`, `yarn test`, `yarn test:coverage`, `yarn build` must be clean with no deprecation warnings.
