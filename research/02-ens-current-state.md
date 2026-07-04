# ENS Current State

## Resolver Records

ENS records are resolved through resolver contracts. Common records include:

| Record | Standard or Source | Verification Today |
| --- | --- | --- |
| `addr()` / `addr(coinType)` | ENS resolver profiles and EIP-2304 | Self-asserted by the resolver authority. |
| `text(key)` | EIP-634 and ENSIP-5 conventions | Self-asserted, except where clients implement record-specific checks. |
| `contenthash()` | EIP-1577 | Content-addressed value, but not proof of author, safety, or website control. |
| `name()` reverse record | ENS reverse resolution and ENSIP-19 | Usually validated by forward-confirmed reverse resolution. |
| `avatar` text record | ENSIP-12 | Can include extra validation, such as NFT ownership checks. |

The existing resolver model answers "what does this name currently resolve to?"
It does not answer "does the referenced target agree?"

## Existing ENS Verification Patterns

### Forward-Confirmed Reverse Resolution

Primary-name resolution is already a bidirectional pattern. A reverse record can
claim that an address maps to a name, but clients should confirm the name
resolves back to the same address. ENSIP-19 extends primary names across coin
types and still relies on forward confirmation for correctness.

This is directly relevant. A general record-verification ENSIP should adopt the
same principle: one side can claim a relationship, but clients should not treat
it as verified until the other side confirms it.

### Avatar Validation

ENSIP-12 defines avatar record handling. For NFT avatars, clients can resolve
the NFT reference and verify that the relevant address owns the NFT before
displaying it as a validated avatar. This shows that ENS already accepts
record-specific verification logic where the record points to a target with its
own authority model.

Avatar validation is not a universal solution because it is tailored to NFT
ownership. It is still useful precedent for returning structured validation
states instead of a binary "record exists" result.

### DNSSEC Names

ENS supports DNS names imported through DNSSEC proofs. DNSSEC can prove that a
DNS zone authorized the DNS-to-ENS linkage. This is different from verifying
arbitrary ENS resolver records, but it is another example where ENS relies on an
external authority system and proof material.

## Authority Ambiguity

A core design question is: who is allowed to verify a record?

Possible authorities:

- registry owner;
- Name Wrapper owner for wrapped names;
- resolver record controller or approved operator;
- manager role exposed by ENS manager flows;
- an explicit verification delegate authorized by the owner;
- a third-party attester.

Requiring the registry or wrapped owner is simple and resilient to stale
resolver state, but may be too strict for delegated profile management.
Accepting any resolver writer is convenient, but it can inherit resolver-specific
authorization bugs or broad approvals that were never intended for identity
verification. A standard should define a default authority and an explicit
delegation path rather than infer trust from every resolver permission.

## Constraints for a General Verification ENSIP

### No Resolver Upgrade Requirement

A deployable standard should work with existing resolvers. Requiring a new
resolver interface would slow adoption and leave existing names unsupported.

### No Global Record Enumeration

Resolvers are not guaranteed to expose all keys a name has set. A verifier
should be able to verify a specific claim deterministically without relying on
enumerating all records.

### Resolver Migration Must Not Break Valid Claims Unnecessarily

If a name migrates from one resolver to another but keeps the same record value,
the verification claim should still be meaningful after revalidation. However,
proofs must still fail when the live record changes.

### Name Transfers Must Invalidate Old Owner Proofs

ENS names can transfer. Resolver records can remain stale. A proof signed by a
previous owner must fail after transfer unless the new owner reauthorizes it.

### Offchain Proofs Are Inevitable

Many targets cannot prove control onchain. Websites, DNS zones, social accounts,
email inboxes, GitHub repositories, and content distribution systems require
offchain evidence. The ENS side should store enough information to opt in and
bind the proof, but should not try to store all evidence onchain.

## Takeaways

- ENS already has bidirectional verification patterns, but only for specific
  cases.
- Text, address, and contenthash records remain self-asserted unless a client
  adds extra semantics.
- The next standard should define a generic proof envelope, not a single
  hardcoded `url` mechanism.
- Authority delegation needs explicit design. It should not be an accidental
  consequence of resolver write permissions.

## Sources

- [ENS records](https://docs.ens.domains/web/records/)
- [ENS resolvers](https://docs.ens.domains/resolvers/)
- [EIP-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)
- [EIP-1577: contenthash field for ENS](https://eips.ethereum.org/EIPS/eip-1577)
- [EIP-2304: Multicoin support for ENS](https://eips.ethereum.org/EIPS/eip-2304)
- [ENSIP-12: Avatar text records](https://docs.ens.domains/ensip/12)
- [ENSIP-19: Multichain primary names](https://docs.ens.domains/ensip/19)
- [ENS DNSSEC documentation](https://docs.ens.domains/dns-registrar/guide)
- [ENS Name Wrapper documentation](https://docs.ens.domains/wrapper/)

