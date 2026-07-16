# ENSIP-X: Record Verification

> **Working draft:** This document is preserved for research and is not the
> current source of truth. The protocol components are being hardened
> independently in `apps/web/src/pages/docs` before a new ENSIP is assembled.

## Abstract

This ENSIP defines a record-scoped verification layer for ENS resolver records.
A name publishes a verification descriptor for one resolver record. A verifier
binds method evidence to the exact live record value, the current exact-name ENS
authority, and a canonical external target.

A successful verification demonstrates that the current ENS authority approved
the claim and that method evidence established target control or a
policy-accepted attestation for that record. The protocol uses existing ENS
text records and requires no resolver interface or contract change.

## Motivation

ENS resolver records are a general-purpose discovery mechanism. A resolver can
publish URLs, multichain addresses, contenthash values, service endpoints, and
future record types through standardized interfaces.

```text
text("url")        = "https://example.com"
text("com.github") = "alice"
addr(60)           = 0x1234...
contenthash()      = ipfs://bafy...
```

These records define what the resolver returns. They do not prove control of
the website, provider account, blockchain account, content root, or other
external target represented by the value.

This ENSIP lets a name select a verification method for one record at a time.
The method evidence is bound to the exact name, record selector, live resolver
bytes, current authority, method, target, and validity interval. Changing any
bound value causes the old proof to stop matching.

Verification does not define a global trust system. It does not establish that
a target is safe, official, legally owned, reputable, non-malicious, or endorsed
by ENS.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and
"OPTIONAL" in this document are to be interpreted as described in RFC 2119 and
RFC 8174.

### Terminology

- **Target resolver record**: the existing ENS record being evaluated.
- **Record selector**: the resolver function and exact key or numeric argument.
- **Verification descriptor**: the text-record value selecting an authority
  algorithm, method, and proof source.
- **Common claim**: the closed record-bound EIP-712 structure used by all
  methods.
- **Current ENS authority**: the exact-name account selected by the descriptor's
  authority algorithm.
- **Authority evidence**: an EIP-712 or ERC-1271 signature by the current ENS
  authority over the complete common claim.
- **Canonical target**: the external resource derived from the live record by a
  method profile.
- **Method evidence**: target proof or issuer attestation defined by a method.
- **Evaluation block**: the Ethereum block used for all ENS and authority reads
  in one verification.
- **Live evaluation**: verification against the current record, descriptor,
  authority, method evidence, and validity state.

### Discovery Records

Verification descriptors are stored in ENSIP-5 text records. Their keys follow
the target resolver record class.

| Target resolver call   | `recordType`  | `recordKey`                 | Verification text key            |
| ---------------------- | ------------- | --------------------------- | -------------------------------- |
| `text(node, key)`      | `text`        | Exact key                   | `verification[text][<key>]`      |
| `addr(node, coinType)` | `addr`        | Canonical decimal coin type | `verification[addr][<coinType>]` |
| `contenthash(node)`    | `contenthash` | Empty string                | `verification[contenthash]`      |
| `data(node, key)`      | `data`        | Exact key                   | `verification[data][<key>]`      |

For text and data records, clients MUST construct the verification key by exact
concatenation:

```text
"verification[text][" + key + "]"
"verification[data][" + key + "]"
```

The target key MUST be non-empty and MAY contain brackets. Clients MUST match
the fixed prefix and final `]`; they MUST NOT recursively parse brackets.

Address coin types MUST use unsigned canonical decimal without a sign or
leading zeroes, except that zero is encoded as `0`.

Clients MUST normalize names according to ENSIP-15. They MUST resolve the target
record and descriptor through the ENSIP-23 Universal Resolver for the same
exact DNS-encoded name and evaluation block.

An empty target value or empty descriptor cannot produce a positive result.

### Verification Descriptor

The descriptor is an ASCII string:

```text
ensrv1 a=<authority-version> m=<method> [u=<uri>] [h=<hash>]
```

```text
descriptor  = "ensrv1" 1*(SP field)
field       = field-name "=" field-value
field-name  = 1*(%x61-7A / %x30-39 / "-")
field-value = 1*(%x21-7E)
```

| Field | Requirement                                                             |
| ----- | ----------------------------------------------------------------------- |
| `a`   | Required once. Canonical decimal `uint32` authority version.            |
| `m`   | Required once. Concrete identifier matching `[a-z0-9][a-z0-9.-]{0,63}`. |
| `u`   | Method-defined absolute proof URI, maximum 1,024 bytes.                 |
| `h`   | Lowercase `0x` followed by 64 hexadecimal digits.                       |

A descriptor MUST NOT exceed 2,048 bytes. Clients MUST reject non-ASCII input,
control characters, empty or duplicate fields, unknown fields, invalid lexical
forms, and fields forbidden by the selected method.

Generators MUST emit one space between fields and field order `a`, `m`, `u`,
`h`. Unknown descriptor versions, authority versions, and methods fail
closed.

When `h` is present:

```text
h = keccak256(proofResourceBytes)
```

`proofResourceBytes` is the resource after transport content decoding and
before UTF-8 decoding or JSON parsing. A content-addressed method MAY use its
URI identifier instead of `h`.

### Common Claim

Every method MUST use this EIP-712 type:

```solidity
struct ENSRecordVerification {
  string name;
  bytes32 node;
  string recordType;
  string recordKey;
  bytes32 valueHash;
  uint32 authorityVersion;
  address authority;
  string method;
  string target;
  uint64 issuedAt;
  uint64 validUntil;
}
```

The declaration formatting is not part of the EIP-712 encoded type. Clients
MUST preserve the exact struct name, field types, field names, and field order
shown above.

Version 1 uses this EIP-712 domain on Ethereum mainnet:

```text
name:              ENS Record Verification
version:           1
chainId:           1
verifyingContract: 0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe
```

| Field              | Requirement                                        |
| ------------------ | -------------------------------------------------- |
| `name`             | ENSIP-15 normalized exact name.                    |
| `node`             | `namehash(name)`.                                  |
| `recordType`       | Exact target resolver record type.                 |
| `recordKey`        | Exact key or canonical numeric parameter.          |
| `valueHash`        | Keccak-256 of exact live resolver return bytes.    |
| `authorityVersion` | Descriptor field `a`.                              |
| `authority`        | Live exact-name authority at the evaluation block. |
| `method`           | Descriptor field `m`.                              |
| `target`           | Canonical target derived by the method.            |
| `issuedAt`         | Proof publisher's Unix time in seconds.            |
| `validUntil`       | First Unix time at which the proof is invalid.     |

The common envelope is:

```json
{
  "v": "ensrv1",
  "claim": {
    "name": "alice.eth",
    "node": "0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec",
    "recordType": "text",
    "recordKey": "url",
    "valueHash": "0x34174bbdf078fba55709ff82e2d5929de2e915c964d18dc57907afc851781142",
    "authorityVersion": "1",
    "authority": "0x1234567890abcdef1234567890abcdef12345678",
    "method": "https-origin.v1",
    "target": "https://example.com",
    "issuedAt": "1783728000",
    "validUntil": "1786320000"
  },
  "proof": {
    "authoritySignature": "0x<signature>"
  }
}
```

The envelope, claim, and proof MUST be closed JSON objects. Every method proof
MUST contain exactly one common `authoritySignature` plus its method-defined
fields. Clients MUST reject duplicate members before constructing a map.
Decimal integers MUST use canonical strings within their EIP-712 ranges. Byte
values MUST use lowercase, even-length, `0x`-prefixed hexadecimal.

The JSON serialization is not signed. Clients parse and compare every claim
field, encode the common claim as EIP-712, validate the authority signature,
and apply the selected method to that claim or its digest.

### Value Hashing

```text
valueHash = keccak256(valueBytes)
```

| Record type   | `valueBytes`                           |
| ------------- | -------------------------------------- |
| `text`        | Exact UTF-8 bytes returned by `text`.  |
| `addr`        | Exact binary bytes returned by `addr`. |
| `contenthash` | Exact bytes returned by `contenthash`. |
| `data`        | Exact bytes returned by `data`.        |

Method profiles MAY derive semantic targets from these bytes. They MUST NOT
change the base `valueHash` rule.

### Current ENS Authority

Descriptor `a=1` selects Authority Algorithm 1 on Ethereum mainnet.

1. Read `ENSRegistry.owner(node)` at the evaluation block.
2. If the Registry owner is the Name Wrapper:
   1. read the exact node with `NameWrapper.getData`;
   2. require a nonzero wrapped owner;
   3. for a wrapped `.eth` second-level name, require an active Base Registrar
      registration owned by the Name Wrapper and use the registrar expiry;
   4. for another name with `PARENT_CANNOT_CONTROL` burned, require active
      wrapper expiry and use it as the authority bound;
   5. otherwise select the wrapped owner without treating wrapper expiry as an
      ownership expiry.
3. Otherwise, for an unwrapped `.eth` second-level name:
   1. calculate `tokenId = uint256(keccak256(bytes(label)))`;
   2. read `BaseRegistrar.ownerOf(tokenId)` and `nameExpires(tokenId)`;
   3. require a nonzero registrant and unexpired registration;
   4. select the registrant and registrar expiry.
4. Reject name classes not defined by Algorithm 1, including reverse namespace
   names.
5. Otherwise, require and select the nonzero exact Registry owner.

Clients MUST NOT substitute an ancestor owner, resolver writer, wildcard
resolver, Universal Resolver, CCIP Read gateway, or gateway signer. The selected
address MUST equal claim field `authority`.

Calculate `commonClaimDigest` using the EIP-712 type and domain above. Clients
MUST inspect authority code at the evaluation block. With no code, strict
recovery of a 65-byte, low-`s`, `r || s || v` secp256k1 signature with `v`
equal to 27 or 28 MUST produce the selected authority. With code, an ERC-1271
`staticcall` for `(commonClaimDigest, authoritySignature)` MUST return the exact
`0x1626ba7e` magic value. Clients MUST NOT fall back to EOA recovery for a
contract. Contract signatures are opaque, nonempty byte strings and MUST NOT
exceed 8,192 bytes. The proof MUST NOT select the authority-validation path.

### Proof Key

```solidity
PROOF_KEY_TYPEHASH = keccak256(
  "ENSRecordVerificationProofKey(bytes32 domainSeparator,uint32 authorityVersion,address authority,bytes32 node,bytes32 recordTypeHash,bytes32 recordKeyHash,bytes32 methodHash)"
);

proofKey = keccak256(
  abi.encode(
    PROOF_KEY_TYPEHASH,
    domainSeparator,
    authorityVersion,
    authority,
    node,
    keccak256(bytes(recordType)),
    keccak256(bytes(recordKey)),
    keccak256(bytes(method))
  )
);
```

The key excludes record value and timestamps so one publication location can be
reused for renewal or record updates. It includes authority so a transfer uses a
different publication slot. Every live claim field is still compared during
verification.

### Verification Lifecycle

At evaluation time `now`, clients MUST require:

```text
issuedAt <= now + 300
issuedAt < validUntil
now < validUntil
validUntil - issuedAt <= methodMaxLifetime
```

`issuedAt` is publisher-asserted and is not a trusted timestamp.

The result expires at the earliest applicable bound:

```text
effectiveValidUntil = min(
  claim.validUntil,
  authorityValidUntil?,
  methodEvidenceValidUntil?,
  issuerAttestationValidUntil?
)
```

A record-value, descriptor, authority, authority-signature, method-evidence,
validity, or evaluation block change invalidates the cached evaluation and
requires a new live evaluation. The new evaluation may still succeed if the
updated state and proof match. Descriptor deletion cannot produce a positive
result.

Descriptor deletion is the common ENS-side revocation action. Clients MUST
re-evaluate live state before a security-sensitive use and MUST NOT reuse cached
verification after any known validity or freshness bound.

### Verification Result

When all common and method checks succeed, the result MUST contain:

```json
{
  "verified": true,
  "verificationType": "control"
}
```

`verificationType` is `control` or `attestation`. Version 1 defines control
methods and reserves attestation for future method profiles.

When any required check does not succeed, the result MUST contain:

```json
{
  "verified": false
}
```

### Method Profiles

A concrete method MUST define:

- an immutable method identifier and one verification type;
- supported resolver selectors;
- canonical target derivation;
- permitted `u` and `h` combinations;
- exact proof location and closed proof schema;
- common authority-signature validation and exact target-proof fields;
- exact method evidence and its binding to the complete common claim;
- maximum lifetime, freshness, and revocation behavior;
- deterministic acceptance and rejection conditions;
- security considerations and interoperability requirements.

Version 1 defines:

| Method                        | Verification type | Records                       |
| ----------------------------- | ----------------- | ----------------------------- |
| `https-origin.v1`             | `control`         | HTTPS URL text records        |
| `dns-txt.url.v1`              | `control`         | `text("url")`                 |
| `account-signature.eip155.v1` | `control`         | Supported EVM address records |
| `account-signature.bip322.v1` | `control`         | Bitcoin `addr(0)`             |

Version 1 defines address verification only for the EVM and Bitcoin profiles
above. Future ENSIPs MAY register immutable methods for additional CAIP
namespaces and native signature systems without changing either existing
method.

### URL Example

```text
text("url") = "https://example.com/profile"
text("verification[text][url]") = "ensrv1 a=1 m=https-origin.v1 h=0x<64-lowercase-hex>"
```

The verifier hashes the exact URL bytes, derives `https://example.com`, compares
the live authority with the claim, and retrieves the common envelope from:

```text
https://example.com/.well-known/ens-record-verification/<proof-key-hex>
```

It then requires the retrieved bytes to match descriptor `h`, validates the
authority signature, and applies the target method. Same-origin publication of
the matching, unexpired proof demonstrates control of the origin for this exact
record.

## Rationale

Verification keys mirror existing resolver selectors. This keeps verification
record-scoped and avoids separate key families for websites, wallets, profiles,
and future applications.

The descriptor selects a method and external proof source. Proof bytes carry
the record-bound claim. `valueHash` covers the resolver's exact raw
value while each method separately derives its semantic target.

The current authority is carried in the claim, compared with live authority
state, and required to sign the claim. The descriptor commits to the proof
bytes through `h` or a content-addressed URI. A name transfer therefore
invalidates the old proof, and a proof for the new authority requires both new
authority approval and a new ENS descriptor commitment. Method evidence
separately establishes target control or attestation.

## Backwards Compatibility

This ENSIP adds ENSIP-5 text records. Existing resolvers require no new
interface. Clients that do not implement this ENSIP ignore verification records
and continue normal resolution.

Missing, invalid, unsupported, expired, or unavailable verification does not
change the target resolver record.

## Security Considerations

A valid proof can bind an attacker-controlled ENS name to an attacker-controlled
target. Verification is not evidence of safety, reputation, legal ownership,
brand identity, or ENS endorsement.

Resolver write permission may be delegated, but a delegated writer cannot
produce a positive result without a signature from the exact current ENS
authority. That signature proves approval of the record-bound claim; it does
not prove that the authority personally operates the target or that either
party is uncompromised.

Proof retrieval reveals lookup interest and processes untrusted network input.
Methods using remote resources must define secure transport, integrity,
redirect, DNS rebinding, SSRF, parser, and resource-limit behavior.

Target credentials can be compromised. A valid target proof demonstrates
control under the method at verification time; it does not establish continuing
security or the legal identity of the controller.

Clients must evaluate the live target record, descriptor, authority, method
evidence, validity, and revocation state. A stored proof is not independently a
positive verification result.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
