# Record Verification Issue Register

This document lists unresolved technical issues in ENS Resolver Record
Verification. It is the release gate for the base ENSIP, method profiles,
schemas, test vectors, and reference implementation.

Status values:

- `Open`: no complete normative solution exists.
- `Partial`: the draft contains part of the required solution.
- `Deferred`: explicitly excluded from the first release.

Priority values:

- `P0`: blocks publication as an interoperable ENSIP.
- `P1`: blocks a specific method or production integration.
- `P2`: does not block the base protocol but should be specified.

## Summary

| ID     | Priority | Status   | Issue                                                                           |
| ------ | -------- | -------- | ------------------------------------------------------------------------------- |
| P0-001 | P0       | Open     | Unwrapped subname authority can survive ancestor expiry or re-registration      |
| P0-002 | P0       | Open     | No ENSv2 authority profile or migration rule                                    |
| P0-003 | P0       | Partial  | Claims have no issuance time or enforceable maximum lifetime                    |
| P0-004 | P0       | Open     | EIP-712 strict claim extensions are undefined                                   |
| P0-005 | P0       | Open     | Target-account signature protocol is not specified                              |
| P0-006 | P0       | Open     | Account target identifiers are inconsistent                                     |
| P0-007 | P0       | Open     | Proof resources cannot select multiple claims deterministically                 |
| P0-008 | P0       | Open     | External proof fetching lacks a security profile                                |
| P0-009 | P0       | Partial  | Descriptor `h` does not define the exact hashed representation                  |
| P0-010 | P0       | Open     | Unknown descriptor fields create downgrade risk                                 |
| P0-011 | P0       | Partial  | Generic method identifiers conflict with immutable semantics                    |
| P0-012 | P0       | Open     | HTTPS target canonicalization is incomplete                                     |
| P0-013 | P0       | Open     | DNS target derivation and wire behavior are incomplete                          |
| P0-014 | P0       | Partial  | JSON schema does not enforce claim and signature constraints                    |
| P0-015 | P0       | Open     | Test vectors are non-executable and incomplete                                  |
| P0-016 | P0       | Open     | ENS reads have no block snapshot or reorg rule                                  |
| P0-017 | P0       | Partial  | Error taxonomy conflates invalid, unavailable, and unverified states            |
| P0-018 | P0       | Open     | Authority-profile override permits undefined equivalent checks                  |
| P0-019 | P0       | Open     | Name normalization is not version-pinned                                        |
| P0-020 | P0       | Open     | No reference verifier proves the specification is implementable                 |
| P1-001 | P1       | Partial  | Privacy modes lack mandatory product defaults                                   |
| P1-002 | P1       | Open     | Method identifier governance and registration are undefined                     |
| P1-003 | P1       | Open     | No production service-account provider profile exists                           |
| P1-004 | P1       | Open     | Issuer-attestation format and trust policy are not interoperable                |
| P1-005 | P1       | Open     | Contenthash binding is misclassified as target control                          |
| P1-006 | P1       | Deferred | Scoped delegation is not defined                                                |
| P1-007 | P1       | Deferred | One descriptor cannot advertise layered methods                                 |
| P1-008 | P1       | Open     | Per-record records have no batching or enumeration strategy                     |
| P1-009 | P1       | Partial  | Reserved `data` verification has no method profile                              |
| P1-010 | P1       | Partial  | Cache and freshness limits are not method-specific                              |
| P1-011 | P1       | Open     | Proof renewal and rotation are not atomic                                       |
| P1-012 | P1       | Open     | CCIP Read and wildcard resolver behavior are underspecified                     |
| P1-013 | P1       | Open     | DNS method documentation contains conflicting pointer formats                   |
| P1-014 | P1       | Open     | Method profiles are presented as implemented standards before they are complete |
| P2-001 | P2       | Open     | Debug results lack authority and validation trace metadata                      |
| P2-002 | P2       | Partial  | Assurance metadata lacks normative derivation rules                             |
| P2-003 | P2       | Partial  | Indexer results lack a mandatory portable cache contract                        |
| P2-004 | P2       | Partial  | UI language does not fully distinguish method-specific semantics                |
| P2-005 | P2       | Open     | Issue status and normative documentation are not synchronized                   |
| P2-006 | P2       | Open     | ENSIP submission artifact is not isolated from product documentation            |

## P0: Base Protocol Release Blockers

### P0-001: Unwrapped Subname Authority Can Survive Ancestor Expiry Or Re-registration

Status: `Open`

Problem:

The `ens-mainnet-v1` authority profile uses the exact ENS Registry owner for an
unwrapped subname. It does not bind the result to the expiry or registration
generation of an ancestor `.eth` second-level name. Registry state for
`sub.alice.eth` can remain after `alice.eth` expires or is re-registered.

Impact:

An old exact subname owner can remain an accepted verification authority after
the registrable ancestor has changed control. This violates the live-authority
and name-expiry invariants.

Required resolution:

1. Define authority validity for every name below an expiring registrable
   ancestor.
2. Bound `authorityValidUntil` by every applicable ancestor expiry.
3. Define how re-registration changes the ancestor registration generation.
4. Until generation-safe validation exists, either:
   - return `unsupported_authority` for affected unwrapped subnames;
   - require the subname to be wrapped with explicit expiry; or
   - require a current ancestor authorization in addition to exact subname
     authorization.
5. Do not replace exact subname authority with parent authority globally.

Acceptance criteria:

- A proof created before ancestor expiry cannot verify after ancestor
  re-registration unless the new authority explicitly reauthorizes it.
- Tests cover unwrapped child names before expiry, during grace, after expiry,
  and after re-registration.
- The rule preserves independent wrapped or otherwise durable child ownership.

### P0-002: No ENSv2 Authority Profile Or Migration Rule

Status: `Open`

Problem:

The draft defines only `ens-mainnet-v1`. ENSv2 uses recursive registries,
canonical registry paths, per-label ownership, native expiry, and role-based
permissions. The ENSv1 Registry, Base Registrar, and Name Wrapper rules do not
apply to ENSv2.

Impact:

The proposal can become obsolete during ENSv2 migration. Clients may use the
wrong owner, ignore native expiry, or accept a non-canonical registry.

Required resolution:

1. Define an ENSv2 authority profile with explicit deployment identifiers.
2. Resolve the exact owner through the canonical live registry chain.
3. Reject non-canonical or unreachable registries.
4. Bound validity by the minimum applicable expiry in the registry ancestry.
5. Define which ENSv2 roles, if any, can authorize verification. Do not infer
   authority from generic resolver-writing roles.
6. Define a distinct EIP-712 domain for ENSv2.
7. State that ENSv1 proofs do not automatically remain valid after migration.

Acceptance criteria:

- Executable tests cover ENSv2 exact owner, expired labels, expired ancestors,
  registry replacement, role holders, and canonical-path failure.
- Migration tests prove that a v1 proof cannot be replayed as a v2 proof.

### P0-003: Claims Have No Issuance Time Or Enforceable Maximum Lifetime

Status: `Partial`

Problem:

The common claim includes `validUntil` but not `issuedAt`. A verifier cannot
enforce a maximum proof lifetime. A claim valid until a distant timestamp still
satisfies `now < validUntil`.

Impact:

Portable signatures can remain valid for years. Method statements that proofs
must be short-lived are not enforceable.

Required resolution:

Add `uint64 issuedAt` to the common signed claim and require:

```text
issuedAt <= now + allowedClockSkew
now < validUntil
validUntil > issuedAt
validUntil - issuedAt <= methodMaxLifetime
```

Each method must define `methodMaxLifetime` and allowed clock skew. Issuer and
target proof issuance times must be checked independently when present.

Acceptance criteria:

- Vectors cover future issuance, exact expiry, excessive lifetime, clock skew,
  and the maximum accepted lifetime.
- A verifier can reject a long-lived proof using signed fields only.

### P0-004: EIP-712 Strict Claim Extensions Are Undefined

Status: `Open`

Problem:

The base spec permits the common EIP-712 claim or a “strict extension.” Adding
fields changes the EIP-712 type hash and digest. No extension type name, field
order, discovery rule, or verification rule exists.

Impact:

Implementations cannot compute the same digest. A method can silently change
which fields the ENS authority signed.

Required resolution:

1. Require the exact common claim type for the ENS-authority signature.
2. If a method needs additional signed fields, define a separate typed object.
3. The method-specific object must bind `commonClaimDigest`.
4. Give every method-specific type an immutable type name and field order.
5. Remove the undefined “strict extension” permission.

Acceptance criteria:

- The base claim has one type string and one deterministic type hash.
- Every method-specific signature vector identifies its exact typed-data
  schema and expected digest.

### P0-005: Target-Account Signature Protocol Is Not Specified

Status: `Open`

Problem:

`account-signature` allows the target to sign either the common claim hash or a
method-defined challenge. These are different protocols. The EVM signature
encoding, digest, recovery rules, ERC-1271 call, and one-signature optimization
are not normative.

Impact:

Two implementations cannot produce or verify the same address proof.

Required resolution:

Define a versioned EVM account method that specifies:

- exact EIP-712 domain and primary type;
- exact digest signed by the target;
- ECDSA signature length and encoding;
- low-`s`, recovery-id, and EIP-2098 behavior;
- ERC-1271 call target, digest, signature bytes, and magic value;
- chain/account binding;
- when one signature may satisfy both authority and target roles;
- error mapping for authority signature versus target signature failure.

Define separate immutable methods for non-EVM signature systems.

Acceptance criteria:

- Golden vectors cover EOA, ERC-1271, wrong chain, wrong account, malleable
  signature, compact signature, and shared authority/target cases.

### P0-006: Account Target Identifiers Are Inconsistent

Status: `Open`

Problem:

The account method uses `coin:60:0x...`. The address record guide uses
`eip155:1:0x...`. These identifiers have different semantics. Coin type `60`
does not by itself define every EVM chain context supported by ENS address
records.

Impact:

The same resolver bytes can produce different `claim.target` values and
different signatures.

Required resolution:

1. Select one canonical account-identifier standard per method.
2. Define conversion from ENSIP-9 native address bytes and ENSIP-11 coin types.
3. Define lowercase/checksum behavior for display separately from signed form.
4. Reject ambiguous chain mappings.
5. Use separate method identifiers where account namespaces require different
   canonicalization.

Acceptance criteria:

- Every supported coin type has one byte-to-target test vector.
- All documentation uses the same target string for the same address record.

### P0-007: Proof Resources Cannot Select Multiple Claims Deterministically

Status: `Open`

Problem:

HTTPS uses one fixed well-known resource containing one claim. DNS selects an
arbitrary TXT value beginning with `ensrv1 `. Neither method defines how one
origin or DNS name publishes proofs for multiple ENS names, records, or proof
rotations.

Impact:

Shared origins cannot verify multiple claims reliably. Verifiers may scan
unbounded proof sets or select different proofs.

Required resolution:

Choose one deterministic model:

1. A claim-specific URI derived from `node`, record type, and record key; or
2. A collection envelope keyed by a canonical claim selector; or
3. A deterministic descriptor `u` with mandatory selection rules.

Define duplicate selector handling, maximum collection size, ordering
independence, and behavior when multiple candidates match.

Acceptance criteria:

- One origin can publish proofs for multiple names and multiple records.
- All implementations select the same proof without unbounded trial
  verification.
- Duplicate matching claims fail deterministically.

### P0-008: External Proof Fetching Lacks A Security Profile

Status: `Open`

Problem:

Descriptors and method-derived locations cause clients to fetch
attacker-controlled URIs. The draft defines privacy modes but not SSRF,
redirect, resource, or parser protections.

Impact:

A malicious record can target localhost, private networks, metadata services,
large responses, decompression bombs, redirect loops, or unsupported schemes.

Required resolution:

Define a common fetch profile:

- allowed URI schemes per method;
- private, loopback, link-local, multicast, and reserved address blocking;
- DNS rebinding checks before connection and after redirects;
- redirect count and cross-origin redirect policy;
- connection and total request timeouts;
- maximum encoded and decoded response sizes;
- content-encoding and decompression limits;
- MIME type requirements;
- TLS validation requirements;
- IPFS/Arweave gateway selection behavior;
- proxy trust and response-integrity behavior.

Acceptance criteria:

- Fetch-security vectors cover blocked addresses, redirect chains, oversized
  bodies, decompression limits, unsupported schemes, and timeout behavior.
- Reference verifier applies the same policy to every network method.

### P0-009: Descriptor `h` Does Not Define The Exact Hashed Representation

Status: `Partial`

Problem:

The draft says `h = keccak256(exact proof-resource bytes)` without defining
whether the bytes are the HTTP transfer representation, content-decoded body,
gateway response, or canonical object bytes.

Impact:

HTTP compression, transfer encoding, gateway behavior, and automatic client
decoding can produce different hashes for the same logical proof.

Required resolution:

Define `proofResourceBytes` as the decoded response body after HTTP transfer and
content coding, before text decoding or JSON parsing. For content-addressed
schemes, define whether `h` covers retrieved block bytes or resolved file bytes.
Disallow transparent transformations that change these bytes.

Acceptance criteria:

- Vectors include compressed and uncompressed HTTP responses.
- Two conforming clients hash identical bytes for each supported URI scheme.

### P0-010: Unknown Descriptor Fields Create Downgrade Risk

Status: `Open`

Problem:

`ensrv1` requires clients to ignore every unknown descriptor field. A future
field can carry a security-critical audience, network, policy, or proof
selection constraint. Older clients would ignore it and verify with weaker
semantics.

Impact:

Extension fields cannot safely add mandatory constraints.

Required resolution:

Use one of these rules:

- reject unknown fields in `ensrv1`;
- define separate ignorable and critical extension namespaces; or
- require a new descriptor or method identifier for every semantic constraint.

The simplest first-release rule is to reject unknown fields except an explicit
registry of non-critical metadata fields.

Acceptance criteria:

- A vector proves that an unknown critical field cannot be silently ignored.
- Extension compatibility rules are normative.

### P0-011: Generic Method Identifiers Conflict With Immutable Semantics

Status: `Partial`

Problem:

The draft declares method identifiers immutable but uses generic identifiers
whose behavior depends on future subprofiles, including `account-signature`,
`issuer-attestation`, and `service-account.<provider>`.

Impact:

Adding a coin, issuer format, or provider behavior can change existing method
semantics without changing the identifier.

Required resolution:

1. Give every interoperable method a complete versioned identifier.
2. Include chain-family, provider, or credential format where it changes
   validation.
3. Treat generic identifiers as abstract families that cannot appear in a
   production descriptor.
4. Require incompatible changes to allocate a new identifier.

Examples:

```text
https-origin.v1
dns-txt.url.v1
account-signature.evm.v1
account-signature.bitcoin-bip322.v1
issuer-attestation.vc-jose.v1
service-account.github.v1
```

Acceptance criteria:

- Every production method identifier resolves to one complete immutable
  validation algorithm.

### P0-012: HTTPS Target Canonicalization Is Incomplete

Status: `Open`

Problem:

The HTTPS profile defines scheme, host case, default port, path exclusion, and
credential rejection. It does not select a URL parsing standard or define IDNA,
IPv6, trailing dots, percent encoding, empty hosts, Unicode, or parser errors.

Impact:

Clients can derive different origins and targets from the same text value.

Required resolution:

1. Select a specific URL parsing standard and compatibility profile.
2. Pin IDNA processing and Unicode handling.
3. Define IPv4 and IPv6 serialization.
4. Define trailing-dot behavior.
5. Reject credentials, non-HTTPS schemes, invalid ports, fragments where
   required, and ambiguous host forms.
6. Define the exact serialized origin used in `claim.target`.

Acceptance criteria:

- A cross-language vector suite covers Unicode hosts, punycode, IPv6, port 443,
  alternate ports, credentials, trailing dots, and invalid URLs.

### P0-013: DNS Target Derivation And Wire Behavior Are Incomplete

Status: `Open`

Problem:

The DNS profile delegates DNS-name derivation to an unspecified method profile
or SDK integration. URL hosts, email domains, and agent endpoints require
different parsing. TXT selection, duplicate handling, base64url encoding,
CNAME behavior, and DNSSEC validation inputs are incomplete.

Impact:

Clients query different owner names or accept different TXT data.

Required resolution:

Define record-specific DNS methods or subprofiles. Each must specify:

- resolver value parsing;
- exact DNS target derivation;
- IDNA and absolute-name serialization;
- TXT owner name;
- TXT RDATA fragment concatenation;
- multiple-RR and duplicate-candidate handling;
- base64url alphabet and padding;
- CNAME/DNAME behavior;
- DNSSEC trust anchor and validation state;
- negative caching and TTL cap;
- maximum TXT proof size.

Acceptance criteria:

- URL, email-domain, and agent endpoint cases have separate deterministic
  vectors.
- Multiple TXT records cannot cause implementation-dependent selection.

### P0-014: JSON Schema Does Not Enforce Claim And Signature Constraints

Status: `Partial`

Problem:

The common schema allows arbitrary additional properties and weak signature
objects. `validUntil` accepts unbounded decimal strings and leading zeroes.
`authoritySig.type` accepts any string. Method-specific payloads have no
schemas. Duplicate keys remain a parser-level concern.

Impact:

Schema-valid proofs can still be non-canonical, overflow `uint64`, or omit
method constraints. Implementations can validate different object shapes.

Required resolution:

1. Require canonical decimal strings with no leading zeroes except `0`.
2. Enforce the `uint64` range in parser validation.
3. Enumerate base authority signature types.
4. Define signature constraints per signature type.
5. Publish a schema for every concrete method.
6. Define how method schemas compose with the common schema.
7. Retain duplicate-key rejection before JSON parsing into a map.
8. Define maximum JSON nesting, member count, string length, and proof size.

Acceptance criteria:

- Invalid uint64, leading-zero, duplicate-key, unknown signature-type, excessive
  nesting, and method-payload vectors fail consistently.

### P0-015: Test Vectors Are Non-executable And Incomplete

Status: `Open`

Problem:

The repository contains four starter JSON files. It has no known hash outputs,
typed-data digests, valid signatures, contract fixtures, authority state,
network fixtures, or conformance runner.

Impact:

The specification has no evidence that independent implementations can agree.

Required resolution:

Create versioned executable vectors for:

- descriptor parsing and extension handling;
- verification-key construction;
- raw resolver-value hashing;
- name normalization and namehash;
- common EIP-712 type hash and digest;
- EOA and ERC-1271 authority signatures;
- ENSv1 and ENSv2 authority matrices;
- every concrete method;
- expiry and cache boundaries;
- proof integrity;
- JSON parser failures;
- privacy and fetch security;
- complete error precedence.

Every vector must include inputs, exact expected outputs, and expected error.

Acceptance criteria:

- A command runs the complete vector suite.
- At least two independent implementations produce identical results.
- Every P0 behavior has a positive and negative vector.

### P0-016: ENS Reads Have No Block Snapshot Or Reorg Rule

Status: `Open`

Problem:

Verification reads the target record, descriptor, authority, wrapper state, and
registrar expiry through separate calls. The draft does not require a common
block tag, finality policy, or reorg handling.

Impact:

A verifier can combine values from different chain states and report a result
that was never valid at one block. Cached results can survive a reorg that
removed an authority or descriptor update.

Required resolution:

1. Resolve all onchain ENS state against one block identifier.
2. Return the block number and block hash in debug/result metadata.
3. Define minimum confirmation or finality policy by client context.
4. Invalidate cached results when the referenced block is reorged.
5. Define how CCIP Read responses bind to the selected onchain call and block.

Acceptance criteria:

- Tests mutate the target, descriptor, and authority across adjacent blocks and
  prove that mixed snapshots are rejected.
- Reorg simulation invalidates the cached positive result.

### P0-017: Error Taxonomy Conflates Invalid, Unavailable, And Unverified States

Status: `Partial`

Problem:

The precedence table exists, but operational failures are incomplete.
`signature_invalid` may refer to authority or target signatures. Resolver RPC,
CCIP gateway, DNS validation, timeout, and revocation-status failures do not
have precise mappings. `none` can mean invalid, unsupported, blocked, or not
checked.

Impact:

High-trust callers cannot distinguish a negative proof from an unavailable
verification path. Different implementations choose different errors.

Required resolution:

1. Keep public status `verified | none`.
2. Define stable error classes:
   - invalid request or record;
   - unsupported capability;
   - not configured;
   - verification failed;
   - verification unavailable;
   - verification blocked by policy.
3. Distinguish authority-signature and target-signature failures internally or
   by stable subcodes.
4. Define mappings for RPC, CCIP, HTTP, DNS, issuer, and revocation failures.
5. Define which failures are retryable.
6. Define precedence without requiring unsafe or unnecessary network work to
   discover lower-priority errors.

Acceptance criteria:

- Every algorithm step maps to one error and retryability value.
- Complete precedence vectors cover simultaneous failures.

### P0-018: Authority-Profile Override Permits Undefined Equivalent Checks

Status: `Open`

Problem:

The base spec requires current-authority signatures unless a method defines an
“equivalent or stronger authority check.” Equivalent and stronger are not
defined.

Impact:

A method can bypass the base authority invariant and still claim conformance.
Resolver-writer, gateway, or issuer authority can be presented as equivalent
without common review criteria.

Required resolution:

1. Remove the method-level authority bypass.
2. Put all authority behavior in registered authority profiles.
3. Require the claim to identify the authority profile.
4. Define mandatory profile properties: exact authority source, transfer
   invalidation, expiry, contract signatures, chain context, and failure mode.
5. A method may require additional authority checks but must not weaken the
   selected base profile.

Acceptance criteria:

- Every positive result identifies one registered authority profile.
- No method can accept a signer rejected by that profile.

### P0-019: Name Normalization Is Not Version-pinned

Status: `Open`

Problem:

The claim requires a normalized ENS name but does not normatively identify the
normalization standard, version, or treatment of invalid names.

Impact:

Different libraries can sign different name strings or compute different nodes
for Unicode input.

Required resolution:

1. Reference the exact ENS normalization specification and version.
2. Define whether the signed `name` is normalized Unicode or normalized
   encoded form.
3. Reject names that fail normalization.
4. Define normalization behavior for DNS-imported names and future authority
   profiles.
5. Add cross-language normalization and namehash vectors.

Acceptance criteria:

- All supported implementations produce identical signed `name` and `node`
  values for the vector corpus.

### P0-020: No Reference Verifier Proves The Specification Is Implementable

Status: `Open`

Problem:

The repository contains pseudocode but no implementation of descriptor parsing,
claim hashing, authority lookup, proof fetching, method dispatch, or lifecycle
validation.

Impact:

Contradictions and undefined behavior remain undetected. Documentation build and
lint results do not prove protocol interoperability.

Required resolution:

Implement a reference verifier with:

- pure descriptor and proof parsers;
- deterministic value hashing;
- common EIP-712 encoding;
- ENSv1 and ENSv2 authority adapters;
- fetch security and privacy policies;
- at least two complete method adapters;
- cache and lifecycle enforcement;
- structured debug trace;
- conformance-vector runner.

Acceptance criteria:

- The verifier passes all P0 vectors.
- A second implementation passes the same vectors.
- The SDK API does not expose method-specific inconsistencies to callers.

## P1: Method And Production Integration Issues

### P1-001: Privacy Modes Lack Mandatory Product Defaults

Status: `Partial`

Problem:

The draft defines `local-only`, `fetch-on-action`, `privacy-proxy`, and
`direct-fetch`, but passive-fetch guidance is only advisory. It does not define
record sensitivity, proxy trust, query minimization, or user-consent behavior.

Required resolution:

- Default passive wallet/profile rendering to no direct external fetch.
- Require user action or a privacy proxy for external verification.
- Require live direct or privacy-preserving revalidation for high-trust actions.
- Define proxy response integrity and logging expectations.
- Prevent batch requests from exposing unrelated names and records.
- Return `privacy_blocked` as a normal non-positive result.

Acceptance criteria:

- Wallet, profile, indexer, and server-side verifier defaults are documented.
- Privacy behavior is tested independently from fetch security.

### P1-002: Method Identifier Governance And Registration Are Undefined

Status: `Open`

Problem:

The grammar allows dotted and undotted method identifiers, but no registry,
ownership rule, collision process, or publication requirement exists.

Required resolution:

- Reserve undotted identifiers for accepted ENSIPs.
- Require reverse-domain or ENS-name-scoped identifiers for experiments.
- Publish a method registry containing identifier, specification URI, status,
  version, and test-vector URI.
- Define collision and deprecation rules.
- Do not permit an identifier to be reassigned.

Acceptance criteria:

- A client can resolve every standard identifier to one immutable profile.

### P1-003: No Production Service-account Provider Profile Exists

Status: `Open`

Problem:

The service-account document defines provider requirements but no complete
GitHub or other provider algorithm. Gist ownership, repository collaborators,
organizations, mutable references, stable account IDs, API behavior, and
username reuse remain unresolved.

Required resolution:

For each provider, define:

- immutable method identifier;
- provider API and version;
- stable account identifier lookup;
- handle-to-ID consistency rule;
- permitted proof publication surfaces;
- collaborator and organization semantics;
- mutable-reference and `h` policy;
- rate-limit and outage behavior;
- revocation and cache lifetime;
- exact UI meaning.

Acceptance criteria:

- `service-account.github.v1` or another provider profile has executable live
  and fixture-based tests before it is listed as standard.

### P1-004: Issuer-attestation Format And Trust Policy Are Not Interoperable

Status: `Open`

Problem:

The issuer method does not define the credential format, signed bytes, issuer
key resolution, issuer profile, revocation protocol, trust-policy identifier,
or policy evaluation result.

Required resolution:

- Split issuer formats into immutable methods.
- Define exact credential serialization and signature verification.
- Bind the credential to the common claim digest.
- Define issuer key discovery and rotation.
- Define revocation URL/protocol, freshness, and fail-closed behavior.
- Return issuer ID, profile, policy ID, revocation check time, and expiry.
- Check issuer trust before unnecessary issuer-controlled network requests.

Acceptance criteria:

- One issuer format has complete schemas, trust-policy inputs, revocation
  fixtures, and vectors.

### P1-005: Contenthash Binding Is Misclassified As Target Control

Status: `Open`

Problem:

`contenthash-binding` verifies only that the ENS authority signed the current
resolver value. The external content root does not publish or sign a matching
proof. This does not satisfy the base definition of `control`, where the target
participates.

Required resolution:

Choose one:

- classify the result as a separate `authority-endorsement` relationship;
- redefine the method as a publisher-signature or content-publication proof;
- or remove the method from the first release.

Do not label owner endorsement as external target control.

Acceptance criteria:

- Result kind and UI text state exactly what participated in the proof.
- The base result model can represent the chosen semantics without overclaiming.

### P1-006: Scoped Delegation Is Not Defined

Status: `Deferred`

Problem:

Owner-only authorization is operationally difficult for teams, custody systems,
profile managers, and smart accounts. Treating resolver writers as delegates is
too broad.

Required future resolution:

Define a signed or onchain delegation scoped to:

```text
authority profile
name
record type
record key
method
delegate
issuedAt
validUntil
nonce or delegation ID
```

Transfer, expiry, revocation, and authority-profile change must invalidate the
delegation. Delegation must not be inferred from resolver permissions.

Acceptance criteria for a future release:

- A delegate cannot authorize a record, key, method, name, or authority profile
  outside the signed scope.
- Authority transfer or delegation revocation invalidates every dependent
  proof.

### P1-007: One Descriptor Cannot Advertise Layered Methods

Status: `Deferred`

Problem:

One descriptor selects one method. A record cannot advertise HTTPS plus DNS,
account signature plus issuer attestation, or ordered fallback without a custom
bundle method.

Required future resolution:

Define either:

- multiple independently keyed method descriptors;
- a deterministic method set with no implied trust ordering; or
- a versioned bundle profile with explicit AND/OR semantics.

Do not overload one result to imply that every advertised method passed.

Acceptance criteria for a future release:

- Method-set ordering does not change validation semantics.
- AND, OR, and fallback behavior are explicit and covered by vectors.
- A client that supports only a subset cannot report a stronger result than it
  evaluated.

### P1-008: Per-record Records Have No Batching Or Enumeration Strategy

Status: `Open`

Problem:

Every verified record requires another text key and descriptor. Clients cannot
enumerate arbitrary resolver keys, and multiple L1 writes increase cost.

Required resolution:

- Keep per-record descriptors as the trust source.
- Define an optional non-authoritative index manifest for enumeration.
- Define batch setter support for compatible resolvers.
- Define how index entries bind to descriptor keys and how stale entries are
  ignored.
- Document approximate storage and transaction costs.
- Support offchain resolvers without changing verification semantics.

Acceptance criteria:

- Profile clients can discover configured proofs without guessing every key.
- An incorrect index cannot create a positive result.

### P1-009: Reserved `data` Verification Has No Method Profile

Status: `Partial`

Problem:

The base reserves `verification[data][key]` but no concrete method defines data
target semantics. “Any record type” is therefore broader than implemented
support.

Required resolution:

- Keep the namespace reserved only.
- State that arbitrary data verification is unsupported until a method exists.
- Do not require clients to fetch or interpret unknown data keys.
- Add one concrete data profile before claiming production support.

Acceptance criteria:

- Unsupported data records return `unsupported_record` consistently.

### P1-010: Cache And Freshness Limits Are Not Method-specific

Status: `Partial`

Problem:

The base defines freshness classes and a generic cache formula, but method pages
do not provide normative maximum proof age, positive cache age, negative cache
age, DNS TTL cap, HTTP cache cap, or revocation freshness.

Required resolution:

Every concrete method must define:

- maximum signed claim lifetime;
- positive result cache maximum;
- negative result cache maximum by error;
- live-publication freshness maximum;
- revocation status freshness;
- whether cached proof bytes remain usable after source removal;
- high-trust forced-revalidation behavior.

Acceptance criteria:

- A verifier computes the same `cacheUntil` for every method vector.

### P1-011: Proof Renewal And Rotation Are Not Atomic

Status: `Open`

Problem:

Updating the target record, publishing proof bytes, and setting the descriptor
occur in separate systems and transactions. Intermediate states can select a
new record with an old proof or a new proof with an old descriptor.

Required resolution:

- Define safe publication order for initial setup, renewal, and target changes.
- Define overlap behavior for old and new proofs.
- Support deterministic multiple-proof selection during a bounded rotation
  window or require descriptor-last publication.
- Define rollback behavior when external publication succeeds but the ENS write
  fails.
- Provide publisher tooling that verifies the final live state.

Acceptance criteria:

- Rotation tests cover every intermediate state and never return a false
  positive.

### P1-012: CCIP Read And Wildcard Resolver Behavior Are Underspecified

Status: `Open`

Problem:

The algorithm says to resolve the live target and verification text record but
does not specify Universal Resolver use, wildcard resolution, inherited
resolvers, CCIP Read callback validation, or alias behavior.

Required resolution:

- Define the normative resolver entrypoint and call encoding.
- Require target and descriptor resolution for the exact DNS-encoded name.
- Define wildcard resolver behavior and record-key construction.
- Require CCIP Read callback verification by the resolver contract.
- Reject gateway-provided owner or authority metadata unless validated by an
  authority profile.
- Bind offchain responses to the selected onchain snapshot.

Acceptance criteria:

- Fixtures cover direct resolver, inherited resolver, wildcard resolver,
  CCIP Read, invalid callback, and alias cases.

### P1-013: DNS Method Documentation Contains Conflicting Pointer Formats

Status: `Open`

Problem:

The DNS method puts `u` and `h` in the ENS descriptor and only `h` in DNS. The
email and URL record guides show `u` inside the DNS TXT value. These are
different wire formats.

Required resolution:

- Choose one pointer format.
- Update every example and guide.
- Add a vector for the selected format.
- Reject the alternate form unless a versioned method explicitly supports it.

Acceptance criteria:

- Repository-wide search finds one normative pointer form.

### P1-014: Method Profiles Are Presented As Implemented Standards Before They Are Complete

Status: `Open`

Problem:

The documentation lists HTTPS, DNS, account signatures, service accounts,
contenthash, and issuer attestations as standard methods. Several are abstract
families or incomplete sketches.

Required resolution:

Classify method status explicitly:

```text
abstract family
experimental profile
draft interoperable profile
standard profile
```

Only list a method as standard after it has a complete algorithm, schemas,
security rules, and executable vectors. The first release should standardize no
more than the methods that meet those gates.

Acceptance criteria:

- The method registry exposes status.
- Unsupported abstract family identifiers cannot appear in production
  descriptors.

## P2: Specification And Tooling Improvements

### P2-001: Debug Results Lack Authority And Validation Trace Metadata

Status: `Open`

Problem:

Implementers cannot determine which authority rule, block, expiry source, proof
source, or revocation check produced a result.

Required resolution:

Add optional debug metadata:

```text
authorityProfile
authoritySource
authorityAddress
authorityExpiry
ensBlockNumber
ensBlockHash
resolverAddress
proofUri
proofHash
expirySources
freshnessSources
revocationStatus
validationSteps
```

Do not expose sensitive fetch details in public UI by default.

Acceptance criteria:

- Debug output identifies every authority, expiry, snapshot, proof, and
  revocation input used by the verifier.
- Public results remain stable when debug mode is disabled.

### P2-002: Assurance Metadata Lacks Normative Derivation Rules

Status: `Partial`

Problem:

Fields such as `dnssec`, `hash-pinned`, `content-addressed`, `live`, and
`erc1271` exist, but the exact evidence required to set each value is not
defined.

Required resolution:

- Define each assurance value normatively.
- Require absence rather than `false` when a property was not checked.
- Distinguish “checked and false” from “not checked.”
- Prevent assurance metadata from changing public status.

Acceptance criteria:

- Every assurance field has positive, negative, and not-checked vectors.
- Two implementations derive identical assurance metadata from the same
  evidence.

### P2-003: Indexer Results Lack A Mandatory Portable Cache Contract

Status: `Partial`

Problem:

Indexer results are described as hints, but no required response fields allow a
client to determine snapshot, expiry, freshness, or revalidation needs.

Required resolution:

Require indexer hints to include:

```text
checkedAt
cacheUntil
validUntil
ensBlockNumber
ensBlockHash
method
proofHash when available
revocationCheckedAt when applicable
```

Clients must revalidate live state before high-trust use.

Acceptance criteria:

- A client can reject stale or reorged indexer results using response metadata
  alone.
- Removing indexer access cannot prevent direct verification.

### P2-004: UI Language Does Not Fully Distinguish Method-specific Semantics

Status: `Partial`

Problem:

Allowed and forbidden copy exists, but generic `verified/control` can still hide
meaningful differences between HTTPS publication, unsigned DNS, DNSSEC, target
account signatures, owner endorsement, and issuer policy.

Required resolution:

- Define one exact relationship sentence per method.
- State the target authority and trust dependency.
- State forbidden claims per method.
- Display issuer identity for attestations.
- Never use a generic checkmark without accessible method details in
  high-trust contexts.

Acceptance criteria:

- Every standard method has allowed and forbidden UI strings.
- UI conformance fixtures distinguish control, endorsement, and attestation.

### P2-005: Issue Status And Normative Documentation Are Not Synchronized

Status: `Open`

Problem:

The previous tracker marked lifecycle, errors, versioning, privacy, DNSSEC, and
schema work open even after partial normative text was added. It marked
authority complete despite unresolved subname and ENSv2 behavior.

Required resolution:

- Update issue status in the same change as normative behavior.
- Link every issue to exact spec sections, vectors, and implementation tests.
- Do not mark an issue complete based only on research prose.
- Require acceptance criteria to pass before closure.

Acceptance criteria:

- Every closed issue links to merged normative text and passing tests.
- Summary status matches detailed issue status.

### P2-006: ENSIP Submission Artifact Is Not Isolated From Product Documentation

Status: `Open`

Problem:

The normative draft is an MDX site page with placeholder contributors and
references to companion pages. The ENSIP repository expects one submission
artifact following its template and validation rules.

Required resolution:

- Produce a standalone `ensips/x.md`-compatible document.
- Add real contributors.
- Keep all base normative requirements in that artifact.
- Mark method profiles as separate drafts or explicit appendices.
- Use stable references for schemas and vectors.
- Run the ENSIP repository validation workflow before submission.

Acceptance criteria:

- The standalone file passes the vendored ENSIP repository validation workflow.
- Removing the documentation site does not remove any base normative
  requirement from the submission artifact.

## Explicit Non-goals

These are not protocol defects and must remain outside the base verification
claim:

- safety or malware assessment;
- phishing detection;
- legal ownership;
- brand authenticity;
- reputation scoring;
- universal issuer trust;
- proof that an address is a safe payment recipient;
- proof that an agent endpoint behaves correctly;
- proof that content is accurate or non-malicious.
