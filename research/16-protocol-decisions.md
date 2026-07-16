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
algorithm in the specification. A future registry transition changes the
authority algorithm version and changes the EIP-712 domain only if its chain or
deployment anchor also changes; it does not rewrite the record-verification
kernel or method profiles.

## 3. Exact-name Authority

Verification authority belongs to the exact ENS name, not its resolver writer
or parent owner.

Current Ethereum mainnet rules are:

| Name state                         | Authority                            | Expiry bound                           |
| ---------------------------------- | ------------------------------------ | -------------------------------------- |
| Wrapped `.eth` second-level name   | Wrapper owner for the exact node     | Registrar expiry                       |
| Emancipated wrapped name           | Wrapper owner for the exact node     | Exact wrapper expiry                   |
| Parent-controlled wrapped name     | Wrapper owner for the exact node     | None; wrapper expiry only resets fuses |
| Unwrapped `.eth` second-level name | Base Registrar registrant            | Registrar expiry                       |
| Other exact name                   | ENS Registry owner of the exact node | No extra bound unless ENS exposes one  |

Unwrapped subnames do not automatically expire with a parent registration. The
ENS Registry stores child ownership independently. Re-registering a parent does
not delete existing child records; the new parent owner can replace them.
Algorithm 1 therefore continues to select the exact child.

This does not prove that a new parent registration authorized the old child.
Whether to accept that state, reject it, or require ancestor-generation evidence
remains open in P0-001; it is not a settled lifecycle guarantee.

An emancipated wrapped subname has explicit ownership expiry. A
parent-controlled wrapped name can keep its owner when its expiry resets its
fuses, so a verifier does not apply that value as an authority bound.

Exact-child selection preserves delegated subname ownership and avoids silently
substituting the parent. A future stricter ancestry rule must preserve genuinely
independent children rather than making every parent co-sign every proof.

## 4. One Strict EIP-712 Claim

There is one claim type and no extensions:

```solidity
ENSRecordVerification(
  string name,
  bytes32 node,
  string recordType,
  string recordKey,
  bytes32 valueHash,
  uint32 authorityVersion,
  address authority,
  string method,
  string target,
  uint64 issuedAt,
  uint64 validUntil
)
```

Method-specific data is not added to this struct. A method proof binds to the
common claim digest when it needs an additional signature or attestation.

`issuedAt` is signer-asserted, not an independent timestamp. It makes the signed
validity interval enforceable and lets clients reject future-dated claims.
Every method defines a maximum lifetime.

## 5. Authority Evolution Is Explicit

The descriptor contains `a=<authorityVersion>` and the claim signs the same
numeric value together with the computed authority address. Authority Algorithm
1 defines current Ethereum mainnet rules. Unsupported authority versions fail
closed and methods cannot override them.

The EIP-712 domain uses the long-lived canonical Universal Resolver proxy:

```text
name
version
chainId
verifyingContract
```

For current Ethereum mainnet, `verifyingContract` is
`0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`. The proxy is a stable deployment
anchor; it does not execute signature verification. Future authority semantics
allocate a new authority version without changing record discovery or method
profiles. Old clients reject the new value instead of applying Algorithm 1.

P0-021 may require a new common claim version with signed authority context.
Changing `a` alone cannot distinguish two ownership generations that use the
same profile and authority address.

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
ensrv1 a=<authority-version> m=<method> [u=<external-uri>]
```

Rules:

- `a` and `m` occur exactly once.
- `u` is method-specific and only locates an external proof resource.
- Inline proof data and `data:` URIs are not supported.
- Unknown and duplicate fields are invalid.
- Method profiles declare whether `u` is required, permitted, or forbidden and
  define every allowed URI scheme.
- Incompatible additions require a new descriptor version.

Rejecting unknown fields prevents older clients from ignoring future
security-critical constraints.

## 9. Deterministic Proof Selection

Every record-method publication slot has:

```text
PROOF_KEY_TYPEHASH = keccak256(
  "ENSRecordVerificationProofKey(bytes32 domainSeparator,uint32 authorityVersion,bytes32 node,bytes32 recordTypeHash,bytes32 recordKeyHash,bytes32 methodHash)"
)

proofKey = keccak256(
  abi.encode(
    PROOF_KEY_TYPEHASH,
    eip712DomainSeparator,
    authorityVersion,
    node,
    keccak256(bytes(recordType)),
    keccak256(bytes(recordKey)),
    keccak256(bytes(method))
  )
)
```

`https-origin.v1` serves one proof per `proofKey` at:

```text
<origin>/.well-known/ens-record-verification/<64-lowercase-hex-without-0x>
```

DNS profiles encode `proofKey` as lowercase unpadded base32 in a claim-specific
owner name. This removes ambiguous scanning and allows one origin or DNS zone to
verify multiple ENS records.

## 10. One Strict JSON Envelope

The common envelope is:

```json
{
  "v": "ensrv1",
  "claim": {},
  "authoritySignature": "0x...",
  "proof": {}
}
```

Common objects reject unknown and duplicate members. `proof` is validated by
the selected method rules. JSON bytes are not signed; the EIP-712 claim is
signed.

## 11. Proof Resource Integrity

The common claim and method evidence authenticate proof semantics rather than
the JSON serialization. Content-addressed URIs commit to exact bytes. A method
that needs a separate byte commitment carries it in target-controlled evidence;
for example, the DNSSEC TXT profile publishes both the external URI and hash.

Fetchers enforce method-specific scheme, redirect, private-network, timeout,
response-size, and decompression limits.

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

| Method                        | Relationship    | Status                                               |
| ----------------------------- | --------------- | ---------------------------------------------------- |
| `authority-signature.v1`      | `authorization` | Normative                                            |
| `https-origin.v1`             | `control`       | Normative                                            |
| `dns-txt.*.v1`                | `control`       | Normative concrete profiles with DNSSEC              |
| `account-signature.eip155.v1` | `control`       | Normative for unambiguous ENSIP-9/11 EVM coin types  |
| `service-account.<provider>`  | `control`       | Abstract family until a provider profile is complete |
| `issuer-attestation.<format>` | `attestation`   | Abstract family until a format profile is complete   |

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
