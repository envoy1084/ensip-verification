---
description: Verification model for ENS records that reference external targets.
contributors:
  - TBD
ensip:
  created: "2026-07-04"
  status: draft
track: Ecosystem
---

# ENSIP-X: ENS Record Verification

## Abstract

This ENSIP defines a common verification model for ENS records that reference
external targets.

It standardizes:

- a minimal verification result;
- a `verification[...]` ENSIP-5 discovery record convention;
- current owner, expiry, transfer, and remint rules;
- common EIP-712 signing fields; and
- verification categories for URL, address, social, contenthash, and avatar NFT
  records.

This ENSIP does not require resolver changes. Clients verify live ENS records
through existing ENS resolution, the Universal Resolver, or version-specific ENS
registry and resolver contracts.

## Motivation

ENS records often point outside ENS: websites, addresses, social accounts,
content roots, and NFTs. A resolver value alone says that the current resolver
returns a value. It does not always prove that the current owner of the ENS name
also controls the external target.

Verification should be deterministic, SDK-computable, and familiar to ENS
implementers. It should use existing terms such as `name`, `node`,
`namehash(name)`, resolver, owner, `text`, `addr`, and `contenthash`. It should
not require a central verifier, a new resolver interface, or a new generic
identity graph.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119 and RFC 8174.

### Definitions

`name`
: The normalized ENS name being verified.

`node`
: `namehash(name)`, as defined by ENSIP-1.

`record`
: A resolver record identifier. This ENSIP defines `text:url`, `addr:<coinType>`,
  `text:<serviceKey>`, `contenthash`, and `text:avatar`.

`value`
: The exact value returned by the current resolver for `record`.

`valueHash`
: `keccak256` of the method-defined canonical bytes for `value`.

`target`
: The external target being verified, such as a URL origin, account, stable
  social account ID, publisher key, DNS name, Arweave owner, or NFT reference.

`method`
: A string identifying the verification method.

`current owner`
: The account that currently owns the ENS name, as defined in
  [Current Owner](#current-owner).

`proof`
: Method-specific evidence that binds the live ENS record to the target.

### Verification Result

Clients MUST NOT mix verification status with errors. The only verification
statuses are:

```text
none
verified
```

A positive result MUST include one verification kind:

```text
control
attestation
```

`control` means the current ENS record and the target both validate the same
claim, or the method defines an equivalent deterministic ownership check.

`attestation` means an issuer made a signed or onchain claim. A client MUST
apply its own issuer trust policy before returning `verified`.

Failures such as `unsupported_method`, `proof_missing`, `expired`, or
`signature_invalid` are error codes on `none`; they are not statuses.

Common error codes:

| Code | Meaning |
| --- | --- |
| `record_missing` | The resolver returned no value for the requested record. |
| `unsupported_record` | This ENSIP does not define verification for the record. |
| `unsupported_method` | The client does not implement the advertised method. |
| `proof_missing` | No candidate proof was found. |
| `proof_malformed` | A proof or discovery record could not be parsed. |
| `signature_invalid` | ECDSA recovery or ERC-1271 validation failed. |
| `owner_mismatch` | The signer is not the current owner. |
| `target_mismatch` | The target proof does not match the live ENS record. |
| `target_unavailable` | The target could not be fetched or queried. |
| `issuer_untrusted` | The attestation issuer is outside client policy. |
| `revoked` | The attestation or proof was revoked. |
| `expired` | The proof, attestation, or name is expired. |

### Verifiable Records

| Category | ENS record | Verification |
| --- | --- | --- |
| URL | `text(node, "url")` | Current owner signature plus HTTPS or DNS proof. |
| Address | `addr(node)` or `addr(node, coinType)` | Current owner signature plus target account signature. |
| Social | `text(node, serviceKey)` | Public account proof or trusted issuer attestation. |
| Contenthash | `contenthash(node)` | Publisher manifest, Arweave owner proof, DNSLink proof, or trusted attestation. |
| Avatar NFT | `text(node, "avatar")` | ENSIP-12 CAIP NFT ownership by the resolved address. |

Profile metadata such as `name`, `description`, `location`, display fields,
keywords, and theme fields has no default external authority and MUST NOT be
reported as verified by this ENSIP.

### Discovery Records

Method profiles MAY define ENSIP-5 text records under the `verification[...]`
namespace. Discovery records are hints only.

Initial keys:

```text
verification[url]
verification[addr][<coinType>]
verification[social][<serviceKey>]
verification[contenthash]
verification[avatar]
```

`<coinType>` is the decimal ENSIP-9 coin type. `<serviceKey>` is the ENSIP-5
service key, such as `com.github`.

The common discovery value is:

```text
v=ENS-VERIFY-1;method=<method>;uri=<proof-uri>;expiry=<unix-time>
```

Parsing rules:

- field names are case-sensitive;
- fields are separated by semicolons;
- duplicate fields make the discovery record invalid;
- unknown fields MUST be ignored;
- an invalid discovery record does not invalidate the underlying ENS record.

Clients MUST still verify the live ENS record, current owner, target proof,
expiry, and signatures. A discovery record by itself is never a positive
verification.

### Proof Payloads

Proof payloads are method-defined. A proof payload SHOULD contain only fields
that cannot be reconstructed from live ENS state, target state, or the discovery
location.

Common proof fields:

| Field | Requirement |
| --- | --- |
| `v` | Version string, initially `ENS-VERIFY-1`. |
| `expiry` | Unix timestamp in seconds. |
| `nonce` | 32-byte nonce when a signature is used. |
| `signature` | Current owner signature when the method requires one. |

Methods MAY add target signatures, issuer signatures, revocation references, or
method-specific proof data.

### Current Owner

Clients MUST determine the current owner at verification time.

For ENSv1:

1. If `name` is an unwrapped `.eth` second-level name, the current owner is the
   ERC-721 owner returned by the canonical `.eth` Base Registrar for the
   labelhash. Proof expiry MUST be less than or equal to the registrar expiry
   for the label.
2. If `ENS.owner(node)` is the canonical Name Wrapper, the current owner is the
   wrapped owner returned by the Name Wrapper. Proof expiry MUST be less than or
   equal to the wrapped expiry.
3. Otherwise, the current owner is `ENS.owner(node)`. If an applicable expiry is
   known to the client, proof expiry MUST be less than or equal to that expiry.

For ENSv2:

1. Clients SHOULD use the Universal Resolver, or an ENSv2-aware library, for
   resolution.
2. Clients that integrate ENSv2 directly MUST follow the current ENSv2 registry
   and subregistry path for the name.
3. The current owner is the owner defined by the current ENSv2 registry state
   for that name.
4. A record-writer, resolver role, or manager role MUST NOT count as the current
   owner unless the ENSv2 contracts explicitly define it as ownership of the
   name.
5. If the ENSv2 registry exposes an expiry, proof expiry MUST be less than or
   equal to that expiry.
6. If the ENSv2 registry exposes a token ID, regenerated token ID, version, or
   equivalent remint boundary, cached positive results MUST be invalidated when
   it changes.

A proof signed by a previous owner MUST fail. This ENSIP does not define
delegated verification. Future ENSIPs MAY define a concrete delegation format.

### Common Signed Message

Methods that need current owner authorization SHOULD use EIP-712.

The EIP-712 domain is:

```solidity
EIP712Domain(
    string name,
    string version,
    uint256 chainId,
    address verifyingContract
)
```

Domain values:

```text
name = "ENS Record Verification"
version = "1"
chainId = chain ID of the owner contract being checked
verifyingContract = owner contract being checked
```

`verifyingContract` is the contract used to determine the current owner. For
example, this can be the ENS registry, the `.eth` Base Registrar, the Name
Wrapper, or the ENSv2 registry or subregistry contract that defines ownership
for the name.

The primary type is:

```solidity
struct ENSRecordVerification {
    string name;
    bytes32 node;
    string record;
    bytes32 valueHash;
    string target;
    string method;
    uint64 expiry;
    bytes32 nonce;
}
```

Field requirements:

| Field | Requirement |
| --- | --- |
| `name` | The normalized ENS name. `namehash(name)` MUST equal `node`. |
| `node` | `namehash(name)`. |
| `record` | The record identifier from this ENSIP or a method profile. |
| `valueHash` | Hash of method-defined canonical bytes for the live resolver value. |
| `target` | Method-defined external target identifier. |
| `method` | Method identifier. |
| `expiry` | Unix timestamp in seconds. MUST be in the future and MUST NOT exceed name expiry when the name has expiry. |
| `nonce` | 32 bytes. SHOULD be generated with at least 128 bits of entropy. |

If the current owner is a contract, clients MUST validate the signature with
ERC-1271:

```solidity
isValidSignature(bytes32 hash, bytes signature) returns (bytes4 magicValue)
```

The returned magic value MUST be `0x1626ba7e`.

### Category Methods

#### URL

The record is `text(node, "url")`. `valueHash` is
`keccak256(bytes(urlValue))`, where `urlValue` is the exact UTF-8 resolver
value.

This ENSIP defines two URL methods:

```text
url:https
url:dns
```

The target is the canonical HTTPS origin derived from the live URL. DNSSEC
validation is verifier evidence and MUST NOT be encoded as a separate signed
method.

#### Address

The record is `addr(node)` for coin type `60`, or `addr(node, coinType)` for
other ENSIP-9 coin types. `valueHash` is `keccak256` of the native binary
address bytes returned by the resolver.

This ENSIP defines initial method families:

```text
addr:evm
addr:attestation
```

`addr:evm` requires both a current owner signature and a target account
signature over the same claim. Contract accounts validate with ERC-1271.

`addr:attestation` requires a trusted issuer claim and returns
`verified/attestation`.

#### Social

The record is `text(node, serviceKey)`, where `serviceKey` is an ENSIP-5 service
key. `valueHash` is `keccak256(bytes(value))`, where `value` is the exact
resolver text value after service-defined canonicalization if the service
profile defines one.

This ENSIP defines initial method families:

```text
social:public
social:attestation
```

`social:public` requires a public target proof that any verifier can fetch.
`social:attestation` requires a trusted issuer claim.

#### Contenthash

The record is `contenthash(node)`. `valueHash` is `keccak256(contenthashBytes)`,
where `contenthashBytes` are the raw resolver bytes. Gateway URLs MUST NOT be
used as content identity.

This ENSIP defines initial method families:

```text
contenthash:manifest
contenthash:arweave
contenthash:dnslink
contenthash:attestation
```

The target is method-defined: publisher key, Arweave owner, DNS name, or issuer
subject.

#### Avatar NFT

The record is `text(node, "avatar")`. NFT avatar verification follows ENSIP-12
for CAIP-22 and CAIP-29 references.

This ENSIP defines:

```text
avatar:nft
```

`avatar:nft` is a deterministic live-state check. It verifies that the address
resolved by the ENS name owns the referenced ERC-721 token or has nonzero
ERC-1155 balance for the referenced token. It does not require an
`ENSRecordVerification` signature.

### Verification Algorithm

A verifier MUST:

1. Normalize `name`.
2. Compute `node = namehash(name)`.
3. Resolve the live record value.
4. Determine whether the record belongs to a verifiable category.
5. Determine the current owner and applicable name expiry.
6. Compute the method-defined `valueHash` and `target`.
7. Discover candidate proofs from deterministic locations, optional
   `verification[...]` records, onchain references, or caller-supplied
   references.
8. Verify target evidence, signatures, issuer policy, expiry, and revocation.
9. Return `verified` only if the selected method passes all requirements.
10. Otherwise return `none` with an optional error code.

### Cache Rules

Positive results MUST NOT be cached past the earliest of:

- proof expiry;
- name expiry;
- issuer attestation expiry or revocation;
- DNS TTL for DNS proofs;
- HTTP cache lifetime for HTTPS proofs;
- observed resolver change;
- observed record value change;
- observed owner change;
- observed Name Wrapper expiry or ownership change;
- observed ENSv2 token ID, regenerated token ID, version, or remint boundary
  change.

## Rationale

### One ENSIP, separate methods

The common model belongs in one ENSIP because SDKs need one result shape,
current owner rule, cache rule, and discovery convention. Method details remain
category-specific because URL origins, addresses, social accounts, content roots,
and NFT avatars have different target authorities.

### ENS-native terms

The spec uses familiar ENS terms: `name`, `node`, `namehash`, resolver, owner,
`text`, `addr`, and `contenthash`. The signed message is generic but does not
introduce new namespace identifiers or hidden adapter concepts.

### Minimal status

Clients either verified a record or did not. Errors explain why verification did
not succeed but are not statuses.

### Optional discovery

The `verification[...]` records help clients find proofs but are not required
for methods with deterministic target locations and are never sufficient by
themselves.

## Backwards Compatibility

This ENSIP is backwards compatible with existing ENS names and resolvers.

Clients that do not implement this ENSIP continue to read ENS records normally.
Clients that implement this ENSIP SHOULD still display underlying records when
verification fails, but MUST NOT display them as verified.

## Security Considerations

### Verification is not safety

Verification proves the specific relationship defined by the method. It does not
prove legal ownership, endorsement, absence of phishing, absence of malware, or
general safety.

### Transfers, expiry, and reminting

Clients MUST re-read the live resolver record and current owner before returning
a positive result. Proofs signed by a previous owner MUST fail. Proofs MUST also
fail after record value change, resolver replacement, owner change, name expiry,
or remint when those changes affect the current owner or name expiry.

For expiring names, requiring `proof.expiry <= name expiry` prevents proofs from
surviving expiration and later reminting, including same-address remints.

### Resolver writers

The ability to set records is not the same as ownership of the ENS name. A
resolver writer, manager, or ENSv2 record role MUST NOT be accepted as owner
unless a future ENSIP defines a concrete delegation format and the current owner
grants that delegation.

### Privacy

Fetching target proofs can reveal which ENS records a client is checking.
Privacy-sensitive clients MAY use a proxy, but MUST still enforce live ENS
ownership, target proof, expiry, and revocation checks.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
