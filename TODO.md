# Record Verification SDK v0

Ship `@thenamespace/record-verification` with complete Node and browser
verification for `https-origin.v1` and `dns-txt.v1`.

## Implemented

- [x] Expose the Promise-based `RecordVerification` client and
      `verifyRecord({ name, type, key })` result union.
- [x] Return expected failures as `{ success: false, error: { code, reason } }`
      while preserving unexpected defects as rejected promises.
- [x] Keep protocol workflows as Effects behind a small public facade.
- [x] Organize shared protocol logic under `core/`, authority algorithms under
      `authority/<version>/`, and each method under `methods/<method-version>/`.
- [x] Define injectable `EnsService`, `HttpService`, and `DnsService`
      capabilities with production Layers.
- [x] Use ENSForge exclusively for mainnet ENS reads, Universal Resolver/CCIP
      Read behavior, ownership, expiry, wrapping, and fuse state.
- [x] Reuse `@ensforge/core` for ENSIP-15 normalization, namehashing, and name
      analysis.
- [x] Resolve the record, discovery descriptor, authority, and authority
      signature against one ENS block and recheck canonicality before success.
- [x] Implement strict descriptor, proof-envelope, claim, lifecycle, EIP-712,
      EOA signature, and ERC-1271 validation.
- [x] Implement `https-origin.v1` with a hardened Node transport: WebPKI,
      redirect/content-coding rejection, bounded streaming, timeouts, DNS
      rebinding protection, and connected-peer checks.
- [x] Implement a browser Fetch transport with bounded streaming, explicit
      redirect/content-coding rejection, cancellation, and CORS-safe behavior.
- [x] Implement `dns-txt.v1` using DNS-over-HTTPS and local DNSSEC validation
      against the IANA root trust anchors.
- [x] Expose DNS proof preparation and TXT-record creation helpers.
- [x] Publish separate Node and browser entry points:
      `@thenamespace/record-verification` and
      `@thenamespace/record-verification/browser`.
- [x] Add focused Effect Vitest coverage for descriptors, targets, lifecycle,
      and both method workflows.
- [x] Keep internal services, registries, schemas, and adapters out of the
      public export surface.

## Required Before Publishing v0

- [ ] Freeze and document the remaining protocol policy decisions: ENS block
      finality/maximum age, CCIP consistency, cache semantics, and error
      precedence.
- [ ] Produce versioned conformance vectors for descriptor parsing, common
      claims, EIP-712 digests, proof keys, signatures, and lifecycle boundaries.
- [ ] Add deterministic integration fixtures for ENS snapshots, reorgs,
      wrapped/unwrapped authority cases, ERC-1271, hardened HTTP behavior, and
      signed DNSSEC zones.
- [ ] Add end-to-end positive and representative adversarial cases for both
      methods without testing Viem, ENSForge, or DNSSEC-library internals.
- [ ] Decide and document the browser security profile. Browsers cannot enforce
      the Node transport's connected-peer/IP policy, and HTTPS proof endpoints
      must permit CORS.
- [ ] Decide whether DNS evidence remains uncached in v0 or expose validated
      authenticated TTL freshness from the DNSSEC resolver.
- [ ] Add cancellation and total-deadline coverage across RPC, CCIP Read, HTTP,
      and DNS-over-HTTPS operations.
- [ ] Add package repository, homepage, keywords, support policy, and initial
      semver metadata; remove `private` only after the release gate passes.
- [ ] Run format, lint, typecheck, tests, build, `publint`, and a package dry run
      from a clean checkout.
- [ ] Inspect the packed tarball and test Node and browser imports from a fresh
      consumer project.
- [ ] Publish the experimental v0 package and matching protocol/vector version,
      then create the release tag.

## Later

- [ ] Add authenticated HTTP/DNS freshness if proof-result caching is enabled.
- [ ] Add bounded secure CNAME/DNAME following for DNS proofs if required.
- [ ] Design `account-signature.eip155.v1` only after the two v0 methods and
      their conformance vectors are stable.
