# Current ENS Authority Model

This note documents the current ENS authority model for ENS Resolver Record
Verification. It is aligned with the current ENSIP draft and intentionally covers
only ENS on Ethereum mainnet.

The question is:

```text
Which account is allowed to sign the ENS side of a record-verification proof?
```

The answer should be simple:

```text
current ENS authority = current owner of the exact name under current ENS rules
```

## Recommendation

Use one current ENS mainnet authority rule set:

| Name type                          | Example                                                  | Current ENS authority                                      |
| ---------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Wrapped name                       | wrapped `alice.eth` or wrapped `sub.alice.eth`           | Name Wrapper owner of `uint256(namehash(name))`            |
| Unwrapped `.eth` second-level name | `alice.eth`                                              | Base Registrar registrant of `uint256(labelhash("alice"))` |
| Other unwrapped name               | `sub.alice.eth`, `deep.sub.alice.eth`, imported DNS name | ENS Registry owner of `namehash(name)`                     |

The verifier checks authority for the exact name being verified. Parent name
ownership is not automatically authority for a child name.

## Why This Is The Best Current Rule

### It Matches Real Transfer Semantics

For unwrapped `.eth` second-level names, the Base Registrar registrant is the
durable ownership source. The ENS Registry owner is a manager/controller and can
be stale after the registrar token transfers.

If verification accepted the registry manager for `alice.eth`, an old manager
could keep signing proofs after the Base Registrar registrant transferred the
name.

### It Handles Wrapped Names Cleanly

When the ENS Registry owner is the Name Wrapper, the wrapped token owner is the
right authority. This works for both wrapped second-level names and wrapped
subnames.

Wrapped authority must be bounded by wrapper expiry. For wrapped `.eth`
second-level names, it must also be bounded by Base Registrar registration
expiry, because positive verification should not survive the underlying `.eth`
registration expiry.

### It Keeps Subnames Exact

For an unwrapped subname such as:

```text
sub.alice.eth
```

authority is:

```text
ENSRegistry.owner(namehash("sub.alice.eth"))
```

not automatically:

```text
owner of alice.eth
```

This matters because many subnames are delegated, transferred, or independently
managed.

### It Avoids Overclaiming Resolver Permissions

Resolver writers, approved operators, profile managers, and hosted-profile
tools may be allowed to edit records. That does not mean they are allowed to
make verification claims on behalf of the ENS name.

Record editing power and verification authority are different powers.

## Normative Rule Shape

For ENS on Ethereum mainnet:

1. Normalize the ENS name.
2. Compute `node = namehash(name)`.
3. Read `ENSRegistry.owner(node)`.
4. If the registry owner is the Name Wrapper contract and the wrapped owner is
   nonzero:
   - authority is the Name Wrapper owner;
   - positive verification must not outlive wrapped-name expiry;
   - for wrapped `.eth` second-level names, positive verification must also not
     outlive Base Registrar registration expiry.
5. Else, if the name is an unwrapped `.eth` second-level name:
   - authority is `BaseRegistrar.ownerOf(uint256(labelhash(label)))`;
   - require the Base Registrar registration to be unexpired;
   - positive verification must not outlive Base Registrar registration expiry.
6. Else:
   - authority is `ENSRegistry.owner(node)`.
7. If authority is zero, return `none/unsupported_authority` or `none`.
8. If authority is an EOA, verify EIP-712 by ECDSA recovery.
9. If authority is a contract, verify EIP-712 through ERC-1271.

## Examples

### `alice.eth`, Unwrapped

```text
name = alice.eth
authority = BaseRegistrar.ownerOf(uint256(labelhash("alice")))
expiry bound = BaseRegistrar.nameExpires(uint256(labelhash("alice")))
```

Do not use `ENSRegistry.owner(namehash("alice.eth"))` as authority for the
unwrapped second-level name. That address may only be the manager.

### `sub.alice.eth`, Unwrapped

```text
name = sub.alice.eth
authority = ENSRegistry.owner(namehash("sub.alice.eth"))
expiry bound = none unless another live ENS rule exposes one
```

The owner of `alice.eth` is not automatically the authority for
`sub.alice.eth`.

### `deep.sub.alice.eth`, Unwrapped

```text
name = deep.sub.alice.eth
authority = ENSRegistry.owner(namehash("deep.sub.alice.eth"))
```

The verifier does not walk up to `sub.alice.eth` or `alice.eth` looking for a
parent signer. It verifies the exact name.

### `alice.eth`, Wrapped

```text
registry owner = ENSRegistry.owner(namehash("alice.eth"))
authority = NameWrapper owner of uint256(namehash("alice.eth"))
expiry bound = min(wrapper expiry, Base Registrar registration expiry)
```

The Name Wrapper owner signs the ENS side of the proof.

### `sub.alice.eth`, Wrapped

```text
registry owner = ENSRegistry.owner(namehash("sub.alice.eth"))
authority = NameWrapper owner of uint256(namehash("sub.alice.eth"))
expiry bound = wrapper expiry
```

If the wrapped owner transfers, old proofs from the previous wrapped owner must
fail.

### Imported DNS Name

```text
name = example.com
authority = ENSRegistry.owner(namehash("example.com"))
```

This proves ENS-side intent only. It does not prove legal DNS ownership unless a
target method such as `dns-txt` separately proves DNS control.

### Name With CCIP Read Resolver

```text
name = alice.eth
resolver returns records through CCIP Read
authority = current ENS authority for alice.eth
```

CCIP Read can prove the live resolver value. It does not automatically replace
the ENS authority signer.

If a gateway response contains:

```json
{ "owner": "0x..." }
```

that field is not authority by itself. It can only be used if a method profile
defines an equivalent or stronger current-authority check that cryptographically
verifies that owner.

## What Not To Accept As Base Authority

Do not accept these as current ENS authority in the base ENSIP:

- resolver writer;
- resolver delegate;
- profile manager;
- approved operator;
- gateway signer;
- unverified gateway `owner` field;
- indexer result;
- parent owner for an exact child name;
- old owner after transfer;
- owner after name expiry.

These may be useful in future delegation or attestation systems, but they should
not be silently treated as base ENS authority.

## Result Data

Verifier internals should track:

```text
authorityRule
authority
authorityExpiry
authoritySource
```

Suggested values:

```text
authorityRule: ens-mainnet
authoritySource: name-wrapper | base-registrar | ens-registry
```

The public result does not need to expose this by default, but debug output
should make it clear which rule was used.

## Release Priority

### P0 Before Release

- Define the current ENS authority rules in the base ENSIP.
- Require fail-closed behavior when authority cannot be determined.
- Use Base Registrar registrant for unwrapped `.eth` second-level names.
- Use ENS Registry owner for other unwrapped exact names.
- Use Name Wrapper owner for wrapped names.
- Enforce EOA EIP-712 and contract ERC-1271 signature paths.
- Enforce expiry bounds from the signed claim, external proof, wrapper expiry,
  and `.eth` registration expiry.
- State that CCIP Read record resolution does not automatically change authority.

### Good To Have

- Debug output for `authorityRule`, `authoritySource`, and expiry bound.
- Test fixtures for stale `.eth` managers, wrapped expiry, subname ownership,
  imported DNS names, CCIP Read resolver responses, and contract authorities.
- Wallet copy that says "current ENS authority" without implying safety,
  official status, or legal ownership.

### Not Required For The First Release

- Generic delegation.
- Resolver-writer authority.
- Gateway-signer authority.
- Parent-owner authority for child names.
- Legal/DNS ownership claims for imported DNS names.
- Safety, phishing, authenticity, or brand-official badges.

## Implementation Test Matrix

| Case                                                             | Expected result                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `alice.eth`, unwrapped, registry manager equals registrant       | Registrant signature verifies                                  |
| `alice.eth`, unwrapped, registry manager differs from registrant | Registrant signature verifies; manager signature fails         |
| `alice.eth`, unwrapped, after Base Registrar transfer            | Old registrant signature fails                                 |
| `alice.eth`, unwrapped, after registration expiry                | Returns `none`, even if grace-period behavior exists elsewhere |
| `alice.eth`, wrapped                                             | Name Wrapper owner signature verifies                          |
| `alice.eth`, wrapped, after wrapper transfer                     | Old wrapped owner signature fails                              |
| `alice.eth`, wrapped, after `.eth` registration expiry           | Returns `none`                                                 |
| `sub.alice.eth`, unwrapped                                       | ENS Registry owner of exact subname signs                      |
| `deep.sub.alice.eth`, unwrapped                                  | ENS Registry owner of exact deep subname signs                 |
| `sub.alice.eth`, wrapped                                         | Name Wrapper owner of exact subname signs                      |
| `example.com`, imported DNS name                                 | ENS Registry owner signs; DNS ownership is not implied         |
| Zero registry owner                                              | Returns `none`                                                 |
| Contract owner implementing ERC-1271                             | `isValidSignature` decides validity                            |
| Resolver delegate signs                                          | Fails under base rules                                         |
| Gateway response includes unverified `owner` field               | Fails as authority                                             |
| CCIP Read validates live record value only                       | Authority still comes from current ENS rules                   |

## Handoff Questions For Another Reviewer

1. Does any accepted signer fail to be the current owner under the current ENS
   rules?
2. Does `.eth` transfer through the Base Registrar invalidate old proofs even if
   the ENS Registry manager stays unchanged?
3. Does Name Wrapper transfer invalidate old proofs even if resolver records
   stay unchanged?
4. Does the design distinguish "can edit this resolver record" from "can speak
   for this ENS name"?
5. Does a gateway signer or gateway `owner` field become authority without a
   cryptographic current-authority check?
6. Does the verifier use the exact name, rather than the parent name, for
   subname authority?
7. Does the public UI avoid presenting `verified` as safe, official, legal, or
   non-malicious?

## Source Notes

Useful source context:

- ENS Registry, Base Registrar, Name Wrapper, EIP-712, and ERC-1271 are the core
  authority/signature primitives for this model.
- ENS Name Wrapper docs define fuses, wrapped expiry, parent control,
  emancipation, and locked states:
  https://docs.ens.domains/wrapper/fuses/
- ENS CCIP Read docs explain offchain resolver flow and callback validation:
  https://docs.ens.domains/resolvers/ccip-read/
- EIP-3668 explains that the callback decodes and verifies offchain data using
  implementation-specific validation:
  https://eips.ethereum.org/EIPS/eip-3668
