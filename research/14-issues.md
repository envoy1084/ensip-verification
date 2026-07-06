# Issue Tracker

This document tracks open and resolved issues for ENS Resolver Record
Verification. It is the working queue for turning the current draft into a
release-ready specification.

Status values:

- `Open`: needs a decision or spec change.
- `In Progress`: actively being worked.
- `Done`: resolved in the current draft/research.
- `Deferred`: intentionally left for a later release.

Priority values:

- `P0`: required before first public release.
- `P1`: next release or important follow-up.
- `P2`: useful improvement, not release-blocking.

## Summary

| ID     | Priority | Status      | Issue                                                 |
| ------ | -------- | ----------- | ----------------------------------------------------- |
| P0-001 | P0       | Done        | Current ENS authority rules                           |
| P0-002 | P0       | In Progress | Proof lifecycle, expiry, revocation, and cache bounds |
| P0-003 | P0       | Open        | Error precedence and failure-code taxonomy            |
| P0-004 | P0       | Open        | Mutable proof URI integrity and `h` guidance          |
| P0-005 | P0       | Open        | Method versioning and incompatible changes            |
| P0-006 | P0       | Open        | JSON parser requirements and schema strictness        |
| P0-007 | P0       | Open        | First implementation test vectors                     |
| P0-008 | P0       | Open        | Privacy defaults for proof fetching                   |
| P0-009 | P0       | Open        | DNS TXT assurance level and DNSSEC metadata           |
| P1-001 | P1       | Deferred    | Scoped delegated verification                         |
| P1-002 | P1       | Open        | Multi-method and layered verification                 |
| P1-003 | P1       | Open        | Issuer trust-policy metadata                          |
| P1-004 | P1       | Open        | Service-account overclaiming and stable account IDs   |
| P1-005 | P1       | Open        | Contenthash manifest authoring/tooling flow           |
| P1-006 | P1       | Open        | Reserved `data` record support                        |
| P2-001 | P2       | Open        | Debug authority metadata                              |
| P2-002 | P2       | Open        | Method-specific UI copy tables                        |
| P2-003 | P2       | Open        | Assurance metadata vocabulary                         |
| P2-004 | P2       | Open        | Indexer and cache hint ergonomics                     |

## P0 Before First Public Release

### P0-001: Current ENS Authority Rules

Status: `Done`

Problem:

The spec needed to define who can sign the ENS side of a proof.

Decision:

- Wrapped names use the Name Wrapper owner.
- Unwrapped `.eth` second-level names use the Base Registrar registrant.
- Other unwrapped names use the ENS Registry owner for the exact node.
- CCIP Read can prove live resolver data, but gateway `owner` fields are not
  authority by themselves.
- EOA authorities verify through ECDSA EIP-712.
- Contract authorities verify through ERC-1271.

Evidence:

- `ensip-x-resolver-record-verification.md`, `Current ENS Authority`.
- `research/13-ens-authority-model.md`.

Remaining checks:

- Add executable test vectors for the authority matrix under P0-007.

### P0-002: Proof Lifecycle, Expiry, Revocation, And Cache Bounds

Status: `In Progress`

Problem:

The draft says proofs are short-lived and bound to live ENS state, but the full
invalidation model should be explicit.

Decision needed:

- Define the earliest-expiry rule:
  - signed claim expiry;
  - method proof expiry;
  - issuer attestation expiry;
  - `.eth` registration expiry;
  - wrapped-name expiry.
- Define what immediately invalidates a positive result:
  - resolver target value change;
  - verification descriptor deletion or method change;
  - authority change;
  - name expiry;
  - proof disappearance;
  - proof mismatch;
  - issuer revocation.
- Define cache bounds for clients and indexers.
- Define whether descriptor deletion is sufficient ENS-side revocation.

Recommended direction:

Positive verification expires at the earliest applicable expiry and must be
rechecked against live ENS state before display in high-trust contexts.

Research recommendation:

- `research/15-proof-lifecycle.md`

Acceptance criteria:

- ENSIP has a dedicated lifecycle/invalidation section.
- SDK checklist includes cache and invalidation checks.
- Method docs reference the common lifecycle rule instead of redefining it
  inconsistently.

### P0-003: Error Precedence And Failure-Code Taxonomy

Status: `Open`

Problem:

Different clients may return different errors for the same failure. For example,
missing target data could be `record_missing`, `proof_missing`,
`value_mismatch`, or `proof_invalid` depending on check order.

Decision needed:

- Normative order for common checks.
- Which error wins when multiple checks fail.
- Whether `authority_mismatch` and `signature_invalid` should both remain.
- Whether issuer trust failures need a distinct code or belong in
  `proof_invalid`.

Recommended direction:

Define common precedence in the base ENSIP and let method profiles map their
method-specific errors into the base set.

Acceptance criteria:

- ENSIP has an error precedence table.
- SDK checklist tests each base error.
- Method docs use the same error names for equivalent failures.

### P0-004: Mutable Proof URI Integrity And `h` Guidance

Status: `Open`

Problem:

The descriptor `h` pins exact proof-resource bytes, but it is optional. Mutable
HTTPS proof URLs can change over time.

Decision needed:

- Should `h` be required for mutable `u` proof resources?
- Should `h` be recommended but method-specific?
- Which methods can safely omit `h` because the proof location is deterministic
  and the signed claim still binds all important fields?

Recommended direction:

Do not require `h` globally in the first release. Require or recommend it in
specific method profiles where mutable proof resources create auditability risk.

Acceptance criteria:

- Base ENSIP clearly states global `h` semantics.
- Each method profile says whether `h` is ignored, optional, recommended, or
  required.
- SDK checklist covers `h` mismatch.

### P0-005: Method Versioning And Incompatible Changes

Status: `Open`

Problem:

The descriptor is versioned as `ensrv1`, but method identifiers such as
`https-origin` do not carry a version. Incompatible method changes need a stable
migration rule.

Decision needed:

- Immutable method identifiers with new names for incompatible changes.
- Version suffixes in method names.
- Method-profile version metadata that clients check.

Recommended direction:

Treat method identifiers as immutable. Incompatible changes get a new method
identifier.

Acceptance criteria:

- ENSIP method identifier section states the versioning rule.
- Method documents declare whether their identifier is immutable.
- SDK behavior for unknown or unsupported method versions is explicit.

### P0-006: JSON Parser Requirements And Schema Strictness

Status: `Open`

Problem:

JSON Schema cannot reject duplicate object keys. The spec requires duplicate-key
rejection for verification objects, so SDKs need parser-level rules before schema
validation.

Decision needed:

- Exact duplicate-key rejection scope.
- Hex casing rules.
- Whether unknown fields are retained for logs or ignored after validation.
- How method-specific schema extensions compose with the common proof schema.

Recommended direction:

Keep the common schema extension-friendly, but require parser-level duplicate
key rejection before schema validation.

Acceptance criteria:

- SDK checklist separates parse, schema, method, and signature validation.
- Schema notes explain what JSON Schema cannot enforce.
- Test vectors include duplicate JSON keys.

### P0-007: First Implementation Test Vectors

Status: `Open`

Problem:

The docs describe expected behavior, but implementations need deterministic
vectors to avoid incompatible parsers, hashers, and signature verifiers.

Test vector scope:

- descriptor parsing;
- bracketed text keys;
- duplicate descriptor fields;
- duplicate JSON keys;
- raw `valueHash` for text, addr, and contenthash;
- EIP-712 digest;
- ECDSA signature happy path and failure;
- ERC-1271 happy path and failure;
- current ENS authority matrix;
- `.eth` transfer invalidation;
- wrapped-name expiry;
- expired proof;
- `h` mismatch;
- unsupported method;
- unsupported authority;
- privacy-blocked fetch.

Acceptance criteria:

- A `test-vectors` document or folder exists.
- SDK checklist references the vectors.
- Each P0 issue with behavior impact has at least one vector.

### P0-008: Privacy Defaults For Proof Fetching

Status: `Open`

Problem:

Verification can fetch websites, DNS records, GitHub raw files, content roots,
issuer endpoints, and agent proof resources. These fetches leak user interest in
names and records.

Decision needed:

- Default wallet fetch behavior.
- Whether sensitive records require user opt-in.
- When clients should return `privacy_blocked`.
- Whether indexer hints can be used without becoming trust roots.

Recommended direction:

Wallets should not auto-fetch every proof in passive profile views. Fetching
should be user-triggered, privacy-proxied, or served by a cache that is still
revalidated before high-trust use.

Acceptance criteria:

- ENSIP security/privacy section states default guidance.
- SDK checklist defines at least `local-only`, `fetch-on-action`, and
  `privacy-proxy` modes.
- `privacy_blocked` is documented as normal, not exceptional.

### P0-009: DNS TXT Assurance Level And DNSSEC Metadata

Status: `Open`

Problem:

`dns-txt` can prove control under ordinary DNS resolution, while DNSSEC-backed
proofs have stronger cryptographic assurance. The public status model has only
`verified` and `none`, so assurance must not create a third status.

Decision needed:

- Can unsigned DNS TXT produce `verified/control`?
- Does DNSSEC add metadata only?
- What UI wording distinguishes ordinary DNS from DNSSEC-backed DNS?

Recommended direction:

Allow `verified/control` for ordinary DNS TXT if the method profile accepts that
trust model. Add optional assurance metadata for DNSSEC.

Acceptance criteria:

- `method-dns-txt.md` states DNSSEC effect on status and metadata.
- UI guidance avoids making unsigned DNS look equivalent to DNSSEC.
- SDK result model can carry optional assurance metadata without changing public
  status.

## P1 Next Release Or Important Follow-Up

### P1-001: Scoped Delegated Verification

Status: `Deferred`

Problem:

Owner-only signing is simpler, but many names are operated by teams, multisigs,
profile managers, custody systems, or smart accounts.

Decision:

Leave delegation out of the first release.

Future decision needed:

- Delegation format.
- Onchain vs offchain delegation.
- Scope: `name + recordType + recordKey + method + validUntil`.
- Revocation and replay rules.

Acceptance criteria for future release:

- Delegation cannot silently grant resolver writers full verification authority.
- Delegated proofs are scoped and expire.
- Transfer or authority change invalidates delegated proofs.

### P1-002: Multi-Method And Layered Verification

Status: `Open`

Problem:

The descriptor advertises one method. Some records may benefit from multiple
methods, such as HTTPS plus DNS TXT for a URL, or account signature plus issuer
attestation for an address.

Decision needed:

- Keep one descriptor only.
- Define a method bundle.
- Allow multiple verification records.
- Define deterministic priority rules.

Recommended direction:

Keep one descriptor for the first release. Revisit layering after the single
method path has test vectors and real implementations.

### P1-003: Issuer Trust-Policy Metadata

Status: `Open`

Problem:

Issuer attestations depend on client trust policy. Two clients may evaluate the
same proof differently.

Decision needed:

- Required metadata for issuer id, issuer profile, policy source, and revocation
  check time.
- UI difference between direct control proofs and issuer attestations.
- Error behavior for unknown or untrusted issuers.

Acceptance criteria:

- `issuer-attestation` positive results include issuer and policy metadata.
- Unknown issuer behavior is specified.

### P1-004: Service-Account Overclaiming And Stable Account IDs

Status: `Open`

Problem:

Service profiles like GitHub raw-file proofs can show control of a proof surface
without proving sole control of an account. Repository collaborators,
organizations, mutable refs, deleted accounts, and username reuse matter.

Decision needed:

- Whether service profiles require stable account IDs.
- Whether mutable refs require `h` or commit SHA refs.
- UI wording for organization-controlled accounts.

Acceptance criteria:

- Each service profile documents account identity, proof surface, mutability, and
  transfer/reuse risk.

### P1-005: Contenthash Manifest Authoring/Tooling Flow

Status: `Open`

Problem:

Adding a manifest into a content root can change the contenthash. Without
tooling, users may sign the wrong root or publish stale manifests.

Decision needed:

- Recommended authoring flow for IPFS/IPNS/Arweave-like content.
- Whether tooling should generate manifest, content root, and ENS proof together.
- How to handle immutable content roots that cannot include a manifest.

Acceptance criteria:

- `content-manifest` has a concrete authoring flow and failure examples.
- SDK or CLI plan exists for generating a correct manifest.

### P1-006: Reserved `data` Record Support

Status: `Open`

Problem:

`verification[data][<data-key>]` is reserved, but no concrete data-record method
exists yet.

Decision needed:

- Keep `data` reserved in the base.
- Move it to a future extension.
- Define one concrete data-record method before requiring client support.

Recommended direction:

Keep the namespace reserved but do not require clients to support arbitrary data
records until a method profile exists.

## P2 Useful Improvements

### P2-001: Debug Authority Metadata

Status: `Open`

Problem:

Implementers need to debug why a signature did or did not match current ENS
authority.

Possible fields:

```text
authorityRule
authoritySource
authority
authorityExpiry
```

Acceptance criteria:

- SDK result debug mode exposes authority lookup path.
- Public UI remains simple and does not expose confusing internals by default.

### P2-002: Method-Specific UI Copy Tables

Status: `Open`

Problem:

The docs warn against overclaiming, but wallet teams need copy that is easy to
reuse.

Acceptance criteria:

- Each method doc has allowed and forbidden UI wording.
- Copy distinguishes `control` from `attestation`.
- Copy avoids safe, official, legal owner, and anti-phishing claims.

### P2-003: Assurance Metadata Vocabulary

Status: `Open`

Problem:

Some proofs have stronger assurance than others, but public status should remain
`verified` or `none`.

Examples:

- DNSSEC-backed DNS.
- Content-addressed proof resource.
- HTTPS proof with descriptor `h`.
- Contract authority via ERC-1271.

Acceptance criteria:

- Optional assurance metadata is defined without creating new public statuses.
- UI guidance explains how to display assurance without overclaiming.

### P2-004: Indexer And Cache Hint Ergonomics

Status: `Open`

Problem:

Indexers can improve performance, but must not become the trust root. The
descriptor has no expiry, so indexers often need to fetch proofs to know whether
results are still fresh.

Decision needed:

- Whether non-authoritative cache hints are allowed.
- Whether indexers should expose last-checked time and earliest expiry.
- How wallets should revalidate before high-trust use.

Acceptance criteria:

- Indexer guidance says cached data is a hint only.
- SDK cache policy never returns positive verification past earliest expiry.
- Live ENS state or cryptographically verified resolution is required for final
  positive results.

## Closed Or Not Required For First Release

| Issue                                                    | Decision                        |
| -------------------------------------------------------- | ------------------------------- |
| Generic delegated verification                           | Deferred to P1.                 |
| Resolver-writer authority                                | Not accepted as base authority. |
| Gateway-signer authority                                 | Not accepted as base authority. |
| Parent-owner authority for child names                   | Not accepted as base authority. |
| Legal/DNS ownership claims for imported DNS names        | Not part of base ENS authority. |
| Safety, phishing, authenticity, or brand-official badges | Out of scope.                   |
