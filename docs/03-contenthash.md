# Contenthash Verification

Contenthash verification applies to ENSIP-7 records:

```text
contenthash(node)
```

The verification record is:

```text
text(node, "verification[contenthash]")
```

Content addressing proves byte integrity. It does not prove publisher identity
or safety.

## Verification Record

Examples:

```text
verification[contenthash] = v=ENS-VERIFY-1;method=publisher-manifest;uri=ipfs://...
verification[contenthash] = v=ENS-VERIFY-1;method=arweave-owner;uri=ar://...
verification[contenthash] = v=ENS-VERIFY-1;method=dnslink;uri=dns:_dnslink.example.com
verification[contenthash] = v=ENS-VERIFY-1;method=none
```

## Canonical Claim

```text
record = "contenthash"
valueHash = keccak256(contenthashBytes)
target = publisher key, Arweave owner, DNS name, or issuer subject
```

`contenthashBytes` are the raw bytes returned by the resolver. Gateway URLs are
transport and MUST NOT be signed as content identity.

## Initial Contenthash Methods

| Method | Verification |
| --- | --- |
| `none` | No proof advertised. |
| `publisher-manifest` | Current owner signature plus publisher manifest signature. |
| `arweave-owner` | Current owner signature plus Arweave transaction or data-item owner proof. |
| `dnslink` | Current owner signature plus DNSLink proof. |
| `issuer-attestation` | Trusted issuer attestation. |

## 0-to-1 Manifest Flow

```mermaid
sequenceDiagram
    participant Owner
    participant App
    participant Wallet
    participant Publisher
    participant Storage
    participant ENS

    Owner->>App: Choose content root
    App->>Storage: Publish content
    Storage-->>App: contenthash bytes
    App->>App: Build ENSRecordVerification
    App->>Wallet: Sign owner claim
    Wallet-->>App: ownerSignature
    App->>Publisher: Sign manifest over same claim
    Publisher-->>App: publisherSignature
    App->>Storage: Publish manifest
    App->>ENS: Set contenthash
    App->>ENS: Set verification[contenthash]
```

## Manifest Proof

```json
{
  "v": "ENS-VERIFY-1",
  "method": "publisher-manifest",
  "expiry": 1790812800,
  "nonce": "0x...",
  "publisher": "did:key:z...",
  "ownerSignature": "0x...",
  "publisherSignature": "..."
}
```

The manifest MAY live inside the content root, as a separate content-addressed
object, behind the verification record URI, or in onchain data.

## Arweave Flow

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant Arweave

    SDK->>ENS: Resolve contenthash and verification[contenthash]
    ENS-->>SDK: contenthash bytes and method
    SDK->>ENS: Resolve owner and expiry
    ENS-->>SDK: owner and nameExpiry
    SDK->>Arweave: Fetch transaction or data item
    Arweave-->>SDK: Owner, tags, signature
    SDK->>SDK: Check Arweave owner and ENS owner signature
```

## DNSLink Flow

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant DNS

    SDK->>ENS: Resolve contenthash and verification[contenthash]
    ENS-->>SDK: contenthash bytes and method
    SDK->>DNS: Fetch DNSLink and verification TXT
    DNS-->>SDK: DNS records and optional DNSSEC evidence
    SDK->>SDK: Check DNS target and owner signature
```

DNSSEC validation is evidence, not a separate signed method.

## Verification Flow

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant ProofStore
    participant Issuer

    SDK->>ENS: Resolve contenthash()
    ENS-->>SDK: raw bytes
    SDK->>ENS: Resolve verification[contenthash]
    ENS-->>SDK: method and proof reference
    alt Manifest or native proof
        SDK->>ProofStore: Fetch proof
        ProofStore-->>SDK: Proof object
        SDK->>SDK: Check owner and target signatures
    else Attestation
        SDK->>Issuer: Check attestation and revocation
        Issuer-->>SDK: Attestation state
    end
```

## SDK Checklist

- Hash raw `contenthash(node)` bytes.
- Do not sign gateway URLs.
- IPFS has no native account owner; use manifest, DNSLink, or attestation.
- Arweave can use transaction or data-item owner as target authority.
- Mutable namespaces require their own authority proof.
- Verification does not imply content safety.

## Failure Mapping

| Case | Error |
| --- | --- |
| Empty contenthash | `record_missing` |
| Verification record missing | none |
| `method=none` | none |
| Unsupported protocol | `unsupported_method` |
| Missing manifest | `proof_missing` |
| Publisher signature fails | `target_signature_invalid` |
| Issuer revoked | `revoked` |
