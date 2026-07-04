---
description: Control verification for ENS url text records using EIP-712 claims and HTTPS or DNS target proofs.
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

The existing `url` text record remains the canonical place for an ENS name to
publish a website URL. This ENSIP defines a compact signed claim and target
proofs that can be published by the corresponding HTTPS origin or DNS host. A
client treats a URL as verified only when all of the following are true:

1. the ENS name currently resolves a valid `url` text record;
2. the proof target is the canonical HTTPS origin derived from that live record;
3. the HTTPS origin or DNS host currently publishes a matching proof; and
4. the proof is signed by the current ENS verification authority, or by a
   current verification delegate.

An ENS sidecar MAY be used for proof discovery, but the sidecar is not the proof.
Clients and SDKs MUST recompute verification from live ENS state.

## Motivation

ENS text records are widely used as public profile metadata. The `url` record is
commonly interpreted as the website associated with an ENS name. Today that
association is self-asserted: any ENS name owner can set `url` to any website
URL, and clients have no standard way to determine whether the ENS name owner
also controls the referenced website.

This ENSIP provides a minimal control-verification model:

- the live ENS record defines the URL value;
- the URL value defines the web origin or DNS host;
- the web origin or DNS host publishes the proof; and
- the current ENS verification authority signs the same claim.

The result proves current control of the ENS name and current control of the
website origin or DNS host. It does not prove legal ownership, trademark
ownership, safety, authenticity of content, or endorsement by ENS.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119 and RFC 8174.

### Definitions

**ENS name** means the normalized ENS name being verified.

**URL record** means the value returned by resolving `text("url")` for the ENS
name.

**Canonical origin** means the normalized HTTPS origin derived from the URL
record.

**Record reference** means:

```text
recordRef = keccak256(bytes("text:url"))
```

**Value hash** means:

```text
valueHash = keccak256(bytes(urlRecord))
```

where `urlRecord` is the exact UTF-8 string returned by the resolver.

**Target reference** means:

```text
targetRef = keccak256(bytes(canonicalOrigin))
```

**Method** means one of:

| Method | Meaning |
| --- | --- |
| `url-https@1` | HTTPS well-known proof from the exact origin. |
| `url-dns-txt@1` | DNS TXT proof for the canonical host. |
| `url-dnssec@1` | DNS TXT proof with DNSSEC validation. |

All successful methods return the same verification status:

```text
status = verified
verification = control
```

DNSSEC is method evidence, not a separate status.

### URL and Origin Canonicalization

Clients MUST derive the canonical origin from the current `url` text record
before attempting verification.

The URL record MUST be parsed as an absolute URL. Verification MUST return
`status: "none"` if the URL:

- is not an HTTPS URL;
- does not contain a DNS host;
- contains a username or password component;
- contains an IP literal, `localhost`, or an empty host; or
- cannot be parsed by the client's URL parser.

The canonical origin is constructed as follows:

1. Set the scheme to lowercase `https`.
2. Convert the host to DNS A-label form using IDNA processing.
3. Lowercase the host.
4. Remove one trailing dot from the host, if present.
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

### Claim

The proof signature MUST cover this claim:

```solidity
struct ENSRecordClaim {
    bytes32 contextId;
    bytes32 nameId;
    bytes32 recordRef;
    bytes32 valueHash;
    bytes32 targetRef;
    bytes32 methodId;
    uint64 expiresAt;
    bytes32 nonce;
}
```

Where:

- `contextId` identifies the ENS resolution namespace.
- `nameId` identifies the name in that namespace.
- `recordRef = keccak256(bytes("text:url"))`.
- `valueHash = keccak256(bytes(urlRecord))`.
- `targetRef = keccak256(bytes(canonicalOrigin))`.
- `methodId = keccak256(bytes(method))`.
- `expiresAt` is the latest time the proof can verify.
- `nonce` is a 32-byte value generated with at least 128 bits of entropy.

The proof MUST NOT require clients to trust signed `name`, `origin`,
`chainId`, `registry`, `node`, `proofUrl`, `issuedAt`, or sidecar fields.
Clients MUST recompute the claim from live ENS state and the selected method.

The maximum validity period is 90 days. The claim expires when `expiresAt` is in
the past.

### ENSv1 and ENSv2 Context

For ENSv1:

- `nameId` MUST be the ENSIP-1 namehash of the normalized ENS name.
- `contextId` MUST bind at least the L1 chain ID and ENS registry address.
- clients MUST account for the Name Wrapper when the registry owner is the
  wrapper;
- clients MUST treat expired `.eth` names or expired wrapped names as
  unavailable for positive verification.

For ENSv2:

- clients SHOULD resolve records through the Universal Resolver or a library
  that uses it;
- an authority adapter MUST return `contextId`, `nameId`, and current
  verification authority for the name;
- if the v2 registry exposes a generation, registration nonce, or equivalent
  remint boundary, it MUST be included in `nameId` or the adapter state used to
  validate caches.

A resolver writer, manager, or record role alone is not a verification authority
unless the current owner explicitly grants a verification delegation. A proof
signed by a previous owner MUST fail after transfer, expiry, or remint.

### EIP-712 Signature

EVM signatures SHOULD use EIP-712.

The EIP-712 domain is:

```solidity
EIP712Domain(
  string name,
  string version,
  uint256 chainId,
  bytes32 salt
)
```

with values:

```text
name = "ENS Record Verification"
version = "1"
chainId = authorityAdapter.signingChainId
salt = contextId
```

The primary type is `ENSRecordClaim`. The `method` string in JSON proof
envelopes is not signed directly; verifiers compute `methodId` from it.

For externally owned accounts, the recovered address from `signature` over the
claim digest MUST equal the current verification authority or delegate.

For contract accounts, clients MUST validate the signature using ERC-1271:

```solidity
isValidSignature(bytes32 hash, bytes signature) returns (bytes4 magicValue)
```

The proof is valid only if the returned magic value is `0x1626ba7e`.

### Proof Payload

The target proof is a UTF-8 JSON object:

```json
{
  "v": "ENSVERIFY1",
  "claim": {
    "contextId": "0x...",
    "nameId": "0x...",
    "recordRef": "0x...",
    "valueHash": "0x...",
    "targetRef": "0x...",
    "method": "url-https@1",
    "expiresAt": 1790812800,
    "nonce": "0x..."
  },
  "signature": "0x..."
}
```

Unknown JSON fields MUST be ignored. They are helpers only. A client MUST reject
a proof if any required claim field is absent, malformed, expired, or different
from the claim recomputed from live ENS state.

### HTTPS Proof Publication

For `url-https@1`, the proof MUST be published at:

```text
<canonical-origin>/.well-known/ens-url-verification
```

For example:

```text
https://example.com/.well-known/ens-url-verification
```

Clients validating the HTTPS method MUST:

1. issue an HTTPS `GET` request to the proof URL;
2. require a valid TLS connection according to normal WebPKI validation rules;
3. require HTTP status `200`;
4. parse the response body as UTF-8 JSON;
5. reject response bodies larger than 64 KiB; and
6. validate the proof object as defined in this ENSIP.

Servers SHOULD return one of:

```text
application/ens-url-verification+json
application/json
```

Clients MUST NOT follow redirects to a different origin. Clients MAY follow
redirects within the same origin. The JSON body MAY be a single proof or an
object containing a `proofs` array.

### DNS Proof Publication

For `url-dns-txt@1`, the proof MUST be published as a DNS TXT record at:

```text
_ens-url-verification.<host>.
```

Where `<host>` is the canonical origin host in DNS A-label form.

The TXT record value MUST be:

```text
ENSVERIFY1 <base64url-json-proof>
```

Where `<base64url-json-proof>` is the unpadded base64url encoding of the UTF-8
JSON proof object.

If the TXT RDATA contains multiple character-strings, clients MUST concatenate
them in order before parsing. If multiple TXT records exist at the validation
name, any one valid proof is sufficient.

The DNS method proves control of the DNS host, not control of a specific HTTP
server process. Clients MUST NOT accept the DNS method for origins with
non-default ports. For non-default ports, the HTTPS method MUST be used.

If the DNS answer is DNSSEC-validated by the client or by a resolver the client
explicitly trusts for DNSSEC validation, clients MAY report method
`url-dnssec@1`.

### Optional ENS Sidecar

This ENSIP defines an optional proof-discovery sidecar:

```text
verification[<recordRef>][<valueHash>]
```

Where `<recordRef>` and `<valueHash>` are lowercase `0x`-prefixed hex strings.

Recommended value:

```text
v=ENSVERIFY1;method=<method>;claim=<claimHash>;exp=<unix-time>;uri=<proof-ref>
```

The sidecar is a hint. A missing sidecar MUST NOT prevent verification if a
deterministic HTTPS or DNS target proof validates. A malformed sidecar MUST NOT
make the underlying `url` record invalid.

### Verification Flow

A client verifying the website for an ENS name MUST:

1. Normalize the ENS name.
2. Resolve the live `url` text record.
3. Parse the URL and derive the canonical origin.
4. Compute `recordRef`, `valueHash`, and `targetRef`.
5. Read current authority state through the ENSv1 or ENSv2 authority adapter.
6. Fetch candidate proofs from HTTPS, DNS, optional sidecar references, or
   caller-supplied proof references.
7. For each proof:
   1. check `v`;
   2. check the method is supported;
   3. recompute `methodId`;
   4. check every claim field against live state;
   5. check `expiresAt`;
   6. verify the current authority signature or delegate signature; and
   7. confirm the proof came from the target origin or DNS host for the method.
8. Return `verified/control` for the first valid proof.
9. Otherwise return `status: "none"` with an error reason.

A failed verification MUST NOT cause clients to ignore or hide the underlying
`url` record.

### Verification Result

Implementations SHOULD expose the minimal result model:

```typescript
type UrlVerificationResult =
  | {
      status: "none";
      origin?: string;
      error?: { code: string };
    }
  | {
      status: "verified";
      verification: "control";
      method: "url-https@1" | "url-dns-txt@1" | "url-dnssec@1";
      origin: string;
      expiresAt: number;
    };
```

Errors such as `unsupported_method`, `proof_missing`, `signature_invalid`,
`authority_mismatch`, and `expired` are error codes on `status: "none"`, not
verification statuses.

### Reference Pseudocode

```typescript
async function verifyEnsWebsite(name: string): Promise<UrlVerificationResult> {
  const normalizedName = normalizeEnsName(name);
  const url = await resolveText(normalizedName, "url");
  if (!url) return { status: "none", error: { code: "record_missing" } };

  const origin = canonicalizeHttpsOrigin(url);
  if (!origin) return { status: "none", error: { code: "unsupported_record" } };

  const recordRef = keccak256Utf8("text:url");
  const valueHash = keccak256Utf8(url);
  const targetRef = keccak256Utf8(origin);
  const authority = await currentAuthority(normalizedName, "text:url");

  for (const method of ["url-https@1", "url-dns-txt@1", "url-dnssec@1"] as const) {
    const proofs = await fetchUrlProofs({ method, origin, recordRef, valueHash });
    for (const proof of proofs) {
      const claim = buildClaim({
        authority,
        recordRef,
        valueHash,
        targetRef,
        method,
        expiresAt: proof.claim.expiresAt,
        nonce: proof.claim.nonce,
      });
      if (!sameClaim(proof.claim, claim)) continue;
      if (claim.expiresAt <= now()) continue;
      if (!(await validEnsAuthoritySignature(authority, claim, proof.signature))) continue;
      return {
        status: "verified",
        verification: "control",
        method,
        origin,
        expiresAt: claim.expiresAt,
      };
    }
  }

  return { status: "none", origin, error: { code: "proof_missing" } };
}
```

## Rationale

### Preserve the existing `url` record

The `url` text record is already deployed and understood by clients. Replacing
it would break existing profiles and applications. This ENSIP treats the live
`url` record as the value being verified.

### Keep the signed claim small

The signature binds only context, name identity, record, value, target, method,
expiry, and nonce. It does not require clients to trust duplicate human-readable
fields in the proof payload.

### Make sidecars optional

HTTPS and DNS have deterministic target locations. A sidecar can improve
discovery or point to an onchain proof, but requiring one would add ENS writes
where the target proof is already enough.

### Require current ENS authority

A resolver record can remain after a name transfer. A website proof can also
remain deployed after a DNS or hosting change. Checking the current verification
authority prevents old owner signatures from continuing to verify after the ENS
name changes hands.

### Verify the origin, not a path

Web security boundaries are origin-based. A proof for `https://example.com` MUST
NOT imply control of `https://sub.example.com`, `https://example.com:8443`, or a
path on a shared origin such as `https://example.com/users/alice`.

### Support ENSv1 and ENSv2

The proof binds `contextId` and `nameId` instead of hardcoding only
`chainId`, `registry`, and `node`. ENSv1 adapters can map those fields to the
registry and namehash. ENSv2 adapters can map them to the hierarchical registry
and remint model without changing the proof envelope.

## Backwards Compatibility

This ENSIP is backwards compatible with existing ENS names and clients.

Clients that do not implement this ENSIP will continue to read and display the
`url` text record as before. Clients that implement this ENSIP SHOULD continue
to display the `url` record even when verification fails, but MUST NOT display a
verified website indicator unless the verification flow succeeds.

Existing resolvers do not need to be upgraded as long as they support ENS text
records.

## Security Considerations

### Meaning of verification

A verified result means that the current ENS verification authority signed a
claim and that the corresponding website origin or DNS host currently publishes
that claim. It does not mean the website is safe, non-malicious, legally owned
by the ENS name owner, or endorsed by ENS.

### ENS transfers, expiry, and reminting

Clients MUST check current ENS authority at validation time. A proof signed by a
previous owner MUST fail after transfer. Expired names and unavailable authority
states MUST NOT return positive verification. If an ENSv2 registry exposes a
generation or remint boundary, the authority adapter MUST include it in the
verified name identity or cache state.

### Wrapped names and delegated roles

For wrapped ENSv1 names, the registry owner is the Name Wrapper contract rather
than the effective owner. Clients that support wrapped names MUST resolve the
wrapped owner. For ENSv2, record-level write permissions are not automatically
verification authority; only the current owner or an explicit verification
delegate can authorize a proof.

### DNS and domain transfers

DNS TXT records can remain after a domain transfer, or can be copied into a new
zone. This ENSIP limits proof validity to 90 days and requires live proof
checks, but clients should still treat DNS verification as proof of control at
validation time, not permanent ownership.

### HTTPS compromise

An attacker who can write to `/.well-known/ens-url-verification` on an origin can
publish or replace website proofs for that origin. The attacker still needs a
valid signature from the current ENS verification authority, but previously
signed unexpired proofs may be replayed on the same origin. Short proof validity
reduces replay impact.

### Shared hosting and path-based websites

This ENSIP intentionally does not verify path-scoped websites. A user with write
access only to `https://example.com/alice` must not be able to verify the origin
`https://example.com`. Platforms that host user pages under a shared origin
should use user-specific subdomains if they want users to verify ENS website
ownership.

### Caching

Clients MAY cache verification results, but MUST NOT cache a positive result
past the earliest of:

- the claim `expiresAt`;
- the DNS TTL, for DNS proofs;
- the HTTP cache lifetime, for HTTPS proofs;
- the ENS authority expiry or state-version change; or
- an observed ENS owner, resolver, wrapper, subregistry, or record change.

Clients SHOULD revalidate before showing a high-trust UI indicator.

### Privacy

Fetching the HTTPS proof leaks that a client is checking a given ENS-name-to-
origin association to the website operator. Clients concerned with lookup
privacy MAY verify through a privacy-preserving proxy, but any cached result
MUST still respect proof expiration and live ENS authority.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
