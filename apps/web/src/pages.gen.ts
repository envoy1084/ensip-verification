// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages } from 'waku/router'

// prettier-ignore
type Page =
  | { path: '/'; render: 'static' }
  | { path: '/internal/docs/components/authority'; render: 'static' }
  | { path: '/internal/docs/components/claims-and-signatures'; render: 'static' }
  | { path: '/internal/docs/components/discovery-records'; render: 'static' }
  | { path: '/internal/docs/components/lifecycle'; render: 'static' }
  | { path: '/internal/docs/components/results'; render: 'static' }
  | { path: '/internal/docs/components/verification-descriptor'; render: 'static' }
  | { path: '/internal/docs'; render: 'static' }
  | { path: '/internal/docs/methods/account-signature'; render: 'static' }
  | { path: '/internal/docs/methods/dns-txt'; render: 'static' }
  | { path: '/internal/docs/methods/https-origin'; render: 'static' }
  | { path: '/internal/docs/methods/overview'; render: 'static' }
  | { path: '/internal/docs/reference/references'; render: 'static' }
  | { path: '/internal/docs/walkthrough'; render: 'static' }
  | { path: '/internal'; render: 'static' }
  | { path: '/internal/references/claims-envelopes-and-signatures'; render: 'static' }
  | { path: '/internal/references/conformance-vectors'; render: 'static' }
  | { path: '/internal/references/data-types-and-encoding'; render: 'static' }
  | { path: '/internal/references/discovery-and-descriptor'; render: 'static' }
  | { path: '/internal/references/ens-snapshot-and-authority'; render: 'static' }
  | { path: '/internal/references'; render: 'static' }
  | { path: '/internal/references/lifecycle-and-results'; render: 'static' }
  | { path: '/internal/references/method-account-signature-eip155'; render: 'static' }
  | { path: '/internal/references/method-dns-txt'; render: 'static' }
  | { path: '/internal/references/method-https-origin'; render: 'static' }
  | { path: '/internal/references/verification-algorithm'; render: 'static' }
  | { path: '/internal/sdk-readme'; render: 'static' }
  | { path: '/internal/sdk-roadmap'; render: 'static' }

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>
  }
  interface CreatePagesConfig {
    pages: Page
  }
}
