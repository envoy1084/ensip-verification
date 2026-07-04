# Architecture Options

This file evaluates possible architectures for ENS record verification. The
goal is a singleton verification system for many record types without pretending
that every record can use the same proof method.

## Evaluation Criteria

| Criterion | Why It Matters |
| --- | --- |
| Backwards compatibility | Existing names and resolvers should work. |
| Deterministic verification | Independent clients should reach the same result. |
| Extensibility | New record types and methods should not require a new base ENSIP. |
| Minimal trust | The base protocol should not require a central verifier. |
| Developer UX | A user should be able to authorize verification with as little friction as possible. |
| Gas and storage cost | ENS-side data should be small. |
| Revocation | Transfers and stale target control must invalidate proofs. |
| Clear semantics | UI must know exactly what was verified. |

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

Assessment: useful as a deployment shape, but too fragmented as the core
architecture unless all sidecars share one envelope and validation model.

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
authority, but ENS stores no verification sidecar.

Benefits:

- no ENS write required beyond the original record;
- simple for web targets;
- cheap for users.

Problems:

- clients may probe arbitrary targets without ENS-side opt-in;
- discovery is hard for social accounts and addresses;
- stale proofs are easier to misinterpret;
- no cheap ENS-side digest for indexers;
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

## Recommended Architecture

Use a hybrid:

1. A generic claim envelope and verification result model.
2. Deterministic sidecar records keyed by a claim hash.
3. Optional manifest record for batching and discovery.
4. Method adapters for target-specific evidence.
5. Optional attestation methods for provider-mediated or private claims.
6. Future resolver interface as an optimization, not a dependency.

This keeps the base decentralized while allowing real-world integrations that
cannot be fully public or cryptographic.

## Cross-Questioning the Recommendation

### Why Not Only a Manifest?

A single manifest is attractive, but it becomes a large mutable object. If one
social handle changes, the whole manifest changes. A sidecar keyed by claim hash
lets clients verify one record independently and lets indexers track smaller
changes. The manifest can still exist as an index.

### Why Not Only Sidecars?

Pure sidecars create discovery problems. A wallet that wants to show all
verified records would need to know every possible key. A manifest solves that
for profile pages and batch verification.

### Why Require ENS-Side Proof Data?

Target-only proofs are cheaper, but the ENS sidecar proves the current ENS
authority opted into this verification relationship and gives clients a digest
to compare. It prevents a target from unilaterally claiming a relationship with
an ENS name without current ENS-side participation.

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
- [ENS resolvers](https://docs.ens.domains/resolvers/)
- [EIP-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)
- [Ethereum Attestation Service documentation](https://docs.attest.org/docs/welcome)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
- [RFC 8555: ACME](https://datatracker.ietf.org/doc/html/rfc8555)

