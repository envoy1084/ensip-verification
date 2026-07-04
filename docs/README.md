# ENS Record Verification Technical Specs

This folder turns the research into implementation-oriented method profiles.
The design is a verification kernel plus native method profiles. The kernel
standardizes shared semantics; each profile uses the proof mechanism native to
the target being verified.

Read in order:

1. [Verification kernel](./00-verification-kernel.md)
2. [URL and web origin verification](./01-url-verification.md)
3. [Address verification](./02-address-verification.md)
4. [Social account verification](./03-social-verification.md)
5. [Contenthash verification](./04-contenthash-verification.md)
6. [Avatar and media verification](./05-avatar-media-verification.md)
7. [Contact, identity, and attestation verification](./06-contact-identity-attestations.md)
8. [Indexers, APIs, subgraphs, and SDKs](./07-indexers-apis-subgraphs.md)

## Verification Categories

| Category | Verify By Default | Primary Method Profiles |
| --- | --- | --- |
| URL and web origin | Yes | `url-https@1`, `url-dns-txt@1`, `url-dnssec@1` |
| EVM address | Yes for high-risk UX | `addr-evm-eip712@1`, `addr-evm-erc1271@1` |
| Non-EVM address | Optional by chain support | `addr-chain-specific@1` |
| Social account | Yes when a stable target exists | `social-public-proof@1`, `social-oauth-attestation@1` |
| Contenthash | Yes, but with precise semantics | `contenthash-owner@1`, `contenthash-publisher@1` |
| Avatar and media | Yes when displayed as identity | `avatar-ensip12-nft@1`, `media-url@1`, `media-contenthash@1` |
| Email and contact | Usually opt-in only | `contact-domain@1`, `contact-provider-attestation@1` |
| Legal identity and role | Attestation only | `identity-attestation@1` |
| Freeform profile text | No | None by default |

## Non-Goals

- Do not mark arbitrary profile text as verified.
- Do not treat verification as safety, legal ownership, trademark ownership, or
  ENS endorsement.
- Do not require all methods to use one global proof envelope.
- Do not require a central verifier service for public, independently
  verifiable methods.
- Do not hide the underlying ENS record when verification fails.

## Common Implementation Rule

Every positive verification result must bind:

- the ENS deployment context;
- the normalized ENS name and node;
- the exact resolver record selector;
- the canonical current record value;
- the current ENS authority or scoped delegate;
- the target authority or attestation issuer;
- the method profile and version;
- expiry and revocation boundaries.
