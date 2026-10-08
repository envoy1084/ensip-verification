# Record Verification

This repository contains the ENS Record Verification documentation site.
The previous SDK and demo have been removed while the documentation is rebuilt
for readers and implementers.

## Documentation

Previous drafts are preserved under
[apps/web/src/pages/internal](./apps/web/src/pages/internal) and served at
`/internal/*`:

- `/internal/docs`: protocol concepts, components, methods, and walkthrough.
- `/internal/references`: implementation requirements and conformance plans.
- `/internal/sdk-readme` and `/internal/sdk-roadmap`: historical SDK notes.

The `/docs` and `/references` routes are available for the new documentation.

## Development

```sh
pnpm install
pnpm --dir apps/web dev
```

Validate the repository with `pnpm check`, or build the site with
`pnpm --dir apps/web build`.
