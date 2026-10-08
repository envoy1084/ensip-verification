# Record Verification

This repository contains the ENS Record Verification documentation site for
readers and implementers.

## Documentation

These guides are the source of truth for the proposal:

- `/docs`: concepts, methods, and a complete verification walkthrough.
  Source: [Learn](./apps/web/src/pages/docs).
- `/implementers`: algorithms, formats, retrieval, and method requirements.
  Source: [For Implementers](./apps/web/src/pages/implementers).

Pending protocol decisions are identified in the relevant guides.

## Development

```sh
pnpm install
pnpm --dir apps/web dev
```

Validate the repository with `pnpm check`, or build the site with
`pnpm --dir apps/web build`.
