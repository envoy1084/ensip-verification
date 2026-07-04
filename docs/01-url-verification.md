# URL Verification

URL verification applies to records that point to a web origin, primarily
`text("url")` and URL-valued endpoint records. It verifies control of the ENS
name and control of the web origin or DNS host. It does not verify site safety,
trademark ownership, legal ownership, or endorsement by ENS.

## Methods

| Method | Verification | Target |
| --- | --- | --- |
| `url-https@1` | `control` | HTTPS origin |
| `url-dns-txt@1` | `control` | DNS host |
| `url-dnssec@1` | `control` | DNS host with DNSSEC validation |

DNSSEC is method evidence, not a separate status. All successful methods return
`status: "verified"` and `verification: "control"`.

## Claim Fields

For `text("url")`:

```text
recordRef = keccak256("text:url")
valueHash = keccak256(bytes(liveTextValue))
targetRef = keccak256(bytes(canonicalOrigin))
```

`liveTextValue` is the exact UTF-8 value returned by the resolver.

`canonicalOrigin` is derived from the live URL. The signed claim MUST use the
kernel `ENSRecordClaim` fields and MUST NOT separately sign the human-readable
name, path, query, proof URL, or sidecar key.

## URL Canonicalization

A valid URL MUST:

- be absolute;
- use the `https` scheme;
- contain a DNS host;
- not contain username or password;
- not use an IP literal;
- not be `localhost`.

Canonical origin algorithm:

1. Parse the live value as a URL.
2. Lowercase the scheme to `https`.
3. Convert the host to DNS A-label form using IDNA.
4. Lowercase the host.
5. Remove one trailing dot.
6. Omit port `443`.
7. Preserve any non-default port.
8. Drop path, query, and fragment.

Examples:

| Live URL | Canonical origin |
| --- | --- |
| `https://Example.COM/` | `https://example.com` |
| `https://example.com:443/a` | `https://example.com` |
| `https://example.com:8443/a` | `https://example.com:8443` |

## Proof Payload

The target proof payload is intentionally small:

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

`signature` MUST cover the claim hash and MUST be produced by the current ENS
authority or a valid verification delegate. Contract authorities MUST validate
with ERC-1271.

The proof MAY include unsigned helper fields such as `name`, `origin`, or
`proofUrl`, but verifiers MUST recompute claim fields from live ENS state and
ignore helpers for signature validity.

Maximum validity: 90 days.

## HTTPS Publication

For `url-https@1`, publish the proof at:

```text
<canonicalOrigin>/.well-known/ens-url-verification
```

The response MUST:

- use HTTPS with normal WebPKI validation;
- return HTTP status `200`;
- have a UTF-8 JSON body no larger than 64 KiB;
- not redirect to a different origin.

Same-origin redirects MAY be followed. The JSON body MAY be a single proof or an
object containing a `proofs` array. A verifier accepts the first proof that
validates the live claim.

Recommended content type:

```text
application/ens-url-verification+json
```

## DNS Publication

For `url-dns-txt@1`, publish:

```text
_ens-url-verification.<host>. TXT "ENSVERIFY1 <base64url-json-proof>"
```

Rules:

- Concatenate multiple TXT character strings in order.
- If multiple TXT records exist, any one valid proof is enough.
- DNS TXT MUST NOT verify a URL with a non-default HTTPS port.
- If the verifier validates the DNSSEC chain, it MAY report method
  `url-dnssec@1`.

## ENS Sidecar

A sidecar is optional because URL proofs have deterministic target locations.
When used, the sidecar key SHOULD be:

```text
verification[<recordRef>][<valueHash>]
```

The sidecar MAY point to the HTTPS proof, DNS proof, or an onchain proof. A
missing sidecar does not prevent verification if the deterministic target proof
is valid.

## Verification

A verifier MUST:

1. Resolve the live URL record.
2. Validate and canonicalize the URL.
3. Build the claim from live ENS state and current authority state.
4. Fetch the HTTPS or DNS proof.
5. Check `method`, `expiresAt`, and all claim fields.
6. Verify the ENS authority signature or delegate authorization.
7. Return `verified/control` only if target publication and ENS authority both
   validate the same claim.

## Security Notes

- A verified URL proves current control of an ENS name and an origin or DNS host
  at verification time.
- It does not prove website safety.
- Shared hosting origins are risky because the origin, not a path, is the
  target authority.
- HTTPS verification leaks lookup interest to the website.
- DNS TXT without DNSSEC depends on the verifier's DNS resolution trust model.
