---
description: Verification records for ENS text, addr, and contenthash resolver records.
contributors:
  - TBD
ensip:
  created: "2026-07-04"
  status: draft
track: Ecosystem
---

# ENSIP-X: ENS Record Verification

## Abstract

This ENSIP defines verification records for the three ENS resolver record
classes:

- `text(node, key)`;
- `addr(node)` and `addr(node, coinType)`; and
- `contenthash(node)`.

It standardizes:

- a minimal verification result;
- the `verification[...]` ENSIP-5 discovery record namespace;
- current owner, expiry, transfer, and remint rules;
- common EIP-712 signing fields; and
- initial verification methods for text, addr, and contenthash records.

This ENSIP does not require resolver changes. Verification clients read live ENS
records through existing ENS resolution, the Universal Resolver, or
version-specific ENS registry and resolver contracts.

## Motivation

ENS records often point outside ENS: websites, addresses, social accounts,
content roots, and NFTs. A resolver value alone says that the current resolver
returns a value. It does not always prove that the current ENS owner also
controls the external target.

The verification layout should follow ENS's resolver model. ENSIP-5 text
records are intentionally open-ended, so this ENSIP must not create permanent
top-level verification groups such as URL or social. Future text keys should not
require a new ENSIP-level grouping. Instead, every text key uses the same
verification key shape, and the verification record value declares which proof
method is being used.

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
: A resolver record identifier: `text:<key>`, `addr:<coinType>`, or
  `contenthash`.

`value`
: The exact value returned by the current resolver for `record`.

`valueHash`
: `keccak256` of method-defined canonical bytes for `value`.

`target`
: The method-defined external target being verified.

`method`
: A string identifying how to verify the record. The method is the extension
  point for future standards.

`current owner`
: The account that currently owns the ENS name, as defined in
  [Current Owner](#current-owner).

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
| `unsupported_record` | This ENSIP does not define verification for the record class. |
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

### Verification Records

Verification discovery records are ENSIP-5 text records.

This ENSIP defines three key forms:

```text
verification[text][<key>]
verification[addr][<coinType>]
verification[contenthash]
```

Where:

- `<key>` is the ENSIP-5 text record key, such as `url`, `avatar`,
  `com.github`, or a future service key;
- `<coinType>` is the decimal ENSIP-9 coin type.

Parameters MUST NOT contain `[` or `]`.

An absent or empty verification record means no proof is advertised for that
record. A verification record MAY explicitly advertise no proof:

```text
v=ENS-VERIFY-1;method=none
```

`method=none` is a statement that no verification method is being advertised. It
MUST NOT be returned as `verified`.

### Verification Record Value

The verification record value is a semicolon-separated ASCII string:

```text
v=ENS-VERIFY-1;method=<method>;kind=<control-or-attestation>;uri=<proof-uri>;expiry=<unix-time>
```

Fields:

| Field | Requirement |
| --- | --- |
| `v` | MUST be `ENS-VERIFY-1`. |
| `method` | REQUIRED. Verification method or `none`. |
| `kind` | OPTIONAL. `control` or `attestation`. If absent, the method profile defines the kind. |
| `uri` | OPTIONAL. Proof reference. Method-defined. |
| `expiry` | OPTIONAL. Unix timestamp in seconds. If present, clients MUST NOT return a positive result after this time. |

Parsing rules:

- field names are case-sensitive;
- fields are separated by semicolons;
- duplicate fields make the verification record invalid;
- unknown fields MUST be ignored;
- an invalid verification record does not invalidate the underlying ENS record.

The verification record is a hint. Clients MUST still verify the live ENS
record, current owner, target proof, expiry, and signatures. A verification
record by itself is never a positive verification.

### Record Classes

#### Text

The record is:

```text
text(node, key)
```

The verification record is:

```text
text(node, "verification[text][<key>]")
```

The signed `record` field is:

```text
text:<key>
```

`valueHash` is `keccak256(bytes(textValue))` unless the method profile defines a
more specific canonicalization.

Initial text methods:

| Method | Intended use | Verification |
| --- | --- | --- |
| `none` | No advertised proof. | Always returns `none`. |
| `https-origin` | Text value is or contains an HTTPS URL. | Current owner signature plus HTTPS well-known proof. |
| `dns-host` | Text value is or contains a DNS host. | Current owner signature plus DNS TXT proof. |
| `public-account` | Service account text keys. | Current owner signature plus public account proof. |
| `issuer-attestation` | Private-provider or issuer-backed text claims. | Trusted issuer attestation. |
| `caip-nft` | `avatar` CAIP NFT references. | Live NFT ownership by the resolved address. |

Method profiles define how to parse the text value and derive `target`.

#### Addr

The record is:

```text
addr(node)
addr(node, coinType)
```

The verification record is:

```text
text(node, "verification[addr][<coinType>]")
```

The signed `record` field is:

```text
addr:<coinType>
```

For `addr(node)`, `coinType` is `60`. `valueHash` is `keccak256` of the native
binary address bytes returned by the resolver.

Initial addr methods:

| Method | Verification |
| --- | --- |
| `none` | No advertised proof. |
| `account-signature` | Current owner signature plus target account signature. |
| `issuer-attestation` | Trusted issuer attestation. |

#### Contenthash

The record is:

```text
contenthash(node)
```

The verification record is:

```text
text(node, "verification[contenthash]")
```

The signed `record` field is:

```text
contenthash
```

`valueHash` is `keccak256(contenthashBytes)`, where `contenthashBytes` are the
raw resolver bytes. Gateway URLs MUST NOT be used as content identity.

Initial contenthash methods:

| Method | Verification |
| --- | --- |
| `none` | No advertised proof. |
| `publisher-manifest` | Current owner signature plus publisher manifest signature. |
| `arweave-owner` | Current owner signature plus Arweave transaction or data-item owner proof. |
| `dnslink` | Current owner signature plus DNSLink proof. |
| `issuer-attestation` | Trusted issuer attestation. |

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
| `record` | `text:<key>`, `addr:<coinType>`, or `contenthash`. |
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

### Verification Algorithm

A verifier MUST:

1. Normalize `name`.
2. Compute `node = namehash(name)`.
3. Resolve the live record value.
4. Resolve the matching verification record.
5. If the verification record is absent, empty, or `method=none`, return `none`.
6. Determine the current owner and applicable name expiry.
7. Compute the method-defined `valueHash` and `target`.
8. Discover candidate proofs from the verification record, deterministic target
   locations, onchain references, or caller-supplied references.
9. Verify target evidence, signatures, issuer policy, expiry, and revocation.
10. Return `verified` only if the selected method passes all requirements.
11. Otherwise return `none` with an optional error code.

### Cache Rules

Positive results MUST NOT be cached past the earliest of:

- proof expiry;
- verification record `expiry`;
- name expiry;
- issuer attestation expiry or revocation;
- DNS TTL for DNS proofs;
- HTTP cache lifetime for HTTPS proofs;
- observed resolver change;
- observed record value change;
- observed verification record change;
- observed owner change;
- observed Name Wrapper expiry or ownership change;
- observed ENSv2 token ID, regenerated token ID, version, or remint boundary
  change.

## Rationale

### Resolver-class layout

The verification keys mirror ENS resolver record classes. This avoids permanent
top-level groups such as URL or social and allows future ENSIP-5 text keys to
reuse `verification[text][<key>]` without changing this ENSIP.

### Method as extension point

The verification record value declares `method`. That is where method-specific
semantics belong. This is similar to long-lived protocol registries where a
stable envelope carries a type, algorithm, or method value whose definition can
evolve independently.

### ENS-native terms

The spec uses familiar ENS terms: `name`, `node`, `namehash`, resolver, owner,
`text`, `addr`, and `contenthash`. It does not introduce hidden namespace IDs or
adapter concepts.

### Minimal status

Clients either verified a record or did not. Errors explain why verification did
not succeed but are not statuses.

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

Clients MUST re-read the live resolver record, verification record, and current
owner before returning a positive result. Proofs signed by a previous owner MUST
fail. Proofs MUST also fail after record value change, verification record
change, resolver replacement, owner change, name expiry, or remint when those
changes affect the current owner or name expiry.

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
