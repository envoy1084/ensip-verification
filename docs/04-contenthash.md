# Contenthash Verification

Contenthash verification applies to:

```text
contenthash(node)
```

It verifies publisher or namespace control for content-addressed or
content-routed targets such as IPFS, Arweave, Swarm, IPNS, and DNSLink.

Content addressing proves byte integrity. It does not prove publisher identity
or safety.

## Records

| Item | Value |
| --- | --- |
| ENS record | `contenthash(node)` |
| Discovery record | `text(node, "verification[contenthash]")` |
| Methods | `contenthash:manifest`, `contenthash:arweave`, `contenthash:dnslink`, `contenthash:attestation` |
| Result | `verified/control` or `verified/attestation` |

## Canonical Values

```text
record = "contenthash"
valueHash = keccak256(contenthashBytes)
target = publisher key, Arweave owner, DNS name, or issuer subject
```

`contenthashBytes` are the raw bytes returned by the resolver. Gateway URLs are
transport and MUST NOT be signed as content identity.

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
    App->>ENS: Optional verification[contenthash]
```

## Manifest Proof

```json
{
  "v": "ENS-VERIFY-1",
  "method": "contenthash:manifest",
  "expiry": 1790812800,
  "nonce": "0x...",
  "publisher": "did:key:z...",
  "ownerSignature": "0x...",
  "publisherSignature": "..."
}
```

The manifest MAY live:

- inside the content root;
- as a separate content-addressed object;
- behind the discovery record URI;
- in onchain data.

Existing immutable content can be verified by publishing a separate manifest
that binds the live `contenthash(node)` bytes.

## Arweave Flow

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant Arweave

    SDK->>ENS: Resolve contenthash and owner
    ENS-->>SDK: contenthash bytes, owner
    SDK->>Arweave: Fetch transaction or data item
    Arweave-->>SDK: Owner, tags, signature
    SDK->>SDK: Check Arweave owner and ENS owner signature
```

`contenthash:arweave` verifies the Arweave transaction or data-item owner and a
claim binding that owner to the live ENS contenthash.

## DNSLink Flow

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant DNS

    SDK->>ENS: Resolve contenthash and owner
    ENS-->>SDK: contenthash bytes, owner
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
    SDK->>ENS: Resolve owner and discovery record
    ENS-->>SDK: owner and proof reference
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
| Unsupported protocol | `unsupported_method` |
| Missing manifest | `proof_missing` |
| Publisher signature fails | `target_signature_invalid` |
| Issuer revoked | `revoked` |
| Gateway mismatch only | `target_mismatch` |
