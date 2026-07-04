# ENS Record Verification Notes

The current ENSIP draft is:

- [ENSIP-X: URL Text Record Verification](../ensip-x-url-verification.md)

The earlier multi-profile draft files were removed because they introduced
generic abstractions that were not ENS-native. Future record verification
profiles should be separate ENSIPs with concrete fields and algorithms.

## Category Guidance

| Category | Record | Recommended verification |
| --- | --- | --- |
| URL | `text(node, "url")` | Current owner signature plus HTTPS or DNS proof. |
| Address | `addr(node)` or `addr(node, coinType)` | Current owner signature plus target account signature over `coinType` and native address bytes. |
| Social | `text(node, serviceKey)` | Service-specific public proof or issuer attestation over the live service key value. |
| Contenthash | `contenthash(node)` | Publisher manifest, Arweave owner proof, DNSLink proof, or issuer attestation over raw contenthash bytes. |
| Avatar NFT | `text(node, "avatar")` | ENSIP-12 CAIP-22/CAIP-29 NFT ownership by the resolved address. |
| Profile metadata | `name`, `description`, display fields | No default verification. |
