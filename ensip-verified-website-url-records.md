---
description: Bidirectional verification for ENS url text records using ENS text records, EIP-712 signatures, and HTTPS or DNS proofs.
contributors:
  - TBD
ensip:
  created: "2026-07-04"
  status: draft
track: Ecosystem
---

# ENSIP-X: Verified Website URL Records

## Abstract

This ENSIP defines a verification mechanism for the ENS `url` text record.

The existing `url` text record remains the canonical place for an ENS name to publish a website URL. This ENSIP adds a parameterized text record, `url-verification[<originHash>]`, and defines a website-side proof that can be published over HTTPS or DNS. A client treats a URL as verified only when all of the following are true:

1. the ENS name currently resolves a `url` text record for the website origin being verified;
2. the ENS name currently resolves a matching `url-verification[<originHash>]` record;
3. the website origin or DNS host currently publishes a matching proof; and
4. the proof contains a valid EIP-712 signature from the current ENS verification authority for the name.

This ENSIP does not change the format or meaning of the existing `url` text record. It defines additional records and validation rules that clients MAY use to display a verified website indicator.

## Motivation

ENS text records are widely used as public profile metadata. The `url` record is commonly interpreted as the website associated with an ENS name. Today that association is self-asserted: any ENS name owner can set `url` to any website URL, and clients have no standard way to determine whether the ENS name owner also controls the referenced website.

A verified website mechanism should be deterministic, permissionless, and usable by wallets, explorers, profile clients, and indexers without relying on a centralized allowlist. It should also avoid treating stale records as proof after an ENS name transfer, DNS domain transfer, resolver migration, or hosting change.

This ENSIP provides a bidirectional verification model:

- the ENS side declares the website origin and an expected proof digest;
- the website or DNS side publishes the proof;
- the current ENS verification authority signs the proof; and
- clients verify the live state at resolution time.

The result proves control of the ENS name and control of the website origin or DNS host. It does not prove legal ownership, trademark ownership, safety, authenticity of content, or endorsement by ENS.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Definitions

**ENS name** means the normalized ENS name being verified.

**Node** means `namehash(name)` for the ENS name.

**URL record** means the value returned by resolving `text(node, "url")`.

**Canonical origin** means the normalized HTTPS origin derived from the URL record as defined in [URL and Origin Canonicalization](#url-and-origin-canonicalization).

**Origin hash** means `keccak256(bytes(canonicalOrigin))`, encoded as a lowercase `0x`-prefixed 32-byte hexadecimal string.

**Verification record** means the ENS text record at `url-verification[<originHash>]`.

**Verification authority** means the current address that is authorized by this ENSIP to sign website verification proofs for the node, as defined in [Verification Authority](#verification-authority).

**Proof digest** means the EIP-712 digest of the `WebsiteVerification` message defined in [EIP-712 Message](#eip-712-message).

### Text Record Key

This ENSIP defines the following parameterized ENS text record key:

```text
url-verification[<originHash>]
```

Where `<originHash>` is the lowercase `0x`-prefixed Keccak-256 hash of the canonical origin.

For example, the canonical origin:

```text
https://example.com
```

has the following origin hash:

```text
0xedba3f8cfcd4165f73cd4641ced2b2ec0d3ba4338e3eec30edd58777d86b53b2
```

The corresponding verification text record key is:

```text
url-verification[0xedba3f8cfcd4165f73cd4641ced2b2ec0d3ba4338e3eec30edd58777d86b53b2]
```

### Verification Record Value

The value of `url-verification[<originHash>]` MUST be an ASCII string with the following fields:

```text
v=ENSWEB1;digest=<proofDigest>;methods=<method-list>;exp=<unix-time>
```

Fields are separated by the semicolon character (`;`). Field names are case-sensitive. Field values MUST NOT contain semicolons. Duplicate fields MUST make the record invalid.

- `v` MUST be `ENSWEB1`.
- `digest` MUST be the lowercase `0x`-prefixed EIP-712 proof digest.
- `methods` MUST be a comma-separated list of supported proof publication methods. Valid values are `https` and `dns`.
- `exp` MUST be the proof expiration time as a base-10 Unix timestamp in seconds.

Clients MUST reject a verification record if any required field is missing, malformed, duplicated, or inconsistent with the website-side proof.

Example:

```text
url = https://example.com/
url-verification[0xedba3f8cfcd4165f73cd4641ced2b2ec0d3ba4338e3eec30edd58777d86b53b2] = v=ENSWEB1;digest=0x5d4c0b4d5b6a7b8c9d0e1f2031425364758697a8b9cadbecfd00112233445566;methods=https,dns;exp=1790812800
```

### URL and Origin Canonicalization

Clients MUST derive the canonical origin from the current `url` text record before attempting verification.

The URL record MUST be parsed as an absolute URL. Verification MUST fail if the URL:

- is not an HTTPS URL;
- does not contain a host;
- contains a username or password component;
- contains an IP literal, `localhost`, or an empty host; or
- cannot be parsed by the client's URL parser.

The canonical origin is constructed as follows:

1. Set the scheme to lowercase `https`.
2. Convert the host to its DNS A-label form using IDNA processing.
3. Lowercase the host.
4. Remove a single trailing dot from the host, if present.
5. Omit the port if it is the default HTTPS port `443`.
6. Include the port if it is present and not `443`.
7. Do not include path, query, or fragment components.

Examples:

| URL record | Canonical origin |
| --- | --- |
| `https://Example.COM/` | `https://example.com` |
| `https://example.com:443/path?q=1#x` | `https://example.com` |
| `https://example.com:8443/path` | `https://example.com:8443` |
| `http://example.com/` | invalid |
| `https://user:pass@example.com/` | invalid |

Test vectors:

| Canonical origin | Origin hash |
| --- | --- |
| `https://example.com` | `0xedba3f8cfcd4165f73cd4641ced2b2ec0d3ba4338e3eec30edd58777d86b53b2` |
| `https://example.com:8443` | `0xaa3fdb3169e8d8eb7a8f42a70b7d1f917197f074a0d21f74126a2bf639d90ef5` |
| `https://xn--bcher-kva.example` | `0xa31fbb501a3ed5992dd411cc17b346e233f3e24a4b702afe6a080867e553ea04` |

### Website Verification Proof

The website-side proof is a JSON object with the following required fields:

```json
{
  "type": "ENSWebsiteVerification",
  "version": 1,
  "chainId": 1,
  "registry": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
  "name": "alice.eth",
  "node": "0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec",
  "origin": "https://example.com",
  "signer": "0x1111111111111111111111111111111111111111",
  "issuedAt": 1783123200,
  "expiresAt": 1790812800,
  "nonce": "0x2222222222222222222222222222222222222222222222222222222222222222",
  "signature": "0x..."
}
```

Field requirements:

| Field | Requirement |
| --- | --- |
| `type` | MUST equal `ENSWebsiteVerification`. |
| `version` | MUST equal integer `1`. |
| `chainId` | MUST be the EIP-155 chain ID for the ENS registry used to resolve the name. |
| `registry` | MUST be the `0x`-prefixed address of the ENS registry used to resolve the name. |
| `name` | MUST be the normalized ENS name. |
| `node` | MUST equal `namehash(name)`. |
| `origin` | MUST equal the canonical origin derived from the current `url` record. |
| `signer` | MUST equal the current verification authority. |
| `issuedAt` | MUST be a Unix timestamp in seconds. |
| `expiresAt` | MUST be a Unix timestamp in seconds greater than `issuedAt`. |
| `nonce` | MUST be a `0x`-prefixed 32-byte value generated with at least 128 bits of entropy. |
| `signature` | MUST be a signature over the EIP-712 digest defined by this ENSIP. |

Clients MUST ignore unknown JSON fields. Clients MUST reject a proof if any required field is absent, malformed, or inconsistent with the current ENS records.

The maximum validity period is 90 days. Clients MUST reject a proof if:

```text
expiresAt - issuedAt > 7776000
```

Clients SHOULD reject a proof if `issuedAt` is more than 300 seconds in the future relative to the client's clock.

### EIP-712 Message

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

with values:

```text
name = "ENS Website Verification"
version = "1"
chainId = proof.chainId
verifyingContract = proof.registry
```

The primary type is:

```solidity
WebsiteVerification(
  string name,
  bytes32 node,
  string origin,
  address signer,
  uint64 issuedAt,
  uint64 expiresAt,
  bytes32 nonce
)
```

The message values are taken from the proof object.

The proof digest is:

```text
keccak256("\x19\x01" || domainSeparator || hashStruct(WebsiteVerification))
```

Clients MUST compute this digest independently. The computed digest MUST equal the `digest` field in the ENS verification record.

For externally owned accounts, the recovered address from `signature` over the proof digest MUST equal `signer`.

For contract accounts, clients MUST validate the signature using ERC-1271 by calling:

```solidity
isValidSignature(bytes32 hash, bytes signature) returns (bytes4 magicValue)
```

on `signer`. The proof is valid only if the returned magic value is `0x1626ba7e`.

### Verification Authority

Clients MUST determine the current verification authority at validation time.

For an unwrapped name, the verification authority is the address returned by:

```solidity
ENSRegistry.owner(bytes32 node)
```

for the registry identified by `proof.registry` on `proof.chainId`.

For a wrapped name, if `ENSRegistry.owner(node)` is the canonical ENS Name Wrapper contract for that ENS deployment, the verification authority is the wrapped owner returned by the Name Wrapper's `ownerOf(uint256(node))` function.

Clients that claim support for wrapped ENS names on a chain MUST support the canonical Name Wrapper for that chain. Clients that do not support wrapped-owner discovery MUST fail verification when `ENSRegistry.owner(node)` is a recognized Name Wrapper contract.

The `signer` field in the proof MUST equal the current verification authority. A proof signed by a previous owner MUST fail after the ENS name is transferred.

### HTTPS Proof Publication

For the `https` method, the proof MUST be published at:

```text
<canonical-origin>/.well-known/ens-web-verification
```

For example:

```text
https://example.com/.well-known/ens-web-verification
```

Clients validating the `https` method MUST:

1. issue an HTTPS `GET` request to the proof URL;
2. require a valid TLS connection according to the client's normal WebPKI validation rules;
3. require HTTP status `200`;
4. parse the response body as UTF-8 JSON;
5. reject response bodies larger than 64 KiB; and
6. validate the proof object as defined in this ENSIP.

Servers SHOULD return one of the following content types:

```text
application/ens-web-verification+json
application/json
```

Clients MUST NOT follow redirects to a different origin. Clients MAY follow redirects within the same origin.

### DNS Proof Publication

For the `dns` method, the proof MUST be published as a DNS TXT record at:

```text
_ens-web-verification.<host>.
```

Where `<host>` is the canonical origin host in DNS A-label form.

The TXT record value MUST be:

```text
ENSWEB1 <base64url-json-proof>
```

Where `<base64url-json-proof>` is the unpadded base64url encoding of the UTF-8 JSON proof object.

If the TXT RDATA contains multiple character-strings, clients MUST concatenate them in order before parsing. If multiple TXT records exist at the validation name, clients MUST treat the DNS method as valid if at least one record contains a valid proof.

Example:

```text
_ens-web-verification.example.com. 3600 IN TXT "ENSWEB1 eyJ0eXBlIjoiRU5TV2Vic2l0ZVZlcmlmaWNhdGlvbiIsInZlcnNpb24iOjF9"
```

The `dns` method proves control of the DNS host, not control of a specific HTTP server process. Therefore, clients MUST NOT accept the `dns` method for origins that include a non-default port. For non-default ports, the `https` method MUST be used.

If the DNS answer is DNSSEC-validated by the client or by a resolver the client explicitly trusts for DNSSEC validation, clients MAY expose a stronger `dnssec` verification method in UI or APIs.

### Verification Flow

A client verifying the website for an ENS name MUST perform the following steps:

1. Normalize the ENS name and compute `node = namehash(name)`.
2. Resolve `text(node, "url")` using normal ENS resolution.
3. Parse the URL record and derive the canonical origin.
4. Compute `originHash = keccak256(bytes(canonicalOrigin))`.
5. Construct the verification key `url-verification[<originHash>]`.
6. Resolve the verification record.
7. Parse the verification record and extract `digest`, `methods`, and `exp`.
8. Reject if `exp` is in the past.
9. Fetch candidate proofs using the methods listed in the verification record.
10. For each candidate proof:
    1. check that `type` and `version` are supported;
    2. check that `name`, `node`, `origin`, `chainId`, and `registry` match the current verification context;
    3. check that `expiresAt` equals `exp` from the ENS verification record;
    4. check that the proof has not expired and does not exceed the maximum validity period;
    5. compute the EIP-712 proof digest;
    6. check that the computed digest equals the `digest` field in the ENS verification record;
    7. determine the current verification authority;
    8. check that `proof.signer` equals the current verification authority; and
    9. validate the signature using ECDSA recovery or ERC-1271.
11. If at least one candidate proof validates, the website is verified for the ENS name and canonical origin.
12. Otherwise, verification fails.

A failed verification MUST NOT cause clients to ignore or hide the underlying `url` record. Clients SHOULD display the URL as unverified.

### Verification Result Semantics

Implementations SHOULD distinguish between the following states:

| State | Meaning |
| --- | --- |
| `unverified` | The `url` record exists, but no valid proof was found. |
| `verified-https` | A valid proof was fetched from the HTTPS well-known location. |
| `verified-dns` | A valid proof was fetched from DNS TXT. |
| `verified-dnssec` | A valid DNS TXT proof was fetched and DNSSEC-validated. |

Clients MUST NOT present any verified state as a statement about site safety, legal ownership, trademark ownership, or absence of phishing.

### Reference Pseudocode

```typescript
type VerificationResult =
  | { status: "unverified" }
  | { status: "verified-https" | "verified-dns" | "verified-dnssec"; origin: string; expiresAt: number };

async function verifyEnsWebsite(name: string): Promise<VerificationResult> {
  const normalizedName = normalizeEnsName(name);
  const node = namehash(normalizedName);

  const url = await ensText(node, "url");
  if (!url) return { status: "unverified" };

  const origin = canonicalizeHttpsOrigin(url);
  if (!origin) return { status: "unverified" };

  const originHash = keccak256Utf8(origin);
  const key = `url-verification[${originHash}]`;
  const record = parseVerificationRecord(await ensText(node, key));
  if (!record || record.exp <= now()) return { status: "unverified" };

  for (const method of record.methods) {
    const proof = await fetchProof(method, origin);
    if (!proof) continue;

    const digest = eip712Digest(proof);
    if (digest !== record.digest) continue;
    if (proof.expiresAt !== record.exp) continue;
    if (proof.origin !== origin) continue;
    if (proof.node !== node) continue;
    if (namehash(proof.name) !== node) continue;
    if (proof.expiresAt <= now()) continue;
    if (proof.expiresAt - proof.issuedAt > 7776000) continue;

    const authority = await currentVerificationAuthority(proof.chainId, proof.registry, node);
    if (lower(proof.signer) !== lower(authority)) continue;
    if (!(await validSignature(authority, digest, proof.signature))) continue;

    return { status: method === "dnssec" ? "verified-dnssec" : `verified-${method}`, origin, expiresAt: proof.expiresAt } as VerificationResult;
  }

  return { status: "unverified" };
}
```

## Rationale

### Preserve the existing `url` record

The `url` text record is already deployed and understood by clients. Replacing it would break existing profiles and applications. This ENSIP treats `url` as the claim and adds `url-verification[<originHash>]` as a verification sidecar.

### Use a parameterized text record

A parameterized key avoids a single global verification slot and makes the verification record deterministic for a given origin. It also allows an ENS name to rotate from one website origin to another without ambiguity.

### Include a digest in ENS

The ENS-side digest binds the name to a specific signed proof. This avoids speculative verification based only on content hosted by a website and gives clients a cheap way to determine whether the ENS owner opted into this verification scheme.

### Require a current-owner signature

A text record can remain in a resolver after a name transfer. A website proof can also remain deployed after a DNS or hosting change. Requiring a signature from the current verification authority prevents old proofs from continuing to verify after the ENS name changes hands.

### Verify the origin, not a path

Web security boundaries are origin-based. A proof for `https://example.com` MUST NOT imply control of `https://sub.example.com`, `https://example.com:8443`, or a path on a shared origin such as `https://example.com/users/alice`. The proof path is intentionally rooted at `/.well-known/` for the exact origin.

### Support HTTPS and DNS

HTTPS well-known proofs are easy to deploy on static sites and prove control of the web origin. DNS TXT proofs are useful when the website stack cannot serve a well-known file or when domain-level control is the desired signal. DNSSEC validation can provide a stronger DNS result where available.

### No resolver changes required

This ENSIP uses ENSIP-5 text records and offchain website/DNS proofs. It does not require a new resolver interface or changes to the ENS registry. Resolvers and indexers MAY add native support later, but clients can implement verification immediately.

## Backwards Compatibility

This ENSIP is backwards compatible with existing ENS names and clients.

Clients that do not implement this ENSIP will continue to read and display the `url` text record as before. Clients that implement this ENSIP SHOULD continue to display the `url` record even when verification fails, but MUST NOT display a verified website indicator unless the verification flow succeeds.

Existing resolvers do not need to be upgraded as long as they support ENS text records.

## Security Considerations

### Meaning of verification

A verified result means that the current ENS verification authority signed a proof and that the corresponding website origin or DNS host currently publishes that proof. It does not mean the website is safe, non-malicious, legally owned by the ENS name owner, or endorsed by ENS.

### ENS name transfers

Verification records can remain after a name transfer. Clients MUST check the current verification authority at validation time and MUST reject proofs signed by a previous owner.

### Wrapped names

For wrapped names, the ENS registry owner is the Name Wrapper contract rather than the effective wrapped owner. Clients that support wrapped names MUST resolve the wrapped owner through the canonical Name Wrapper. Otherwise, they risk accepting an unverifiable signer or rejecting valid wrapped-name proofs.

### DNS and domain transfers

DNS TXT records can remain after a domain transfer, or can be copied into a new zone. This ENSIP limits proof validity to 90 days and requires live proof checks, but clients should still treat DNS verification as proof of control at validation time, not permanent ownership.

### DNSSEC

DNS TXT proofs that are not DNSSEC-validated rely on the client's DNS resolution path. Clients SHOULD expose DNSSEC-validated proofs distinctly from ordinary DNS proofs when they can validate DNSSEC.

### HTTPS compromise

An attacker who can write to `/.well-known/ens-web-verification` on an origin can publish or replace website proofs for that origin. The attacker still needs a valid signature from the current ENS verification authority, but previously signed unexpired proofs may be replayed on the same origin. Short proof validity reduces replay impact.

### Shared hosting and path-based websites

This ENSIP intentionally does not verify path-scoped websites. A user with write access only to `https://example.com/alice` must not be able to verify the origin `https://example.com`. Platforms that host user pages under a shared origin should use user-specific subdomains if they want users to verify ENS website ownership.

### Non-default ports

DNS control of a host does not prove control of services on arbitrary ports. DNS proofs MUST NOT verify origins with non-default ports. HTTPS proofs can verify non-default ports because the proof is fetched from the exact origin.

### URL spoofing

Clients MUST reject URLs with username or password components. Clients SHOULD render the verified origin clearly and SHOULD avoid displaying a verified badge next to a URL whose visible text can mislead users about the host.

### Name normalization and homographs

Clients MUST normalize ENS names before computing namehash. A verified website proof does not remove the usual risks of visually confusable Unicode names or lookalike DNS names.

### Caching

Clients and indexers MAY cache verification results, but MUST NOT cache a positive result past the earliest of:

- the proof `expiresAt` time;
- the ENS verification record `exp` time;
- the DNS TTL, for DNS proofs; or
- the HTTP cache lifetime, for HTTPS proofs.

Clients SHOULD revalidate before showing a high-trust UI indicator.

### Privacy

Fetching the HTTPS proof leaks that a client is checking a given ENS-name-to-origin association to the website operator. Clients concerned with lookup privacy MAY verify through a privacy-preserving proxy or rely on an indexer, but any cached or indexed result MUST still respect proof expiration.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
