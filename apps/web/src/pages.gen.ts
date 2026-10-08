// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages } from 'waku/router'

// prettier-ignore
type Page =
  | { path: '/docs/authority'; render: 'static' }
  | { path: '/docs/authority/version-1'; render: 'static' }
  | { path: '/docs/components/common-claim'; render: 'static' }
  | { path: '/docs/components/discovery-records'; render: 'static' }
  | { path: '/docs/components/lifecycle'; render: 'static' }
  | { path: '/docs/components/proof-envelope'; render: 'static' }
  | { path: '/docs/components/proof-key'; render: 'static' }
  | { path: '/docs/components/verification-descriptor'; render: 'static' }
  | { path: '/docs/components/verification-results'; render: 'static' }
  | { path: '/docs/how-verification-works'; render: 'static' }
  | { path: '/docs'; render: 'static' }
  | { path: '/docs/methods/account-signature/eip155'; render: 'static' }
  | { path: '/docs/methods/account-signature'; render: 'static' }
  | { path: '/docs/methods/dns-txt'; render: 'static' }
  | { path: '/docs/methods/https-origin'; render: 'static' }
  | { path: '/docs/methods'; render: 'static' }
  | { path: '/implementers/authority'; render: 'static' }
  | { path: '/implementers/authority/version-1'; render: 'static' }
  | { path: '/implementers/claim-digest'; render: 'static' }
  | { path: '/implementers/common-claim'; render: 'static' }
  | { path: '/implementers/discovery-records'; render: 'static' }
  | { path: '/implementers'; render: 'static' }
  | { path: '/implementers/lifecycle'; render: 'static' }
  | { path: '/implementers/methods/account-signature/eip155'; render: 'static' }
  | { path: '/implementers/methods/account-signature'; render: 'static' }
  | { path: '/implementers/methods/dns-txt'; render: 'static' }
  | { path: '/implementers/methods/https-origin'; render: 'static' }
  | { path: '/implementers/methods'; render: 'static' }
  | { path: '/implementers/proof-envelope'; render: 'static' }
  | { path: '/implementers/proof-key'; render: 'static' }
  | { path: '/implementers/proof-retrieval/arweave'; render: 'static' }
  | { path: '/implementers/proof-retrieval/https'; render: 'static' }
  | { path: '/implementers/proof-retrieval'; render: 'static' }
  | { path: '/implementers/proof-retrieval/inline'; render: 'static' }
  | { path: '/implementers/proof-retrieval/ipfs'; render: 'static' }
  | { path: '/implementers/proof-retrieval/ipns'; render: 'static' }
  | { path: '/implementers/proof-retrieval/sia'; render: 'static' }
  | { path: '/implementers/proof-retrieval/swarm'; render: 'static' }
  | { path: '/implementers/proof-retrieval/tor'; render: 'static' }
  | { path: '/implementers/signatures'; render: 'static' }
  | { path: '/implementers/verification-algorithm'; render: 'static' }
  | { path: '/implementers/verification-descriptor'; render: 'static' }
  | { path: '/implementers/verification-results'; render: 'static' }
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
