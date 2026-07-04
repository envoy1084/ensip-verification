---
description: Verification of ENS url text records using current ENS ownership and HTTPS or DNS proofs.
contributors:
  - TBD
ensip:
  created: "2026-07-04"
  status: draft
track: Ecosystem
---

# ENSIP-X: URL Text Record Verification

## Abstract

This ENSIP defines a verification procedure for the ENSIP-5 `url` text record.

The `url` text record remains the canonical record for publishing a website URL
on an ENS name. This ENSIP adds:

- a signed `ENSURLVerification` message;
- HTTPS and DNS proof publication methods; and
- an optional `verification[url]` text record for proof discovery.

A client treats the `url` record as verified only if the live ENS record, the
current owner of the name, and the website or DNS proof all validate the same
URL origin.

## Motivation

ENS names commonly publish websites with `text(node, "url")`. Today, that
record is self-asserted: any name can point to any website. Clients have no
standard way to check whether the current ENS owner also controls the referenced
website origin.

This ENSIP provides a deterministic verification procedure that uses existing
ENS resolution, existing ENS ownership semantics, EIP-712 signatures, and
ordinary web or DNS publication. It does not require resolver changes or a
central verifier service.

Verification proves control at verification time. It does not prove website
safety, legal ownership, trademark ownership, content authenticity, or ENS
endorsement.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119 and RFC 8174.

### Definitions

`name`
: The normalized ENS name being verified.

`node`
: `namehash(name)`, as defined by ENSIP-1.

`url record`
: The exact UTF-8 string returned by resolving `text(node, "url")`.

`urlHash`
: `keccak256(bytes(url record))`.

`origin`
: The canonical HTTPS origin derived from the `url record`.

`method`
: The proof publication method. This ENSIP defines `https` and `dns`.

`current owner`
: The account that currently owns the ENS name, as defined in
  [Current Owner](#current-owner).

### Verification Result

This ENSIP defines only success and failure.

A successful verification returns:

```text
status = verified
verification = control
```

All other outcomes are failures. Implementations MAY expose error strings such
as `record_missing`, `proof_missing`, `signature_invalid`, or `expired`, but
those strings are not verification statuses.

### URL Resolution

To begin verification, a client MUST:

1. normalize `name`;
2. compute `node = namehash(name)`;
3. resolve the current resolver for `name`;
4. call `text(node, "url")`; and
5. use the returned value as the `url record`.

Clients MAY use the Universal Resolver instead of direct registry and resolver
calls. A missing resolver, resolver error, empty `url` value, or unsupported
resolver profile is a verification failure.

### URL and Origin Canonicalization

The `url record` MUST be parsed as an absolute URL. Verification fails if the
URL:

- does not use the `https` scheme;
- has no host;
- has a username or password;
- has an IP address host;
- has host `localhost`; or
- cannot be parsed by the client's URL parser.

The canonical `origin` is constructed as follows:

1. Set the scheme to lowercase `https`.
2. Convert the host to DNS A-label form using IDNA processing.
3. Lowercase the host.
4. Remove one trailing dot from the host, if present.
5. Omit the port if it is `443`.
6. Include the port if it is present and not `443`.
7. Exclude path, query, and fragment.

Examples:

| `url record` | `origin` |
| --- | --- |
| `https://Example.COM/` | `https://example.com` |
| `https://example.com:443/path?q=1#x` | `https://example.com` |
| `https://example.com:8443/path` | `https://example.com:8443` |
| `http://example.com/` | invalid |
| `https://user:pass@example.com/` | invalid |

### Current Owner

Clients MUST determine the current owner at verification time.

For ENSv1:

1. If `name` is an unwrapped `.eth` second-level name, the current owner is the
   ERC-721 owner returned by the canonical `.eth` Base Registrar for the
   labelhash. The proof `expiry` MUST be less than or equal to the registrar
   expiry for the label.
2. If `ENS.owner(node)` is the canonical Name Wrapper, the current owner is the
   wrapped owner returned by the Name Wrapper. The proof `expiry` MUST be less
   than or equal to the wrapped expiry.
3. Otherwise, the current owner is `ENS.owner(node)`. If the name has an
   applicable expiry known to the client, the proof `expiry` MUST be less than
   or equal to that expiry.

For ENSv2:

1. Clients SHOULD use the Universal Resolver, or an ENSv2-aware library, for
   resolution.
2. Clients that integrate ENSv2 directly MUST follow the current ENSv2
   registry and subregistry path for the name.
3. The current owner is the owner defined by the current ENSv2 registry state
   for that name.
4. A record-writer, resolver role, or manager role MUST NOT count as the current
   owner unless the ENSv2 contracts explicitly define it as ownership of the
   name.
5. If the ENSv2 registry exposes an expiry, the proof `expiry` MUST be less
   than or equal to that expiry.
6. If the ENSv2 registry exposes a token ID, regenerated token ID, version, or
   equivalent remint boundary, cached positive results MUST be invalidated when
   it changes.

A proof signed by a previous owner MUST fail. This ENSIP does not define
delegated verification. Future ENSIPs MAY define a concrete delegation format.

### EIP-712 Domain

Proofs MUST be signed using EIP-712 typed structured data.

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
name = "ENS URL Verification"
version = "1"
chainId = chain ID of the owner contract being checked
verifyingContract = owner contract being checked
```

`verifyingContract` is the contract used to determine the current owner. For
example, this can be the ENS registry, the `.eth` Base Registrar, the Name
Wrapper, or the ENSv2 registry or subregistry contract that defines ownership
for the name.

### Signed Message

The EIP-712 primary type is:

```solidity
struct ENSURLVerification {
    string name;
    bytes32 node;
    bytes32 urlHash;
    string origin;
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
| `urlHash` | `keccak256(bytes(url record))`, using the live `url` value. |
| `origin` | The canonical origin derived from the live `url` value. |
| `method` | Either `https` or `dns`. |
| `expiry` | Unix timestamp in seconds. MUST be in the future and MUST NOT exceed name expiry when the name has expiry. |
| `nonce` | 32 bytes. SHOULD be generated with at least 128 bits of entropy. |

The signature MUST be made by the current owner. If the current owner is a
contract, clients MUST validate the signature with ERC-1271:

```solidity
isValidSignature(bytes32 hash, bytes signature) returns (bytes4 magicValue)
```

The returned magic value MUST be `0x1626ba7e`.

### Proof Object

An HTTPS proof is a UTF-8 JSON object:

```json
{
  "v": "ENS-URL-1",
  "expiry": 1790812800,
  "nonce": "0x2222222222222222222222222222222222222222222222222222222222222222",
  "signature": "0x..."
}
```

Only `v`, `expiry`, `nonce`, and `signature` are required. Clients MUST
reconstruct the EIP-712 domain and message from live ENS state, the URL origin,
the proof method, and these proof fields.

Unknown JSON fields MUST be ignored. Duplicate JSON names make the proof
invalid.

### HTTPS Proof

For method `https`, the proof MUST be published at:

```text
<origin>/.well-known/ens-url-verification
```

For example:

```text
https://example.com/.well-known/ens-url-verification
```

Clients validating the HTTPS method MUST:

1. fetch the proof URL with HTTPS;
2. require normal WebPKI validation;
3. require HTTP status `200`;
4. reject a response body larger than 64 KiB;
5. parse the body as UTF-8 JSON; and
6. validate the reconstructed `ENSURLVerification` message.

The response body MAY be one proof object or an object with a `proofs` array.
If a `proofs` array is used, any one valid proof is sufficient.

Servers SHOULD use:

```text
application/ens-url-verification+json
```

Clients MUST NOT follow redirects to a different origin. Clients MAY follow
redirects within the same origin.

### DNS Proof

For method `dns`, the proof MUST be published at:

```text
_ens-url-verification.<host>. TXT
```

where `<host>` is the DNS host from the canonical `origin`.

The TXT value is:

```text
ENS-URL-1 <expiry> <nonce> <signature>
```

Example:

```text
_ens-url-verification.example.com. 3600 IN TXT "ENS-URL-1 1790812800 0x2222222222222222222222222222222222222222222222222222222222222222 0x..."
```

If the TXT RDATA contains multiple character strings, clients MUST concatenate
them in order before parsing. If multiple TXT records exist, any one valid TXT
record is sufficient.

The DNS method MUST NOT be accepted for origins with non-default HTTPS ports.
For non-default ports, clients MUST use the HTTPS method.

DNSSEC validation is verifier evidence, not a signed method. Implementations MAY
report whether the DNS answer was DNSSEC-validated, but the signed `method`
remains `dns`.

### Optional ENS Discovery Record

This ENSIP defines an optional ENSIP-5 text record:

```text
verification[url]
```

The value is a semicolon-separated ASCII string:

```text
v=ENS-URL-1;method=https;uri=https://example.com/.well-known/ens-url-verification
```

Fields:

| Field | Requirement |
| --- | --- |
| `v` | MUST be `ENS-URL-1`. |
| `method` | `https` or `dns`. |
| `uri` | Optional proof URI. If absent, clients use the default proof location. |

Parsing rules:

- field names are case-sensitive;
- duplicate fields make the discovery record invalid;
- unknown fields MUST be ignored;
- an invalid discovery record does not invalidate the `url` record.

The discovery record is a hint only. Clients MUST still verify the live ENS
record, current owner, signature, and target proof.

### Verification Algorithm

Given an ENS `name`, a client verifies the `url` record as follows:

1. Normalize `name`.
2. Compute `node = namehash(name)`.
3. Resolve the live `url record`.
4. Derive `origin`.
5. Compute `urlHash = keccak256(bytes(url record))`.
6. Determine the current owner and owner contract.
7. Obtain candidate HTTPS and DNS proofs from default locations, the optional
   `verification[url]` record, or caller-supplied proof references.
8. For each candidate proof:
   1. check `v = ENS-URL-1`;
   2. check `expiry` is in the future;
   3. check `expiry` does not exceed name expiry when applicable;
   4. reconstruct the EIP-712 domain;
   5. reconstruct `ENSURLVerification`;
   6. verify the signature against the current owner, using ERC-1271 when the
      owner is a contract; and
   7. confirm the proof was obtained from the target required by `method`.
9. If any candidate proof validates, return `verified/control`.
10. Otherwise return no verification.

### Test Vectors

These vectors use:

```text
name = alice.eth
url record = https://example.com/
origin = https://example.com
method = https
expiry = 1790812800
nonce = 0x2222222222222222222222222222222222222222222222222222222222222222
chainId = 1
verifyingContract = 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85
```

Expected values:

```text
node = 0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec
urlHash = 0x00238809d48a86b3a841a3f501d566475cde08f38cb75969645733a83e43306a
keccak256(bytes(origin)) = 0xedba3f8cfcd4165f73cd4641ced2b2ec0d3ba4338e3eec30edd58777d86b53b2
EIP-712 digest = 0x0b3179c27477c303c5db625a6bd5c33c87c9072d646d0079325704540b822a55
```

## Rationale

### URL-only scope

This ENSIP specifies only `text(node, "url")`. Address records, social records,
contenthash records, and avatar records have different target authorities and
need separate profiles. Keeping this ENSIP URL-specific makes the signed fields,
proof locations, and verification algorithm concrete.

### Familiar ENS fields

The signed message uses `name`, `node`, `urlHash`, `origin`, `method`, `expiry`,
and `nonce`. These fields map directly to ENS resolution and web-origin
verification. The EIP-712 domain carries `chainId` and `verifyingContract`,
which prevents replay across owner contracts and networks.

### Minimal proof payload

The proof payload does not repeat `name`, `node`, `urlHash`, `origin`, or
`method`. Clients recompute those fields from live ENS state and the proof
publication method. This avoids ambiguity between copied proof metadata and
current resolver state.

### Optional discovery

HTTPS and DNS have deterministic default locations. The `verification[url]`
record is only a discovery hint for clients that want one ENS text key under the
`verification[...]` namespace.

## Backwards Compatibility

This ENSIP is backwards compatible with existing ENS names and resolvers.

Clients that do not implement this ENSIP continue to read and display
`text(node, "url")` normally. Clients that implement this ENSIP SHOULD still
display the URL when verification fails, but MUST NOT display it as verified.

## Security Considerations

### Verification is not safety

A verified URL proves current control of an ENS name and a website origin or DNS
host. It does not prove that the website is safe, official, non-malicious, or
legally owned by the name owner.

### Transfers, expiry, and reminting

Clients MUST re-read the live resolver record and current owner before returning
a positive result. A proof signed by a previous owner MUST fail. A proof MUST
also fail after record value change, resolver replacement, owner change, name
expiry, or remint when those changes affect the current owner or name expiry.

For expiring names, requiring `proof.expiry <= name expiry` prevents a proof
from surviving name expiration and later reminting, including same-address
remints.

### Resolver writers

The ability to set records is not the same as ownership of the ENS name. A
resolver writer, manager, or ENSv2 record role MUST NOT be accepted as the
signer unless a future ENSIP defines a concrete delegation format and the
current owner grants that delegation.

### Shared hosting

The target is the full web origin, not a path. Users who only control
`https://example.com/alice` MUST NOT be able to verify `https://example.com`.
Platforms that want user-level verification should give users separate
subdomains.

### DNS

DNS TXT proves control of a DNS host, not control of an HTTP service on an
arbitrary port. DNS proofs are therefore invalid for non-default HTTPS ports.
DNS TXT without DNSSEC depends on the verifier's DNS resolution path.

### HTTPS compromise

An attacker who can write to the well-known proof location can publish proofs
for that origin. The attacker still needs a valid current-owner signature.
Short proof expiries reduce replay risk.

### Privacy

Fetching the HTTPS proof reveals that the client is checking an ENS name and
origin association. Privacy-sensitive clients MAY use a proxy, but MUST still
enforce live ENS ownership, target proof, and expiry checks.

### Well-known URI

The well-known path is `/.well-known/ens-url-verification`. If this ENSIP is
advanced, the name `ens-url-verification` SHOULD be registered according to RFC
8615.

## Appendix: Record Category Guidance

This appendix is non-normative.

Future ENSIPs SHOULD keep record verification profiles separate and concrete:

| Category | Record | Recommended verification |
| --- | --- | --- |
| URL | `text(node, "url")` | Current owner signature plus HTTPS or DNS proof, as specified here. |
| Address | `addr(node)` or `addr(node, coinType)` | Current owner signature plus target account signature over `coinType` and native address bytes. |
| Social | `text(node, serviceKey)` | Service-specific public proof or issuer attestation over the live service key value. |
| Contenthash | `contenthash(node)` | Publisher manifest, Arweave owner proof, DNSLink proof, or issuer attestation over raw contenthash bytes. |
| Avatar NFT | `text(node, "avatar")` | ENSIP-12 CAIP-22/CAIP-29 NFT ownership by the resolved address. |
| Profile metadata | `name`, `description`, display fields | No default verification. |

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
