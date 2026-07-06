// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages } from 'waku/router'

// prettier-ignore
type Page =
  | { path: '/docs/guides/build-a-verifier'; render: 'static' }
  | { path: '/docs/guides/publish-a-verification'; render: 'static' }
  | { path: '/docs/guides/wallet-and-ui-guidelines'; render: 'static' }
  | { path: '/docs/methods/account-signature'; render: 'static' }
  | { path: '/docs/methods/contenthash-binding'; render: 'static' }
  | { path: '/docs/methods/dns-txt'; render: 'static' }
  | { path: '/docs/methods/https-origin'; render: 'static' }
  | { path: '/docs/methods/issuer-attestation'; render: 'static' }
  | { path: '/docs/methods/overview'; render: 'static' }
  | { path: '/docs/methods/service-account'; render: 'static' }
  | { path: '/docs/quickstart'; render: 'static' }
  | { path: '/docs/records/addresses'; render: 'static' }
  | { path: '/docs/records/agent-endpoints'; render: 'static' }
  | { path: '/docs/records/contenthash'; render: 'static' }
  | { path: '/docs/records/email'; render: 'static' }
  | { path: '/docs/records/social-accounts'; render: 'static' }
  | { path: '/docs/records/url'; render: 'static' }
  | { path: '/docs/reference/errors'; render: 'static' }
  | { path: '/docs/reference/glossary'; render: 'static' }
  | { path: '/docs/reference/references'; render: 'static' }
  | { path: '/docs/reference/schemas'; render: 'static' }
  | { path: '/docs/reference/test-vectors'; render: 'static' }
  | { path: '/docs/spec/authority-and-lifecycle'; render: 'static' }
  | { path: '/docs/spec/claims-and-signatures'; render: 'static' }
  | { path: '/docs/spec/discovery-records'; render: 'static' }
  | { path: '/docs/spec/ensip'; render: 'static' }
  | { path: '/docs/spec/overview'; render: 'static' }
  | { path: '/docs/spec/results-and-errors'; render: 'static' }
  | { path: '/docs/spec/verification-descriptor'; render: 'static' }
  | { path: '/'; render: 'static' }

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>
  }
  interface CreatePagesConfig {
    pages: Page
  }
}
