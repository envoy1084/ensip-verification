# Comparable Systems

This file compares systems that verify names, domains, social accounts,
addresses, or profile claims. The goal is not to copy one design. The goal is to
extract constraints that apply to ENS record verification.

## Summary Table

| System | What Is Verified | Proof Location | Main Lesson |
| --- | --- | --- | --- |
| ACME | Control of a DNS identifier for certificate issuance | HTTP, DNS, or TLS challenge | Short-lived challenges and precise identifier scope. |
| DNSSEC | Authenticity of DNS data from a signed zone | DNS records and signatures | Authentication of records is not the same as safety. |
| AT Protocol handles | A domain handle maps to a DID | DNS TXT or HTTPS well-known file | Deterministic bidirectional handle resolution. |
| Mastodon verified links | Profile links back to the Mastodon profile | Website `rel="me"` link | Simple reciprocal proof, weak against page compromise. |
| Nostr NIP-05 | Internet identifier maps to a public key | HTTPS well-known JSON | Easy discovery, target-side host is the trust anchor. |
| Keybase | User controls social, web, DNS, or crypto accounts | Public posts, DNS TXT, website files | Proof graph with service-specific adapters. |
| DID Core | DID document defines verification methods and services | DID method resolution | Verification method and service endpoint are separate concepts. |
| Verifiable Credentials | Issuer makes a claim about a subject | Credential exchange or registry | Attestation is distinct from target control. |
| Ethereum Attestation Service | Structured attestations by issuers | Onchain or offchain attestations | Useful optional trust layer, not neutral base verification. |
| Unstoppable Domains | Domain records resolve to wallets/profile data | UD resolution | Records are useful, but target control is app-specific. |
| OpenAlias | DNS TXT maps names to cryptocurrency addresses | DNS TXT, optionally DNSSEC | DNS can publish payment records but does not prove recipient identity. |

## ACME

ACME, used by certificate authorities such as Let's Encrypt, verifies control of
an identifier before issuing a certificate. RFC 8555 defines challenge types
such as HTTP-01 and DNS-01. The important design properties are:

- challenge scope is exact;
- proof material is short-lived;
- the verifier must fetch current evidence;
- successful validation supports certificate issuance, not safety of website
  content.

ENS record verification can reuse this mindset. A proof for
`https://example.com` should not verify `https://sub.example.com` or a path on a
shared host. A proof for one record value should not verify later values.

## DNSSEC and DANE

DNSSEC authenticates DNS answers from a signed zone. DANE uses DNSSEC-authenticated
TLSA records to associate TLS keys or certificates with names. These systems
show a useful distinction:

- DNSSEC can authenticate who published a DNS record.
- It does not decide whether the published record is socially trustworthy.

For ENS, DNSSEC-style thinking supports a `dnssec` evidence level for DNS-based
proofs, but it should not become a general "safe" label.

## AT Protocol Handles

AT Protocol separates user identity from handles. A handle resolves to a DID by
checking either a DNS TXT record under `_atproto.<handle>` or an HTTPS file at
`/.well-known/atproto-did`. The DID document then resolves identity services.

Relevant lessons:

- DNS and HTTPS well-known locations are practical for developer adoption.
- Handle verification should be deterministic and repeatable.
- A human-readable handle should map to a stronger stable identifier.
- The proof method should be independent from UI reputation.

For ENS, the equivalent pattern is: the ENS record remains the human-readable
claim, while the proof envelope binds it to a stable target authority.

## Mastodon Verified Links

Mastodon verifies profile links by checking whether the linked webpage contains
a reciprocal `rel="me"` link back to the Mastodon profile. This is simple and
user-friendly, but it also shows limits:

- it proves control of the linked page at validation time;
- it does not prove legal identity or site safety;
- it can break when pages are redesigned;
- it depends on HTML parsing and platform-specific profile semantics.

For ENS social records, `rel="me"` is useful for web identities, but it is too
weak to be the only generic model.

## Nostr NIP-05

NIP-05 maps a human-readable internet identifier to a Nostr public key using an
HTTPS JSON file under `/.well-known/nostr.json`. The target domain is the trust
anchor and the mapping is easy to fetch.

This is a good model for social protocols that already use public keys. For ENS
records, it suggests that protocol-specific adapters can be strong when the
target platform has a cryptographic account identifier.

## Keybase

Keybase built a proof graph across social accounts, websites, DNS records, and
cryptographic keys. It used service-specific proof formats: a tweet for Twitter,
a gist for GitHub, a DNS TXT record for a domain, a file on a website, and
signed statements for keys.

The strongest lesson is architectural: one proof envelope can orchestrate many
adapters, but the verification logic must remain target-specific. Trying to
force every target into a single evidence mechanism would either exclude useful
records or weaken the semantics.

## DID Core and Verifiable Credentials

DID Core defines DID documents that contain verification methods and service
endpoints. Verifiable Credentials define attestations made by issuers about
subjects. These are relevant but should not be collapsed into ENS record control:

- a DID document can define keys and services for a decentralized identifier;
- a credential can state something about an identity;
- neither automatically proves that an ENS resolver record is current and agreed
  by a target service.

DIDs and credentials are better as optional evidence methods or attestation
layers. They should not be the minimum base requirement for all ENS users.

## Ethereum Attestation Service

Ethereum Attestation Service provides schemas and attestations that can be
onchain or offchain. This is useful for third-party statements such as "this
auditor verified this website" or "this provider verified this social account".

EAS should be treated as an optional attestation rail. If the base ENSIP depends
on a particular attestation registry, verification becomes a governance and
issuer-trust problem rather than a neutral record-control problem.

## Unstoppable Domains and OpenAlias

Unstoppable Domains and OpenAlias both publish records that applications can
resolve to addresses or profile data. OpenAlias uses DNS TXT records and can
benefit from DNSSEC. These systems are useful comparisons because they show the
same limitation: publishing a payment address in a naming system does not prove
that the address belongs to the expected person or that paying it is safe.

## What ENS Should Reuse

- Deterministic proof discovery from ACME, AT Protocol, Nostr, and Mastodon.
- Bidirectional control checks from primary-name validation and handle systems.
- Short validity windows from ACME.
- Record-specific method adapters from Keybase.
- Optional attestation layers from DIDs, VCs, and EAS.

## What ENS Should Avoid

- A single overloaded "verified" badge.
- Permanent proofs that survive ownership changes.
- Platform-specific verification baked into the base protocol.
- A mandatory centralized registry of approved accounts.
- Treating DNS, HTTPS, or social-account control as proof of safety.

## Sources

- [RFC 8555: Automatic Certificate Management Environment](https://datatracker.ietf.org/doc/html/rfc8555)
- [RFC 4033: DNSSEC introduction and requirements](https://datatracker.ietf.org/doc/html/rfc4033)
- [RFC 6698: DANE TLSA](https://datatracker.ietf.org/doc/html/rfc6698)
- [AT Protocol handle specification](https://atproto.com/specs/handle)
- [Mastodon link verification documentation](https://docs.joinmastodon.org/user/profile/#verification)
- [Nostr NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [Keybase proofs documentation](https://book.keybase.io/docs/server_security/merkle_root_in_bitcoin_blockchain)
- [W3C DID Core](https://www.w3.org/TR/did-core/)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
- [Ethereum Attestation Service documentation](https://docs.attest.org/docs/welcome)
- [Unstoppable Domains records reference](https://docs.unstoppabledomains.com/web3/resolution/records-reference)
- [OpenAlias standard](https://openalias.org/)

