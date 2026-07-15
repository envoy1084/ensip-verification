# Record Verification

This repository contains the specification and companion documentation for
record-scoped verification of external targets represented by ENS resolver
records.

## Docs App

The ENSIP draft and companion method profiles live in
[apps/web/src/pages](./apps/web/src/pages).

| Area               | Location                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Introduction       | [apps/web/src/pages/index.mdx](./apps/web/src/pages/index.mdx)                                                                           |
| Source docs        | [apps/web/src/pages/docs](./apps/web/src/pages/docs)                                                                                     |
| Specification      | [apps/web/src/pages/docs/spec](./apps/web/src/pages/docs/spec)                                                                           |
| Method profiles    | [apps/web/src/pages/docs/methods](./apps/web/src/pages/docs/methods)                                                                     |
| Record guides      | [apps/web/src/pages/docs/records](./apps/web/src/pages/docs/records)                                                                     |
| Reference          | [apps/web/src/pages/docs/reference](./apps/web/src/pages/docs/reference)                                                                 |
| Proof schema asset | [apps/web/public/schemas/ens-record-verification-proof.schema.json](./apps/web/public/schemas/ens-record-verification-proof.schema.json) |
| Test vectors       | [apps/web/public/test-vectors](./apps/web/public/test-vectors)                                                                           |

Run the docs site with:

```sh
pnpm --dir apps/web dev
```

Build the docs site with:

```sh
pnpm --dir apps/web build
```

Research notes live in [research/](./research/README.md).
