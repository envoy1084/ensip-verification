# Problem Model

## Problem Statement

ENS names can publish resolver records such as cryptocurrency addresses, text
records, website URLs, contenthashes, avatars, and profile metadata. These
records are useful because applications can resolve them deterministically from a
name. They are not, by default, proof that the ENS name owner controls the
thing being referenced.

Examples:

- `text("url") = https://example.com` does not prove that the ENS name owner
  controls `example.com`.
- `text("com.twitter") = vitalikbuterin` does not prove that the ENS name owner
  controls that social account.
- `addr(60) = 0x...` does not prove that the ENS name owner controls the target
  address, only that the resolver returns it.
- `contenthash = ipfs://...` does not prove the content is safe, endorsed by a
  third party, or authored by the ENS owner.
- `text("avatar") = eip155:1/erc721:...` can sometimes be checked against NFT
  ownership, but that is a record-specific rule, not a generic resolver
  property.

The verification gap is not one problem. It is several separate questions that
clients often collapse into a single "verified" badge.

## Verification Questions

| Question                | What It Proves                                                                    | What It Does Not Prove                                     |
| ----------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Record integrity        | The resolver currently returns a value for a name.                                | The value is true, safe, or controlled by the same person. |
| ENS authorization       | A current ENS authority authorized a claim.                                       | The external target agrees with the claim.                 |
| Target control          | The target website, DNS zone, social account, or address participated in a proof. | Legal ownership, reputation, safety, or uniqueness.        |
| Bidirectional binding   | ENS and target both publish the same claim at validation time.                    | That either side is trustworthy.                           |
| Third-party attestation | A verifier, issuer, or registry made a statement about the claim.                 | That the statement is decentralized or always current.     |
| Safety/reputation       | A security service believes the target is not known-bad.                          | Identity control or consent by the target.                 |

An ENSIP should define which question it answers and avoid implying answers to
the others.

## Why Self-Assertion Is Insufficient

Self-asserted records are expected and useful. ENS would be much less useful if
every profile field required outside approval. The issue is UI semantics:
wallets, explorers, dapps, and profile apps often render ENS metadata next to
trusted actions. A fake URL or social record can look authoritative because the
name itself is memorable.

Concrete harms:

- Phishing: a scam website is published under a known-looking ENS profile.
- Impersonation: a record points to a real celebrity, project, or company
  social handle.
- Payment redirection: a name publishes an address that belongs to an attacker,
  custodian, or unrelated recipient.
- Stale trust: a proof remains after an ENS name transfer, DNS transfer, social
  handle recycle, resolver migration, or wallet compromise.
- Badge overreach: users interpret "verified" as "safe" when it only proves
  control.

## Verification Scope

A general system needs to identify the exact claim being verified. A claim is
not just a record type. It must include:

- the ENS deployment context: chain ID and registry;
- the normalized ENS name and node;
- the resolver record selector, such as `text("url")`, `addr(60)`, or
  `contenthash()`;
- the canonical record value;
- the verification method and its current evidence;
- the current ENS-side authority;
- the target-side authority, when there is one.

Without a canonical claim object, clients cannot safely compare proofs across
record types, chains, resolver migrations, or future resolver interfaces.

## Verification Result Semantics

The current architecture deliberately keeps public verifier status small:

```text
verified
none
```

Positive results carry one kind:

```text
control
attestation
```

Research still distinguishes the underlying evidence relationships:

| Evidence Relationship       | Meaning                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| ENS-authorized              | The current ENS authority signed or authorized the record value. |
| Target-controlled           | The external target published or signed a matching proof.        |
| Control verification        | Live ENS state and target evidence validate the same claim.      |
| Attestation verification    | A trusted issuer made an explicit statement about the claim.     |
| Safety or reputation review | A security service evaluated the target.                         |

Only control verification and accepted attestation verification should produce
`verified`. Safety or reputation review is a separate product layer and should
not be collapsed into record verification.

## Design Implications

1. The proof must be checked against live ENS state, not only against historical
   resolver data.
2. The proof must expire, because external control can change without an ENS
   event.
3. The proof must be scoped to the canonical record value, not just the name.
4. The proof must define the target authority for each record type.
5. Clients must expose exact semantics, not a single overloaded checkmark.

## Sources

- [ENS record documentation](https://docs.ens.domains/web/records/)
- [EIP-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)
- [EIP-1577: contenthash field for ENS](https://eips.ethereum.org/EIPS/eip-1577)
- [EIP-2304: Multicoin support for ENS](https://eips.ethereum.org/EIPS/eip-2304)
- [ENSIP-12: Avatar text records](https://docs.ens.domains/ensip/12)
- [ENSIP-19: Multichain primary names](https://docs.ens.domains/ensip/19)
