# SDK v0 Launch Roadmap

Publish an experimental Effect v4 SDK for verifying ENS record-control proofs.
The v0 release targets Node.js and supports `https-origin.v1`, `dns-txt.v1`,
and the draft `account-signature.eip155.v1` method.

## 1. Freeze v0 Behavior

- [ ] Pin the exact ENSIP-15 normalization data used by `ensrv1`.
- [ ] Set the maximum discovery-key and record-key byte lengths.
- [ ] Set finite JSON nesting, member-count, and string limits.
- [x] Fix v0 to Ethereum mainnet and ENSjs's Universal Resolver at
      `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`, without a custom-resolver
      override.
- [ ] Define ENS block finality, maximum snapshot age, and reorg policy.
- [ ] Define the CCIP Read consistency requirement for multiple offchain reads.
- [ ] Freeze HTTP content encodings, deadlines, cache behavior, and network
      address policy.
- [ ] Freeze diagnostic categories, precedence, and negative-cache behavior.
- [ ] Freeze `account-signature.eip155.v1` target-chain finality, maximum
      snapshot age, proof lifetime, and revocation behavior.
- [ ] Decide whether restored record or authority state can reactivate an
      unexpired proof.

## 2. SDK Foundations

- [x] Add Effect-compatible unit-test infrastructure and a package `test`
      script.
- [x] Establish feature-focused source folders and a deliberate root export
      facade.
- [x] Keep schemas, branded types, and schema errors in focused `schema/`
      modules.
- [x] Keep protocol constants and Effect-based derivation helpers in focused
      `protocol/` modules, with one clear responsibility per file.
- [x] Reuse Viem for hexadecimal conversion, ENS normalization, namehash, and
      DNS packet encoding instead of maintaining local equivalents.
- [x] Define branded protocol types without exposing wire-format strings to
      internal verification logic.
- [ ] Keep expected protocol failures typed with Effect schemas, but avoid
      wrapping straightforward Viem calls and non-failing checks in needless
      services or abstractions.
- [ ] Define stable detailed-result and failure-category models.
- [ ] Define the minimal protocol-result projection.
- [ ] Add injectable test implementations only for runtime boundaries that need
      deterministic behavior: HTTP, DNSSEC, clock, and chain state.
- [ ] Ensure Node-only implementations are isolated from browser-safe exports.

## 3. Encodings, Records, and Descriptors

- [x] Implement strict UTF-8 decoding and byte-limit helpers.
- [x] Implement canonical unsigned-decimal schemas and transforms.
- [x] Implement lowercase hexadecimal schemas and transforms.
- [x] Implement supported record-selector schemas.
- [x] Implement `recordType`, `recordKey`, and logical resolver-value
      derivation.
- [x] Implement discovery-key derivation for `text`, `addr`, `contenthash`,
      and `data`.
- [x] Implement the closed `ensrv1` descriptor parser.
- [x] Implement canonical descriptor serialization.
- [x] Implement exact authority-version, method-ID, and proof-URI validation.
- [x] Add positive, negative, duplicate-field, order, limit, and boundary tests.

## 4. ENS Snapshot and Authority

- [x] Implement ENSIP-15 normalization and namehash derivation.
- [x] Implement DNS wire-name encoding for Universal Resolver calls.
- [x] Define ENS snapshot, resolution, and expected read-failure schemas.
- [x] Add the fixed mainnet Universal Resolver address and strict `resolve` ABI.
- [x] Implement a focused internal `EnsService` over the caller-provided Viem
      `PublicClient`; do not add a generic Ethereum RPC service abstraction.
- [ ] Implement block selection with number, hash, timestamp, and canonicality
      checks.
- [ ] Implement focused owner, wrapper-state, resolver, and pinned Universal
      Resolver reads with Viem and strict ABI return decoding.
- [ ] Implement bounded EIP-3668 CCIP Read handling pinned to the evaluation
      block.
- [x] Resolve the target record and discovery record from one ENS snapshot.
- [ ] Define the authority-algorithm interface and immutable registry.
- [x] Implement Ethereum mainnet Authority Algorithm 1.
- [x] Handle wrapped and unwrapped `.eth` second-level names and exact expiry
      boundaries.
- [x] Handle wrapped emancipated and parent-controlled subnames.
- [ ] Reject reverse names, virtual names without an exact authority, zero
      owners, malformed returns, and unsupported authority versions.
- [ ] Recheck block canonicality before returning a positive result.
- [ ] Add tests for protocol behavior around snapshots, CCIP Read, reorgs,
      ownership, fuses, and expiry; do not duplicate Viem's own primitive tests.

## 5. Claims, Envelopes, and Authority Signatures

- [ ] Implement duplicate-aware raw JSON parsing before map construction.
- [ ] Implement the closed common proof-envelope schema.
- [ ] Implement the exact common-claim schema and live-field comparison.
- [ ] Implement resolver value-byte hashing for every supported record type.
- [ ] Implement the `ensrv1` EIP-712 domain, type hash, struct hash, and final
      digest.
- [ ] Implement deterministic proof-key derivation.
- [ ] Implement canonical 65-byte, low-`s` EOA authority-signature validation.
- [ ] Implement strict ERC-1271 authority-signature validation at the ENS block.
- [ ] Reject malformed ABI, raw four-byte ERC-1271 output, bad padding, trailing
      data, counterfactual contracts, and signature fallback.
- [ ] Add JSON, hashing, EIP-712, proof-key, EOA, and ERC-1271 tests with exact
      intermediate values.

## 6. Lifecycle and Results

- [ ] Implement one verifier-controlled `checkedAt` time per attempt.
- [ ] Implement future-skew, issuance, exclusive-expiry, and maximum-lifetime
      checks.
- [ ] Calculate `effectiveValidUntil` from claim, authority, and method bounds.
- [ ] Calculate `cacheUntil` using the five-minute ceiling and authenticated
      method freshness.
- [ ] Map expected malformed, invalid, expired, unsupported, unavailable, and
      policy-blocked failures into detailed non-positive results.
- [ ] Keep runtime defects and invalid SDK construction distinct from expected
      verification outcomes.
- [ ] Add exact time-boundary, overflow, expiry, and cache tests.

## 7. Extension Registries

- [ ] Define the verification-method interface around applicability, target
      derivation, evidence retrieval, proof validation, and freshness.
- [ ] Implement an immutable exact-ID method registry.
- [ ] Reject duplicate registrations during registry construction.
- [ ] Reject unknown authority and method identifiers without fallback.
- [ ] Give each method only its required runtime capabilities; use Effect
      services or Layers where they improve dependency injection, not by
      default.
- [ ] Verify that adding a new authority version or method does not require
      modifying the common verifier.

## 8. `https-origin.v1`

- [ ] Implement exact WHATWG HTTPS URL acceptance.
- [ ] Implement canonical origin target serialization.
- [ ] Implement deterministic well-known proof URL derivation.
- [ ] Define the security-hardened Effect HTTP client service.
- [ ] Implement credentialless GET, WebPKI validation, redirect rejection,
      status and media-type checks, and strict UTF-8 decoding.
- [ ] Enforce compressed-input, decoded-body, header, and deadline limits while
      streaming.
- [ ] Enforce globally reachable pre-connect and connected-peer address policy.
- [ ] Require the method proof to be exactly an empty object.
- [ ] Implement authenticated HTTP freshness and cache bounds.
- [ ] Add URL, IDN, port, IPv4, IPv6, redirect, SSRF, content-coding, timeout,
      streaming-limit, and end-to-end tests.

## 9. `dns-txt.v1`

- [ ] Implement canonical hostname target derivation and reject IP hosts.
- [ ] Implement lowercase unpadded base32 proof-key encoding.
- [ ] Implement proof-owner derivation and DNS wire-length validation.
- [ ] Define the Effect DNSSEC resolver service.
- [ ] Validate the complete chain to configured IANA root trust anchors.
- [ ] Implement bounded Secure CNAME and DNAME handling.
- [ ] Require exactly one terminal TXT RDATA and concatenate only its character
      strings.
- [ ] Enforce the 2,048-byte proof-envelope limit.
- [ ] Require the method proof to be exactly an empty object.
- [ ] Calculate authenticated DNS freshness from TTL age and every required
      RRSIG bound.
- [ ] Add signed-zone, rollover, alias, loop, multiple-TXT, expiry, insecure,
      bogus, indeterminate, and end-to-end tests.

## 10. `account-signature.eip155.v1`

- [ ] Implement ENSIP-11 coin-type to EIP-155 chain mapping.
- [ ] Require exact 20-byte EVM resolver values.
- [ ] Implement EIP-55 address and canonical CAIP-10 target derivation.
- [ ] Accept only the frozen descriptor proof-URI profile.
- [ ] Reuse the hardened bounded HTTP retrieval service.
- [ ] Define target-chain selection through configured clients only.
- [ ] Pin target code lookup and ERC-1271 calls to one target-chain block.
- [ ] Implement target EOA signature validation over `commonClaimDigest`.
- [ ] Implement strict target ERC-1271 validation without EOA fallback.
- [ ] Enforce target-chain freshness, finality, reorg, and cache policy.
- [ ] Add coin-type, CAIP-10, wrong-chain, wrong-account, EOA, contract-wallet,
      revocation, unavailable-chain, and end-to-end tests.

## 11. Verifier Orchestration

- [ ] Implement the ordered common verification procedure as an Effect workflow.
- [ ] Prevent proof retrieval before descriptor and method validation complete.
- [ ] Preserve one ENS snapshot across records, authority, code, and ERC-1271
      calls.
- [ ] Dispatch exact authority and method versions through their registries.
- [ ] Revalidate time, ENS canonicality, target-chain state, and method
      freshness immediately before a positive result.
- [ ] Expose `new RecordVerification({ publicClient })` as the Promise-based
      public boundary while keeping protocol workflows as Effects internally.
- [ ] Add `getText`, `getRecord`, `getAddress`, and `getContentHash` methods
      with a `verify` option that performs proof verification only when true.
- [ ] Translate expected typed Effect failures to `{ error }` at the public
      boundary without hiding defects or invalid construction.
- [ ] Expose a minimal protocol-result projection.
- [ ] Add safe spans and structured diagnostics without logging proof bodies,
      signatures, credentials, or sensitive transport data.
- [ ] Add cancellation and total-deadline tests across RPC, CCIP Read, HTTP,
      DNSSEC, and target-chain operations.

## 12. Conformance and Quality

- [ ] Create the versioned machine-readable v0 vector corpus.
- [ ] Make SDK tests consume the same immutable vector files used by the
      protocol release.
- [ ] Cover every accepted encoding and immediate below/at/above boundary.
- [ ] Include exact normalization, namehash, value hash, EIP-712, proof-key, and
      signature intermediates.
- [ ] Provide deterministic Ethereum, CCIP Read, HTTP, DNSSEC, clock, reorg, and
      target-chain fixtures.
- [ ] Add complete positive and representative adversarial end-to-end cases for
      all three methods.
- [ ] Run the corpus against at least one independent implementation before
      freezing method identifiers.
- [ ] Maintain high coverage of core derivation, parsing, cryptographic, and
      security-sensitive branches.

## 13. Package and v0 Release

- [ ] Finalize the public API, export map, Node entry point, and testing exports.
- [ ] Keep the public surface small: `RecordVerification`, constructor options,
      record query inputs, and stable Promise result types.
- [ ] Keep internal services, registries, adapters, and experimental helpers out
      of the public export surface.
- [ ] Add explicit runtime configuration for caller-provided ENS and
      target-chain clients, DNSSEC, HTTP, finality, limits, and timeouts.
- [ ] Set package runtime metadata to the supported Node versions and do not
      advertise browser conformance.
- [ ] Finalize package name, version, license, repository metadata, keywords,
      and supported Node versions.
- [ ] Review production dependency necessity, versions, tree shaking, and
      browser bundling.
- [ ] Remove `private` only when every launch gate passes.
- [ ] Run formatting, lint, typecheck, unit tests, integration tests, build,
      `publint`, and package dry-run.
- [ ] Inspect the packed tarball for missing files, internal files, source maps,
      secrets, fixtures, and unexpected dependencies.
- [ ] Publish the matching experimental v0 package and vector-corpus version.
- [ ] Tag the release and record the exact protocol, SDK, and vector versions.

## v0 Launch Gate

- [ ] All frozen v0 decisions are implemented and covered by boundary vectors.
- [ ] All three advertised methods pass their complete conformance suites.
- [ ] No required verification check is silently skipped in the Node runtime.
- [ ] Public APIs contain no accidental internal or unstable exports.
- [ ] Positive results always include valid expiry and cache bounds.
- [ ] Unsupported and unavailable operations always remain non-positive.
- [ ] Reproducible package checks pass from a clean checkout.
- [ ] The package is installable, importable, tree-shakeable, and accepted by
      `publint`.
- [ ] The packed artifact and release metadata contain no secrets.
