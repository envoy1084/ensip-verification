# Record Taxonomy

ENS record verification cannot be one-size-fits-all at the evidence layer. Each
record type has a different target authority and a different failure mode. The
singleton part should be the claim envelope and validation flow, not the proof
method.

## Taxonomy

| Record Class | Examples | Target Authority | Best Evidence | Verification Semantics |
| --- | --- | --- | --- | --- |
| Web origin | `text("url")` | HTTPS origin or DNS host | HTTPS well-known file, DNS TXT, DNSSEC | The origin or host agrees with the ENS claim. |
| Social account | `com.twitter`, `com.github`, `com.discord`, `org.telegram` | Platform account | Platform post, profile metadata, API, OAuth, or provider attestation | The platform account participated in the claim, with method-specific strength. |
| Cryptographic address | `addr(60)`, `addr(0)`, `addr(501)` | Private key or account contract | Chain-specific signed message or contract signature | The address or account controller signed the claim. |
| Contract or smart account | EVM contract addresses, account-abstraction wallets | Contract validation logic | ERC-1271 or chain equivalent | The contract accepted the claim digest. |
| Content pointer | `contenthash()` | Usually none; sometimes publisher key or DNS/IPNS authority | ENS authority signature, content manifest signature, DNS/IPNS evidence | The ENS authority selected the content; optional publisher control can be verified separately. |
| Avatar | `text("avatar")` | URL, NFT contract, token owner, or media host | ENSIP-12 avatar resolution and ownership checks | Record-specific validation, not generic profile verification. |
| Email or contact | `email`, `phone`, contact URLs | Inbox, domain, or provider account | Challenge response, domain verification, or provider attestation | High privacy risk; public proofs are often inappropriate. |
| Personal or legal attributes | name, location, organization, role | Real-world authority or issuer | Verifiable credential, attestation, or KYC provider | Attested fact, not target-control proof. |
| Future resolver records | New interfaces, offchain resolver data | Record-defined | Method registry adapter | Must be extensible without changing the base envelope. |

## Web Origins

Website verification is the cleanest case. The target has a natural control
boundary: origin for HTTPS, host for DNS. A bidirectional proof can require:

1. the ENS `url` record still resolves to the canonical origin;
2. an ENS verification sidecar still binds the proof digest;
3. the origin or host still publishes a matching proof;
4. the current ENS authority signed the proof.

This model is strong for custom domains and weak for shared origins. A user who
controls only `https://example.com/alice` should not be able to verify the whole
origin.

## Social Accounts

Social accounts are harder because the target authority is not always
cryptographic and APIs change. Evidence options:

- profile bio contains a nonce or ENS name;
- public post contains a signed challenge;
- OAuth confirms account ownership to a verifier service;
- platform API confirms profile metadata;
- third-party attestation records the verification event.

Questions to ask before accepting a social method:

- Can the proof be fetched by any client, or only by a privileged API key?
- Does the proof remain visible after account transfer, deletion, or handle
  recycle?
- Can the platform account owner remove or rotate the proof?
- Does the method verify a stable account ID or only a mutable username?
- Does the method require storing personal data in ENS?

For protocols with cryptographic account identifiers, such as Nostr, a stronger
adapter can verify the public key rather than a mutable display handle.
Farcaster is another useful comparison because an FID has custody keys, scoped
signers, username proofs, and address-verification messages. An ENS adapter for
Farcaster should prefer FID-linked proofs over a mutable display name alone.

## Cryptographic Addresses

Address verification should prove control of the target account, not only that
the ENS owner wrote the address into a resolver. For EVM externally owned
accounts, EIP-712 signatures are the natural proof. For EVM contract accounts,
ERC-1271 is the natural proof. For Bitcoin, BIP-322 is a stronger modern
candidate than legacy message signing. Other ecosystems need their own signing
profiles.

Important constraints:

- Some addresses are deposit addresses controlled by custodians and cannot sign.
- Some chains lack a universal wallet signing standard.
- Smart contracts may implement custom validation logic.
- A signature proves control of the key or account logic, not willingness to
  receive funds for all purposes.
- Requiring address proofs can create privacy leaks by linking accounts.

The protocol should allow `unverified` payment records to remain usable. It
should not make address verification mandatory for all ENS resolution.

## Contenthash

`contenthash` is different. IPFS and similar systems make content integrity
checkable by hash. That does not prove authorship, safety, or that the current
ENS owner still endorses the content after transfer.

Useful verification forms:

- ENS authority signature over the current contenthash, proving deliberate
  publication by the current ENS authority.
- Publisher manifest inside the content, signed by a publisher key.
- DNS/IPNS proof if the contenthash points to a mutable external namespace.
- Third-party security or malware attestation.

The base label should not say "verified content" without specifying which of
these properties was verified.

## Avatar

Avatar records already show that a text record can have custom validation
semantics. An NFT avatar can be considered validated only if the resolved
address owns the referenced token under the rules in ENSIP-12. A web-hosted
avatar has a different trust boundary from an NFT avatar.

This supports a broader architecture where the singleton envelope dispatches to
record-type adapters.

## Private or Sensitive Records

Email, phone, physical address, and legal identity fields should be handled
carefully. Public ENS records are globally readable. A public proof that someone
controls an inbox or phone number can create privacy and harassment risk.

For sensitive attributes, third-party attestations or selective-disclosure
credentials may be safer than public target proofs. The base protocol should
support such methods but not require them.

## Sources

- [ENS records](https://docs.ens.domains/web/records/)
- [EIP-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)
- [EIP-1577: contenthash field for ENS](https://eips.ethereum.org/EIPS/eip-1577)
- [EIP-2304: Multicoin support for ENS](https://eips.ethereum.org/EIPS/eip-2304)
- [ENSIP-12: Avatar text records](https://docs.ens.domains/ensip/12)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [BIP-322: Generic signed message format](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki)
- [CAIP-10: Account ID specification](https://chainagnostic.org/CAIPs/caip-10)
- [Nostr NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [Farcaster protocol specification](https://github.com/farcasterxyz/protocol/blob/main/docs/SPECIFICATION.md)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
