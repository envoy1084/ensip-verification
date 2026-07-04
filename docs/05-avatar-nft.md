# Avatar NFT Verification

Avatar NFT verification applies to:

```text
text(node, "avatar")
```

Only CAIP NFT references are verified by this category. HTTPS, IPFS, data, and
generic image avatar URIs can still be displayed by clients but are not verified
by this method.

## Records

| Item | Value |
| --- | --- |
| ENS record | `text(node, "avatar")` |
| Discovery record | Not required |
| Method | `avatar:nft` |
| Result | `verified/control` |

## Supported Values

```text
eip155:<chainId>/erc721:<contract>/<tokenId>
eip155:<chainId>/erc1155:<contract>/<tokenId>
```

Verification follows the ENSIP-12 NFT ownership check.

## 0-to-1 Setup Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant ENS
    participant NFTChain

    User->>App: Select NFT avatar
    App->>NFTChain: Check token ownership
    NFTChain-->>App: owner or balance
    App->>ENS: Resolve addr for name
    ENS-->>App: resolved address
    App->>App: Confirm resolved address owns NFT
    App->>ENS: Set text(avatar)
```

No signature proof is required because verification is a live-state check across
ENS and the NFT contract.

## Verification Flow

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant NFT

    SDK->>ENS: Resolve text(avatar)
    ENS-->>SDK: CAIP NFT reference
    SDK->>ENS: Resolve addr for NFT chain
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

## SDK Checklist

- Parse only CAIP NFT references for verification.
- Resolve the address for the same ENS name.
- For ERC-721, require `ownerOf(tokenId)` to equal the resolved address.
- For ERC-1155, require `balanceOf(resolvedAddress, tokenId) > 0`.
- Revalidate when avatar record, resolved address, NFT ownership, or NFT
  balance changes.
- Do not treat NFT metadata image safety as verified.

## Failure Mapping

| Case | Error |
| --- | --- |
| Non-CAIP avatar URI | `unsupported_method` |
| Malformed CAIP reference | `record_invalid` |
| Unsupported NFT standard | `unsupported_method` |
| Resolved address missing | `address_missing` |
| Token not owned | `target_mismatch` |
| NFT chain unavailable | `target_unavailable` |
