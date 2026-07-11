# Protocol Decisions

This document records the decisions used by the normative ENS Resolver Record
Verification specification. Earlier research files remain useful background;
this document supersedes them where they conflict.

## 1. Protocol Boundary

The protocol has three layers:

```text
ENS resolution and current authority
  -> common record-verification kernel
    -> method-specific target evidence
```

The kernel is independent of resolver implementation. It defines discovery,
descriptors, exact live-value hashing, one EIP-712 claim, proof envelopes,
lifecycle, results, and errors.

The protocol does not deploy a verification contract. Verifiers read existing
ENS contracts through read-only calls and validate external proof material.

## 2. Universal Resolver Is The Record-resolution Boundary

Clients resolve the target record and verification descriptor through the
canonical Universal Resolver defined by ENSIP-23. This provides one entrypoint
for direct resolvers, inherited resolvers, wildcard resolvers, and CCIP Read.

All ENS reads for one evaluation use the same block reference. The target and
descriptor are resolved for the exact DNS-encoded name. A gateway response does
not define ENS authority.

Universal Resolver does not currently provide one stable authority interface
across every ENS registry implementation. Authority remains a small isolated
algorithm in the specification. A future registry transition changes that
algorithm and the EIP-712 domain, not the record-verification kernel or method
profiles.

## 3. Exact-name Authority

Verification authority belongs to the exact ENS name, not its resolver writer
or parent owner.

Current Ethereum mainnet rules are:

| Name state                         | Authority                            | Expiry bound                                                                   |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Registry owner is Name Wrapper     | Wrapper owner for the exact node     | Wrapper expiry; `.eth` second-level names are also bounded by registrar expiry |
| Unwrapped `.eth` second-level name | Base Registrar registrant            | Registrar expiry                                                               |
| Other exact name                   | ENS Registry owner of the exact node | No extra bound unless ENS exposes one                                          |

Unwrapped subnames do not automatically expire with a parent registration. The
ENS Registry stores child ownership independently. Re-registering a parent does
not delete existing child records; the new parent owner can replace them.
Therefore parent transfer or re-registration is not treated as transfer of the
exact child.

Wrapped subnames have explicit expiry. A verifier rejects a wrapped authority
at or after that expiry even if raw wrapper storage still contains an address.

This decision preserves delegated subname ownership. Requiring every parent to
co-sign would make an independently owned child dependent on its parent and is
not adopted.

## 4. One Strict EIP-712 Claim

There is one claim type and no extensions:

```solidity
ENSRecordVerification(
  string name,
  bytes32 node,
  string recordType,
  string recordKey,
  bytes32 valueHash,
  string method,
  string target,
  uint64 issuedAt,
  uint64 validUntil,
  bytes32 nonce
)
```

Method-specific data is not added to this struct. A method proof binds to the
common claim digest when it needs an additional signature or attestation.

`issuedAt` makes maximum proof lifetime enforceable. Every method defines a
maximum lifetime. `nonce` is a cryptographically random 32-byte proof
identifier; it is not a global revocation nonce.

## 5. Deployment Separation Uses The EIP-712 Domain

The claim does not contain a registry-version or authority-profile string.
Deployment separation is already provided by the EIP-712 domain:

```text
name
version
chainId
verifyingContract
```

For current Ethereum mainnet, `verifyingContract` is the ENS Registry. A future
registry deployment uses its canonical registry/root and, when authority
semantics change, a new domain version. Proofs from different deployments
cannot be replayed across domains.

## 6. CAIP-10 Account Targets

Address verification uses CAIP-10 account IDs as canonical targets. CAIP-10
provides the chain context missing from a bare coin type or address string.

Initial EVM mapping:

```text
coinType 60 -> eip155:1:<lowercase-address>
coinType with ENSIP-11 MSB -> eip155:<chainId>:<lowercase-address>
```

The address is lowercase `0x` plus 40 hexadecimal digits. Display checksum is
not part of the signed target.

Non-EVM coin types require a registered account profile that defines the CAIP-2
chain identifier, CAIP-10 address canonicalization, signature algorithm, and
verification procedure. Unsupported profiles return `unsupported_method`.

## 7. Three Positive Relationships

The protocol distinguishes:

| Relationship    | Meaning                                                            |
| --------------- | ------------------------------------------------------------------ |
| `authorization` | Current ENS authority signed the exact live record value.          |
| `control`       | Current ENS authority signed and the external target participated. |
| `attestation`   | Current ENS authority signed and an accepted issuer attested.      |

This avoids describing a contenthash or arbitrary data value as externally
controlled when only the ENS authority signed it. The generic
`authority-signature` method supports owner authorization for any supported
record selector.

## 8. Compact Closed Descriptor

The descriptor is:

```text
ensrv1 m=<method> [u=<uri> h=<hash>]
```

Rules:

- `m` occurs exactly once.
- `u` and `h` occur together or are both absent.
- `h` is lowercase `0x`-prefixed `keccak256` of retrieved proof body bytes.
- Unknown and duplicate fields are invalid.
- Method profiles declare whether `u` and `h` are required or forbidden.
- Incompatible additions require a new descriptor version.

Rejecting unknown fields prevents older clients from ignoring future
security-critical constraints.

## 9. Deterministic Proof Selection

Every claim has:

```text
proofId = keccak256(
  abi.encode(
    node,
    keccak256(bytes(recordType)),
    keccak256(bytes(recordKey)),
    keccak256(bytes(method))
  )
)
```

`https-origin` serves one proof per `proofId` at:

```text
<origin>/.well-known/ens-record-verification/<lowercase-proofId>
```

DNS TXT entries include the same `proofId`. This removes ambiguous scanning and
allows one origin or DNS zone to verify multiple ENS records.

## 10. One Strict JSON Envelope

The common envelope is:

```json
{
  "v": "ensrv1",
  "claim": {},
  "authoritySignature": "0x...",
  "methodProof": {}
}
```

Common objects reject unknown and duplicate members. `methodProof` is validated
by the selected method schema. JSON bytes are not signed; the EIP-712 claim is
signed.

## 11. Proof-byte Integrity

When `h` is present, it hashes the response body after transfer and content
decoding, before UTF-8 decoding or JSON parsing. Fetchers enforce scheme,
redirect, private-network, timeout, response-size, and decompression limits.

## 12. Lifecycle

A positive result requires current agreement among:

```text
live target record
live descriptor
current exact-name authority
current method evidence
all applicable expiry and revocation checks
```

The result expires at the earliest applicable bound. Descriptor deletion or
change is ENS-side revocation. High-trust actions revalidate. Caches are
performance hints and never replace live validation.

## 13. Initial Method Set

| Method                        | Relationship    | Status                                                            |
| ----------------------------- | --------------- | ----------------------------------------------------------------- |
| `authority-signature`         | `authorization` | Normative                                                         |
| `https-origin`                | `control`       | Normative                                                         |
| `dns-txt`                     | `control`       | Normative for URL, email-domain, and HTTPS agent endpoint targets |
| `account-signature`           | `control`       | Normative for initial EVM account profiles                        |
| `service-account.<provider>`  | `control`       | Abstract family until a provider profile is complete              |
| `issuer-attestation.<format>` | `attestation`   | Abstract family until a format profile is complete                |

Method identifiers are immutable. Adding support for a previously unsupported
coin or provider profile does not reinterpret an existing proof. Incompatible
validation changes allocate a new identifier.

## 14. Deferred Features

The first release does not define:

- delegated verification authority;
- multiple advertised methods per record;
- a global revocation registry;
- an onchain method registry;
- safety, reputation, legal ownership, or anti-phishing claims.
