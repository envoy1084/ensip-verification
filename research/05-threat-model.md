# Threat Model

This threat model assumes an attacker can register ENS names, set arbitrary
resolver records for names they control, publish websites, publish DNS records
for domains they control, create social accounts, and attempt to reuse stale
proofs. Stronger attackers may compromise DNS, hosting, social accounts,
wallets, or resolver permissions.

## Assets to Protect

- User understanding of what a verified indicator means.
- Integrity of the binding between an ENS record and an external target.
- Correct invalidation after ENS transfers, resolver changes, target transfers,
  or proof expiry.
- Privacy of users who resolve or verify records.
- Extensibility for future record types without weakening existing semantics.

## Attacker Goals

| Goal                          | Example                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Impersonate a target          | Publish `text("com.twitter") = famous_account` under an unrelated ENS name.     |
| Borrow reputation             | Point `url` to a legitimate website and imply endorsement.                      |
| Redirect payment              | Publish a payment address that the name owner does not control.                 |
| Preserve stale trust          | Keep a proof valid after selling the ENS name or losing the domain.             |
| Confuse UI                    | Make an unverified record look verified by using similar text, icons, or names. |
| Abuse verifier infrastructure | Use a hosted verifier to create broad attestations users did not intend.        |
| Leak behavior                 | Observe which ENS names and URLs users are checking.                            |

## Threats and Required Mitigations

### Stale ENS Ownership

An ENS record or proof can remain after a name transfer. A verifier must resolve
the current ENS authority at validation time and reject signatures from previous
authorities.

Mitigations:

- include `chainId`, registry, normalized name, and node in the signed claim;
- compute the current ENS authority during validation;
- use short expiry;
- require new owner reauthorization after transfer.

Open question: whether the default authority should be owner, wrapped owner,
manager, or explicit verification delegate. Owner or wrapped owner is safest.
Manager or resolver authorization is easier for profile editors. A standard
should not silently treat every resolver writer as an identity verifier.

### Stale Target Ownership

Domains, websites, social accounts, and addresses can change control. A proof
published by the old target controller can remain visible or cached.

Mitigations:

- fetch live target evidence when showing a high-trust UI state;
- cap proof validity;
- respect DNS TTL and HTTP cache headers only as upper bounds, not as permanent
  proof;
- use stable target identifiers where platforms expose them;
- require target-side removal or rotation for revocation-sensitive methods.

### Replay

A valid proof for one record value might be copied to another location or reused
after the record changes.

Mitigations:

- sign the canonical record selector and canonical record value;
- include proof nonce and expiry;
- bind proof to the normalized ENS name and node;
- bind web proofs to exact origin, not path;
- bind DNS proofs to exact host and method;
- if descriptor field `h` is present, reject proof resources whose bytes do not
  match the descriptor hash.

### Shared Hosting

Users often control a path on a shared origin, not the whole origin. A proof
under `https://example.com/.well-known/...` verifies `example.com`, not
`example.com/alice`.

Mitigations:

- do not support path-scoped website verification in the base web method;
- recommend user-specific subdomains for hosted profiles;
- if path-scoped methods are ever added, label them separately and do not equate
  them with origin control.

### Social Handle Recycling

Platforms may recycle usernames. A proof tied only to a display handle can
remain misleading after the handle changes owners.

Mitigations:

- prefer stable platform account IDs over handles;
- include both the displayed handle and stable ID when available;
- require expiry and revalidation;
- treat proof methods that cannot expose stable IDs as weaker.

### Platform API Dependence

Some social verification methods require API access, paid plans, rate limits, or
OAuth flows. That can make decentralized verification impossible for ordinary
clients.

Mitigations:

- label such methods as provider-mediated;
- keep them out of the base required method set;
- allow third-party attestations for cases where public verification is not
  possible;
- prefer public proof locations when available.

### Address Signature Ambiguity

Cryptocurrency address signatures are chain-specific. Some wallets sign
messages in ways that are not replay-safe across domains, chains, or dapps.
Custodial deposit addresses may not be able to sign at all.

Mitigations:

- use typed, domain-separated messages where possible;
- include chain namespace, chain reference, account address, ENS name, record
  selector, value hash, expiry, and nonce;
- use ERC-1271 for EVM contracts;
- use chain-specific standards such as BIP-322 for Bitcoin;
- return `none` rather than failing resolution when a record cannot sign.

### Contenthash Overclaiming

Content addressing proves integrity of bytes. It does not prove author identity,
website control, absence of malware, or current endorsement by a transferred ENS
name.

Mitigations:

- distinguish "ENS-authorized contenthash" from "publisher-signed content" and
  "security-reviewed content";
- revalidate current ENS authority;
- avoid a generic "verified content" label.

### UI Misinterpretation

Users may treat a checkmark as safety, official status, or anti-phishing
approval.

Mitigations:

- return `verified` or `none` plus method, kind, and error metadata;
- display the verified relationship, for example "ENS and website match";
- separate control verification from security warnings;
- avoid badge reuse across incompatible proof levels.

### Privacy Leakage

Fetching HTTPS proofs, DNS TXT records, or platform APIs can reveal which ENS
records a user is checking. Verifiers and indexers can build interest graphs.

Mitigations:

- allow local verification where possible;
- support privacy-preserving proxies for lookup;
- let clients rely on indexers only with expiry-aware revalidation;
- avoid requiring proof checks for routine low-risk rendering.

## Minimum Security Requirements

A general ENS record verification protocol should require:

1. canonical claim encoding;
2. live ENS record comparison;
3. current ENS authority check;
4. target-side evidence check when the record references an external target;
5. method-specific canonicalization;
6. bounded proof lifetime;
7. replay-resistant nonce;
8. domain-separated signature;
9. explicit verification result semantics;
10. expiry-aware caching.

## Sources

- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [BIP-322: Generic signed message format](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki)
- [RFC 8555: ACME](https://datatracker.ietf.org/doc/html/rfc8555)
- [AT Protocol handle specification](https://atproto.com/specs/handle)
- [Mastodon link verification](https://docs.joinmastodon.org/user/profile/#verification)
- [Nostr NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md)
