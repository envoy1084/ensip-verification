# Singleton Reassessment

This memo revisits the earlier singleton direction. The conclusion is that a
mandatory singleton verifier, registry, or universal proof envelope should not
be the core architecture.

## Decision

Use a verification kernel plus native method profiles.

The kernel should define shared ENS semantics:

- normalized name and node;
- chain ID and registry;
- live resolver value check;
- current ENS authority;
- compact descriptor parsing;
- raw `valueHash` rules;
- common claim fields;
- expiry, replay protection, revocation, and cache rules;
- `verified` / `none` result semantics.

Method profiles should define native evidence:

- `https-origin` for HTTPS well-known proof;
- `dns-txt` for DNS TXT proof and DNSSEC assurance metadata;
- `service-account` for public service-account proof surfaces;
- `account-signature` for ENS address records;
- `content-manifest` for manifests inside content roots;
- `email-domain` and `email-attestation` for email records;
- `issuer-attestation` for issuer-backed claims.

The singleton-like surface should be an SDK function and common result format,
not a mandatory proof architecture.

## Why the Earlier Singleton Direction Is Weaker

A single envelope improves consistency, but it pushes unrelated systems into a
common-denominator format. OAuth tokens are not public proofs. DNSSEC validates
DNS data, not wallet control. EIP-712 and ERC-1271 already solve EVM account
signatures. Contenthashes already commit to bytes, so their missing properties
are endorsement, authorship, and safety review. Future record profiles may use
new resolver interfaces, CCIP-Read, smart-account policies, or external
protocols that do not fit a fixed envelope.

The base ENSIP should standardize what clients need to compare results safely,
not how every external system must prove itself.

## Comparable Protocol Pattern

| Protocol               | Pattern                                                    | Lesson for ENS                                                                                              |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| ENS itself             | Resolver profiles                                          | ENSIP-1 and ENSIP-5 favor modular resolver interfaces and arbitrary text keys, not one all-purpose profile. |
| ACME                   | Common authorization model with method-specific challenges | URL verification can copy the `http-01` / `dns-01` style, but that pattern should not govern all records.   |
| AT Protocol handles    | Layered hybrid                                             | One handle rule, with native DNS TXT or HTTPS well-known proof and DID resolution.                          |
| Nostr NIP-05           | Native public proof                                        | HTTPS well-known JSON maps an identifier to a public key.                                                   |
| Mastodon `rel="me"`    | Native reciprocal web proof                                | Simple public link proof with narrow semantics.                                                             |
| Farcaster              | Typed protocol messages                                    | Address verification and username proofs are separate typed flows.                                          |
| Keybase                | Proof graph plus adapters                                  | Common identity graph, but each service has its own proof adapter.                                          |
| DNSSEC                 | Native infrastructure authentication                       | Authenticates DNS RRsets; does not prove safety or social truth.                                            |
| Unstoppable Domains    | Per-record validation records                              | Validation records are specific to record families.                                                         |
| Handshake and Namecoin | Naming and storage layers                                  | Decentralized name control does not verify arbitrary external claims.                                       |
| OpenAlias              | Native DNS TXT payment mapping                             | DNS can publish address records, optionally strengthened by DNSSEC.                                         |

## Architecture Consequences

1. Rename the general proposal away from "singleton verification" language.
2. Treat the existing URL draft as a URL method profile.
3. Define a base ENSIP for resolver-class verification keys, compact
   descriptors, current authority, result states, replay, expiry, cache rules,
   and method profile requirements.
4. Define method profiles independently, starting with HTTPS/DNS text records
   and address signatures.
5. Use attestations for provider-mediated claims, especially private mailbox,
   compliance, custody, or platform API claims.
6. Use deterministic descriptor records for v1 discovery and treat future
   manifests or resolver-native data as optimizations.

## Result States

The SDK should expose only two public statuses:

| State      | Meaning                                                                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verified` | A supported method validated the live record, current authority, expiry, and target proof or trusted attestation.                                                 |
| `none`     | No positive result was produced. Error codes explain absence, unsupported methods, invalid proofs, expiry, mismatch, privacy blocking, and other failure reasons. |

Positive results carry kind `control` or `attestation`.

## Sources

- [ENSIP-1: ENS](https://docs.ens.domains/ensip/1/)
- [ENSIP-5: Text Records](https://docs.ens.domains/ensip/5/)
- [ENS resolution documentation](https://docs.ens.domains/resolution/)
- [RFC 8555: ACME](https://datatracker.ietf.org/doc/html/rfc8555)
- [RFC 8615: Well-Known URIs](https://datatracker.ietf.org/doc/html/rfc8615)
- [RFC 6749: OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [AT Protocol handle specification](https://atproto.com/specs/handle)
- [Nostr NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [Mastodon link verification](https://docs.joinmastodon.org/user/profile/)
- [Keybase server security and proofs](https://book.keybase.io/docs/server)
- [Farcaster protocol specification](https://github.com/farcasterxyz/protocol/blob/main/docs/SPECIFICATION.md)
- [RFC 4033: DNSSEC introduction and requirements](https://datatracker.ietf.org/doc/html/rfc4033)
- [Unstoppable Domains records reference](https://docs.unstoppabledomains.com/web3/resolution/records-reference)
- [Handshake developer documentation](https://hsd-dev.org/)
- [Namecoin FAQ](https://www.namecoin.org/docs/faq/)
- [OpenAlias standard](https://openalias.org/)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [Ethereum Attestation Service documentation](https://docs.attest.org/)
