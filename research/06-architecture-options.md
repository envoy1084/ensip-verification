# Architecture Options

This file evaluates possible architectures for ENS record verification. The
revised conclusion is that a mandatory singleton proof system is too rigid. ENS
should standardize shared semantics and Ethereum-native authority rules while
letting each record class use native proof methods.

## Evaluation Criteria

| Criterion                  | Why It Matters                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Backwards compatibility    | Existing names and resolvers should work.                                            |
| Deterministic verification | Independent clients should reach the same result.                                    |
| Extensibility              | New record types and methods should not require a new base ENSIP.                    |
| Minimal trust              | The base protocol should not require a central verifier.                             |
| Developer UX               | A user should be able to authorize verification with as little friction as possible. |
| Gas and storage cost       | ENS-side data should be small.                                                       |
| Revocation                 | Transfers and stale target control must invalidate proofs.                           |
| Clear semantics            | UI must know exactly what was verified.                                              |

## Option A: Record-Specific Sidecar Keys

Example:

```text
url-verification[<originHash>]
addr-verification[60][<addressHash>]
text-verification[com.twitter][<valueHash>]
```

Benefits:

- easy to implement on existing resolvers;
- deterministic lookup for known record types;
- small ENS-side records;
- each record can define precise canonicalization.

Problems:

- many ENSIPs or naming conventions can fragment the ecosystem;
- clients need per-record discovery rules;
- shared concepts such as expiry, signature, and authority are duplicated;
- future records may choose incompatible semantics.

Assessment: useful for URL and other records where an ENS-side opt-in anchor is
valuable. It should not be the only publication shape, and it should not force
every method into one envelope.

## Option B: Single Verification Manifest

Example:

```text
text("verification") = ipfs://... or data:...
```

The manifest lists verified claims and proof digests.

Benefits:

- one record to discover;
- can batch many records;
- good for wallet and profile UX;
- easy to add future claims.

Problems:

- text record size can grow quickly;
- updating one claim may require rewriting the whole manifest;
- clients still need method adapters;
- stale manifest entries must be checked against live records;
- if the manifest is offchain, clients need content integrity and availability.

Assessment: strong as an optional index for UX and batching. Risky as the only
canonical source unless the manifest is content-addressed and each claim remains
independently verifiable.

## Option C: New Resolver Interface

Example:

```solidity
function verification(bytes32 node, bytes calldata recordSelector, bytes32 valueHash)
  external view returns (VerificationRecord memory);
```

Benefits:

- typed data instead of ad hoc text parsing;
- efficient client access;
- can expose resolver-native authorization state.

Problems:

- requires resolver upgrades or new resolver adoption;
- does not help existing names immediately;
- offchain resolvers need additional profile support;
- still cannot avoid target-specific evidence.

Assessment: good future optimization, poor first deployment requirement.

## Option D: Attestation Registry

Examples include Ethereum Attestation Service, a custom onchain registry, or
offchain verifiable credentials.

Benefits:

- good for third-party verification;
- can support issuer reputation;
- can avoid storing large data in ENS;
- useful when target evidence is private or provider-mediated.

Problems:

- introduces issuer trust;
- may be chain-specific;
- does not prove the current ENS record still matches unless clients check ENS;
- can become a de facto centralized badge system;
- revocation semantics vary by issuer.

Assessment: valuable optional layer. Not suitable as the neutral base protocol
for record-control verification.

## Option E: Target-Only Proofs

Example: the website or social account publishes a proof signed by the ENS
authority, but ENS stores no verification descriptor.

Benefits:

- no ENS write required beyond the original record;
- simple for web targets;
- cheap for users.

Problems:

- clients may probe arbitrary targets without ENS-side opt-in;
- discovery is hard for social accounts and addresses;
- stale proofs are easier to misinterpret;
- no cheap ENS-side method pointer or digest for indexers;
- target compromise can surface old proofs until expiry.

Assessment: useful as a fallback for some methods, but weak as the default
because it lacks an ENS-side consent and discovery anchor.

## Option F: Central Verifier Badge

Example: a service verifies records and publishes an API saying which records are
verified.

Benefits:

- best short-term UX;
- handles provider APIs and private proofs;
- can add risk scoring and abuse response.

Problems:

- trust shifts to the service;
- censorship and availability risks;
- difficult for clients to independently verify;
- does not fit ENS as a permissionless naming system.

Assessment: acceptable as an app-specific overlay or attestation issuer. It
should not be the ENSIP base layer.

## Option G: Base ENSIP Plus Method Profiles

Example:

```text
Base ENSIP:
  verification keys, compact descriptors, live-value hashing,
  current authority, common claim fields, result states

Method profiles:
  https-origin
  dns-txt
  service-account
  account-signature
  content-manifest
  email-domain
  email-attestation
  issuer-attestation
```

Benefits:

- keeps HTTPS, DNS, service accounts, address signatures, contenthash manifests,
  email, and attestations native to their ecosystems;
- fits Ethereum patterns such as EIP-712, ERC-1271, resolver profiles, CCIP-Read,
  and attestations;
- allows public proofs where possible and provider-mediated attestations where
  necessary;
- avoids a central proof envelope becoming a bottleneck for future records;
- still gives clients consistent result semantics.

Problems:

- more method profiles to specify and test;
- SDKs need adapter dispatch and method capability metadata;
- governance needs a lightweight way to prevent method-name collisions;
- clients must decide which methods they support and trust.

Assessment: best fit. It preserves native integrations without giving up
interoperability at the client and UI layer.

## Recommended Architecture

Use a base ENSIP plus method profiles:

1. A base ENSIP for resolver-class verification keys, compact descriptor
   parsing, method identifiers, raw live-value hashing, current-authority rules,
   common EIP-712 claim fields, proof-envelope requirements, and result
   semantics.
2. Method profiles for each proof family.
3. ENSIP-5 verification descriptor records as the current discovery mechanism:
   `verification[text][<key>]`, `verification[addr][<coinType>]`,
   `verification[contenthash]`, and reserved `verification[data][<key>]`.
4. A reference SDK with a single `verifyEnsRecord()` interface that dispatches
   to method adapters.
5. Future resolver interfaces and CCIP-Read profiles as optimizations, not
   dependencies.

This keeps the base decentralized while allowing real-world integrations that
cannot be forced into a public file, DNS record, or universal signed envelope.

The current architecture package implements this recommendation with an
important refinement: the descriptor record is required for discovery, but the
large proof payload is method-specific and usually offchain. The descriptor is:

```text
ensrv1 m=<method> [u=<uri>] [h=<hash>]
```

It deliberately omits `kind`, `method=none`, and descriptor-level expiry.

## Cross-Questioning the Recommendation

### Why Not a Singleton Envelope?

A singleton envelope improves consistency but becomes a common-denominator
format. OAuth, DNSSEC, EIP-712 address signatures, ERC-1271 smart accounts,
contenthash manifests, and attestations each have native semantics. Forcing them
into one proof object risks either weakening those semantics or making the base
standard too complex. The SDK can still expose one result format.

### Why Not Only a Manifest?

A single manifest is attractive, but it becomes a large mutable object. If one
social handle changes, the whole manifest changes. Per-record descriptors let
clients verify one record independently and let indexers track smaller changes.
The manifest can still exist as an index.

### Why Not Only Descriptor Records?

Per-record descriptors are deterministic for known target records, but they do
not solve global enumeration. A wallet that wants to show all verified records
still needs to know which resolver records to inspect or use an optional index.
A future manifest can improve discovery for profile pages and batch
verification, but it should remain an index, not the trust root.

### When Should ENS-Side Proof Data Be Required?

Target-only proofs are cheaper, but the current architecture chooses a compact
ENS-side descriptor for explicit opt-in and deterministic method dispatch. The
descriptor should stay small; proof bodies, attestations, signatures, and
manifests remain offchain or target-native.

### Why Not Make EAS Mandatory?

EAS is useful for attestations, but a mandatory attestation registry would turn
record verification into issuer selection. The base protocol should be
verifiable by any client with ENS access and target evidence.

### Why Not Trust Resolver Permissions?

Resolver permissions are about record writing. Identity verification has higher
semantic weight. A broad resolver operator may be allowed to update profile
metadata but should not automatically become the identity verification signer
for every external account. Explicit scoped delegation is cleaner.

## Sources

- [ENS records](https://docs.ens.domains/web/records/)
- [ENSIP-1: ENS](https://docs.ens.domains/ensip/1/)
- [ENS resolvers](https://docs.ens.domains/resolvers/)
- [ENS CCIP-Read documentation](https://docs.ens.domains/resolvers/ccip-read)
- [EIP-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)
- [ERC-3668: CCIP Read](https://eips.ethereum.org/EIPS/eip-3668)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [Ethereum Attestation Service documentation](https://docs.attest.org/docs/welcome)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
- [RFC 8555: ACME](https://datatracker.ietf.org/doc/html/rfc8555)
- [RFC 6749: OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
