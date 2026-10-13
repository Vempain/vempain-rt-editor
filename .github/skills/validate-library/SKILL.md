---
name: validate-library
description: Validate the rich-text editor library (lint, tests, coverage, build, deprecation warnings, file moves with git mv). Use before reporting any change as done.
---

# Validate vempain-rt-editor

- Commands: `yarn lint` (or `yarn lint:fix`), `yarn test`, `yarn test:coverage`, `yarn build`. All errors and warnings must be resolved; a
  deprecation warning from tests, lint or build is required maintenance, fix it in the same change.
- Jest: `ts-jest` + jsdom with the stubs in `src/setupTests.ts` (MessageChannel, ResizeObserver, matchMedia, getComputedStyle);
  `__mocks__/rc-virtual-list.tsx` provides `data-testid="virtual-list"`. Tests only in `src/__tests__/` mirroring `src/`.
- No TypeScript `enum`. Move tracked files with `git mv`.
- `prebuild` writes `src/buildInfo.json` (derived, not published); only `dist/` is published. CI is `frontend-library.yaml` of
  `vempain-workflows`; bump `VERSION` for a release and update `vempain-admin-frontend` and the `vempain-site` docs.
