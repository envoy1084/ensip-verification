# Avatar NFT Verification

This profile only verifies ENS avatar records that are CAIP NFT references. It
does not verify HTTPS, IPFS, data, media URL, or generic image records.

Applies to:

```text
text(node, "avatar") = eip155:<chainId>/erc721:<contract>/<tokenId>
text(node, "avatar") = eip155:<chainId>/erc1155:<contract>/<tokenId>
```

Method:

| Method | Verification | Target |
| --- | --- | --- |
| `avatar-caip-nft@1` | `control` | NFT ownership by the resolved address |

This method is a deterministic live-state check. It does not use a signed
`ENSRecordClaim` unless a future profile adds one.

## Verification

A verifier MUST:

1. Resolve `text("avatar")` for the ENS name.
2. Parse the value as a CAIP NFT reference.
3. Reject unsupported namespaces, token standards, chains, or malformed token
   IDs with `status: "none"`.
4. Resolve the address for the same ENS name. For EVM NFT chains, use the
   address record appropriate for that chain when supported; otherwise use
   `addr(bytes32)` as the Ethereum address.
5. Query the NFT contract on the CAIP chain.
6. For ERC-721, require `ownerOf(tokenId)` to equal the resolved address.
7. For ERC-1155, require `balanceOf(resolvedAddress, tokenId) > 0`.
8. Return `verified/control` with method `avatar-caip-nft@1`.

If the avatar value is `https`, `ipfs`, `data`, or any other non-CAIP media URI,
this profile returns `none` with `unsupported_method`; the avatar may still be
displayed according to client policy.

## Invalidation

SDKs MUST revalidate on:

- avatar text record change;
- resolved address change;
- ENS owner, resolver, wrapper, or ENSv2 authority change;
- NFT transfer or balance change;
- NFT contract state changes that affect ownership.

## Security Notes

- NFT ownership proves current control of the token, not authorship or image
  safety.
- Metadata and image URLs inside NFT metadata can change for mutable NFTs.
- Clients should avoid executing active content from avatar media.
