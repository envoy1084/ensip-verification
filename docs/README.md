# ENS Record Verification Specs

These documents define a minimal SDK-verifiable model for ENS record
verification. The model supports ENSv1 and future ENSv2 by verifying live
resolver state through version-specific authority adapters.

Verification is only for records that claim control of an external target. It is
not needed for ordinary profile metadata.

## Documents

1. [Verification kernel](./00-verification-kernel.md)
2. [URL verification](./01-url-verification.md)
3. [Address verification](./02-address-verification.md)
4. [Social account verification](./03-social-verification.md)
5. [Contenthash verification](./04-contenthash-verification.md)
6. [Avatar NFT verification](./05-avatar-nft-verification.md)
7. [SDK verification](./07-sdk-verification.md)

## Record Categories

| Category | Verify? | Methods |
| --- | --- | --- |
| URL records | Yes | `url-https@1`, `url-dns-txt@1`, `url-dnssec@1` |
| Address records | Yes | `addr-evm-eip712@1`, `addr-evm-erc1271@1`, `addr-chain-signature@1` |
| Social accounts | Yes when a service adapter exists | `social-public-proof@1`, `social-protocol-proof@1`, `social-attestation@1` |
| Contenthash | Yes for publisher or namespace control | `contenthash-manifest@1`, `contenthash-arweave@1`, `contenthash-dnslink@1`, `contenthash-attestation@1` |
| Avatar NFT | Yes for CAIP NFT references only | `avatar-caip-nft@1` |
| Display metadata | No | Not verified |
| Email and private contact fields | No default public verification | Out of scope until a privacy-preserving profile exists |

## Minimal Result Shape

Every record returns either no verification or one positive verification:

```ts
type VerificationStatus = "none" | "verified";
type VerificationKind = "control" | "attestation";
```

Errors such as `unsupported_method`, `proof_missing`, `expired`, and
`signature_invalid` are failure reasons on `status: "none"`, not statuses.

## Design Rules

- Verify live ENS records, not stale indexed data.
- Bind proofs to a minimal claim: context, name ID, record, value, target,
  method, expiry, and nonce.
- Keep proof publication flexible: HTTPS, DNS, ENS sidecars, onchain contracts,
  attestations, and content manifests are all valid method transports.
- Require current ENS authority or explicit current delegation for control
  methods.
- Treat ENSv1 and ENSv2 differences as authority-adapter concerns.
- Invalidate positives on transfer, expiry, remint, resolver change, record
  value change, target change, revocation, or proof expiry.
