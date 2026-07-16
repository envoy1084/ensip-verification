// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages } from 'waku/router'

// prettier-ignore
type Page =
  | { path: '/docs/components/authority'; render: 'static' }
  | { path: '/docs/components/claims-and-signatures'; render: 'static' }
  | { path: '/docs/components/discovery-records'; render: 'static' }
  | { path: '/docs/components'; render: 'static' }
  | { path: '/docs/components/lifecycle'; render: 'static' }
  | { path: '/docs/components/results'; render: 'static' }
  | { path: '/docs/components/verification-descriptor'; render: 'static' }
  | { path: '/docs'; render: 'static' }
  | { path: '/docs/methods/account-signature'; render: 'static' }
  | { path: '/docs/methods/dns-txt'; render: 'static' }
  | { path: '/docs/methods/https-origin'; render: 'static' }
  | { path: '/docs/methods/overview'; render: 'static' }
  | { path: '/docs/reference/references'; render: 'static' }
  | { path: '/docs/walkthrough'; render: 'static' }
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
