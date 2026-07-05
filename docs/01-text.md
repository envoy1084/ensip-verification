# Text Record Verification

Text verification applies to any ENSIP-5 text record:

```text
text(node, key)
```

The verification record is also a text record:

```text
text(node, "verification[text][<key>]")
```

This layout avoids hard-coding top-level groups such as URL or social. The text
key identifies the record; the verification record value identifies the method.

## Verification Record

Examples:

```text
verification[text][url] = v=ENS-VERIFY-1;method=https-origin;uri=https://example.com/.well-known/ens-url-verification;expiry=1790812800
verification[text][com.github] = v=ENS-VERIFY-1;method=public-account;uri=https://github.com/alice/...
verification[text][avatar] = v=ENS-VERIFY-1;method=caip-nft
verification[text][description] = v=ENS-VERIFY-1;method=none
```

`method=none` explicitly advertises no proof. It always returns `status=none`.

## Canonical Claim

```text
record = "text:<key>"
valueHash = keccak256(bytes(textValue))
target = method-defined target
```

Method profiles MAY define stricter canonicalization. For example,
`https-origin` parses the text value as a URL and derives the target origin.

## Initial Text Methods

| Method | Example key | Target | Proof |
| --- | --- | --- | --- |
| `none` | `description` | None | No proof advertised. |
| `https-origin` | `url` | HTTPS origin | Owner signature plus well-known HTTPS proof. |
| `dns-host` | `url` | DNS host | Owner signature plus DNS TXT proof. |
| `public-account` | `com.github` | Stable account ID or handle | Public profile/post/protocol proof. |
| `issuer-attestation` | Any text key | Issuer subject | Signed or onchain attestation. |
| `caip-nft` | `avatar` | CAIP NFT reference | Live NFT ownership by resolved address. |

Future text keys reuse this document by defining a new `method` value or using
an existing method.

## Generic 0-to-1 Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Wallet
    participant ENS
    participant Target

    User->>App: Select text key and value
    App->>ENS: Resolve name, node, owner, text(key)
    ENS-->>App: Current ENS state
    App->>App: Choose method from verification[text][key]
    App->>App: Build ENSRecordVerification
    App->>Wallet: Request owner signature when method requires it
    Wallet-->>App: Owner signature
    App->>Target: Publish or request target proof
    Target-->>App: Proof available
    App->>ENS: Set text(key)
    App->>ENS: Set verification[text][key]
```

## URL Method Flow

For `text(node, "url")`:

```text
verification[text][url] = v=ENS-VERIFY-1;method=https-origin;uri=https://example.com/.well-known/ens-url-verification
```

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant Website
    participant OwnerContract

    SDK->>ENS: Resolve text(url)
    ENS-->>SDK: URL value
    SDK->>ENS: Resolve verification[text][url]
    ENS-->>SDK: method=https-origin
    SDK->>SDK: Canonicalize HTTPS origin
    SDK->>ENS: Resolve current owner and expiry
    ENS-->>SDK: owner, ownerContract, nameExpiry
    SDK->>Website: GET /.well-known/ens-url-verification
    Website-->>SDK: expiry, nonce, signature
    SDK->>SDK: Rebuild ENSRecordVerification
    alt Owner is contract
        SDK->>OwnerContract: isValidSignature(digest, signature)
        OwnerContract-->>SDK: magic value
    else Owner is EOA
        SDK->>SDK: Recover signer
    end
    SDK->>SDK: Check owner, expiry, origin, live text value
```

DNS uses `method=dns-host` and `_ens-url-verification.<host>. TXT`.
DNSSEC validation is verifier evidence, not a separate signed method.

## Social Account Flow

For `text(node, "com.github")`:

```text
verification[text][com.github] = v=ENS-VERIFY-1;method=public-account;uri=https://github.com/alice/...
```

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant Social
    participant Issuer

    SDK->>ENS: Resolve text(service key)
    ENS-->>SDK: handle or account value
    SDK->>ENS: Resolve verification[text][service key]
    ENS-->>SDK: method and proof reference
    alt public-account
        SDK->>Social: Fetch public proof
        Social-->>SDK: Profile, post, or protocol proof
        SDK->>SDK: Check account target and owner signature
    else issuer-attestation
        SDK->>Issuer: Fetch attestation and revocation state
        Issuer-->>SDK: Attestation state
        SDK->>SDK: Apply local issuer trust policy
    end
```

Service profiles SHOULD use stable account IDs when available. OAuth tokens and
private API responses MUST NOT be published in ENS.

## Avatar NFT Flow

For `text(node, "avatar")` containing a CAIP NFT reference:

```text
verification[text][avatar] = v=ENS-VERIFY-1;method=caip-nft
```

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant NFT

    SDK->>ENS: Resolve text(avatar)
    ENS-->>SDK: CAIP NFT reference
    SDK->>ENS: Resolve address for name
    ENS-->>SDK: resolved address
    alt ERC-721
        SDK->>NFT: ownerOf(tokenId)
        NFT-->>SDK: owner
        SDK->>SDK: owner == resolved address
    else ERC-1155
        SDK->>NFT: balanceOf(resolvedAddress, tokenId)
        NFT-->>SDK: balance
        SDK->>SDK: balance > 0
    end
```

`caip-nft` is a deterministic live-state check and does not require an owner
signature.

## No-Proof Metadata

Display metadata such as `name`, `description`, `location`, `keywords`, and
theme fields usually has no external target. Use no verification record or:

```text
verification[text][description] = v=ENS-VERIFY-1;method=none
```

Applications MAY display the metadata but MUST NOT show it as verified.

## SDK Checklist

- Resolve `text(node, key)` and `verification[text][key]` together.
- Treat missing verification records and `method=none` as `status=none`.
- Let the method define target parsing and proof fetching.
- Re-read the live text value before returning `verified`.
- Reject owner-signed proofs where `expiry` exceeds name expiry.
- Cache only until the earliest of proof expiry, verification record expiry,
  target cache lifetime, name expiry, owner change, resolver change, text value
  change, or verification record change.

## Failure Mapping

| Case | Error |
| --- | --- |
| Empty text value | `record_missing` |
| Missing verification record | none |
| `method=none` | none |
| Unknown method | `unsupported_method` |
| Target proof missing | `proof_missing` |
| Target mismatch | `target_mismatch` |
| Owner signature fails | `signature_invalid` |
| Issuer untrusted | `issuer_untrusted` |
