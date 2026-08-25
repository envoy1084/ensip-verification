# v0 Roadmap

Publish an experimental v0 SDK and an implementer reference for ENS record
verification. Develop them together: a milestone is complete only when its
normative reference pages, SDK behavior, conformance vectors, and tests agree.

## v0 Scope

- [ ] Mark the protocol and SDK as experimental until the v1 rules are frozen.
- [ ] Support Ethereum mainnet, common protocol `ensrv1`, and Authority
      Algorithm 1.
- [ ] Support `https-origin.v1` for ENS text records containing HTTPS URLs.
- [ ] Support `dns-txt.v1` for ENS text records containing HTTPS URLs.
- [ ] Freeze `account-signature.eip155.v1` as the only v0 account-signature
      profile, or select another single concrete profile before implementation.
- [ ] Decide and document the v0 runtime boundary. Prefer a fully conforming
      Node verifier first; expose browser support only where its DNS, CORS, and
      peer-address limitations are explicit.

## Implementer Reference Structure

Create a top-level **Implementers** navigation entry. Keep these pages normative
and concise; explanatory rationale remains in the existing protocol docs.

- [ ] **Overview and conformance** — supported versions, normative language,
      terminology, verifier requirements, and platform capabilities.
- [ ] **Data types and encoding** — ASCII and UTF-8, canonical integers,
      lowercase hex, addresses, bytes, timestamps, limits, and rejection rules.
- [ ] **Discovery and descriptor grammar** — record selectors, discovery-key
      mapping, ABNF, parsing procedure, canonical serialization, and method URI
      policies.
- [ ] **ENS snapshot and authority** — name normalization, namehash, pinned
      resolution, CCIP Read requirements, block metadata, reorg behavior, and
      normative Authority Algorithm 1 pseudocode.
- [ ] **Claims, envelopes, and signatures** — value bytes and hashes, closed JSON
      profile, EIP-712 type and domain, EOA/ERC-1271 validation, and proof-key
      derivation.
- [ ] **Lifecycle and results** — issuance, expiry, clock skew, effective
      validity, freshness, caching, result semantics, and diagnostics.
- [ ] **Verification algorithm** — one ordered, fail-closed algorithm joining all
      common and method-specific checks.
- [ ] **Method: `https-origin.v1`** — URL acceptance and target derivation,
      deterministic proof URL, HTTP/TLS/network policy, proof schema, lifetime,
      and browser limitations.
- [ ] **Method: `dns-txt.v1`** — hostname derivation, proof owner and base32 key,
      DNSSEC chain validation, alias behavior, TXT assembly, limits, freshness,
      and proof schema.
- [ ] **Method: `account-signature.eip155.v1`** — supported coin types and
      chains, CAIP-10 target derivation, proof URI retrieval, target EOA/ERC-1271
      signatures, lifetime, and revocation behavior.
- [ ] **Conformance vectors** — machine-readable positive, negative, boundary,
      cryptographic-intermediate, URL, JSON, authority, HTTP, DNSSEC, and
      signature cases.

## Paired Implementation Milestones

### 1. Formats and discovery

- [ ] Finish the data-types and discovery/descriptor reference pages.
- [ ] Implement SDK schemas and errors for protocol primitives, record
      selectors, discovery keys, descriptors, and canonical encodings.
- [ ] Add descriptor and encoding vectors and tests.

### 2. ENS snapshot and authority

- [ ] Finish the ENS snapshot and authority reference page.
- [ ] Implement ENSIP-15 normalization, namehash, pinned Universal Resolver
      reads, Ethereum client service, and Authority Algorithm 1.
- [ ] Test wrapped and unwrapped names, `.eth` expiry, subnames, reverse-name
      rejection, CCIP Read, and reorg handling.

### 3. Claims and common verification

- [ ] Finish the claims, lifecycle, results, and ordered-algorithm pages.
- [ ] Implement strict duplicate-aware JSON parsing, proof-envelope schemas,
      value hashing, EIP-712 hashing, proof keys, claim comparison, lifecycle
      checks, and authority EOA/ERC-1271 verification.
- [ ] Add complete intermediate cryptographic and time-boundary vectors.

### 4. HTTPS origin method

- [ ] Finish the `https-origin.v1` reference page and URL vectors.
- [ ] Implement target derivation, proof-location derivation, bounded HTTP
      retrieval, redirect/media-type/encoding checks, and Node network policy.
- [ ] Add positive and adversarial HTTP integration tests.

### 5. DNS TXT method

- [ ] Finish the `dns-txt.v1` reference page and DNSSEC vectors.
- [ ] Implement proof-owner derivation, base32 proof keys, TXT assembly, DNSSEC
      validation, alias handling, and freshness calculation.
- [ ] Add signed-zone fixtures and negative DNSSEC tests.

### 6. EVM account-signature method

- [ ] Freeze the exact `account-signature.eip155.v1` profile before coding it.
- [ ] Finish its implementer reference page and account vectors.
- [ ] Implement address-record decoding, chain and CAIP-10 derivation, proof URI
      retrieval, and target EOA/ERC-1271 verification.
- [ ] Add EOA, contract-wallet, wrong-chain, wrong-account, and revocation tests.

### 7. SDK orchestration and API

- [ ] Implement the Effect verification service and Layers for live and test
      transports.
- [ ] Expose a detailed Effect-native result and a minimal protocol-result
      projection.
- [ ] Define stable v0 error categories without presenting experimental
      diagnostic codes as protocol requirements.
- [ ] Add end-to-end fixtures for all three supported methods.

## v0 Publication Checklist

- [ ] Resolve or explicitly freeze every draft parameter used by v0, including
      normalization data, parser limits, HTTP encodings/timeouts, snapshot
      freshness/finality, diagnostics, and cache bounds.
- [ ] Ensure the SDK tests consume the same machine-readable vectors rendered by
      the implementer reference.
- [ ] Document public API, runtime support, security boundary, known limitations,
      and one example per method in the SDK README.
- [ ] Finalize package name, exports, license files, peer/dependency policy, and
      remove `private` only when ready to publish.
- [ ] Pass formatting, lint, typecheck, unit and integration tests, build,
      `publint`, package dry-run, docs build, and dead-link checks.
- [ ] Publish the implementer reference and the SDK as matching v0 versions, then
      tag the release and record the exact conformance-vector version.
