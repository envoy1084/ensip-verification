# Current ENS Authority Model

This note verifies the authority behavior used by ENS Resolver Record
Verification against the current Ethereum mainnet contracts.

## Resolution And Authority Are Separate

The canonical Universal Resolver is the record-resolution entrypoint. ENSIP-23
defines it as the common path for direct, inherited, wildcard, and CCIP Read
resolvers. The long-lived proxy can change its underlying registry traversal as
ENS evolves.

Universal Resolver returns resolver data. It does not make a resolver writer,
gateway signer, or gateway-provided owner field the verification authority.
Authority is determined separately for the exact name.

## Current Authority Algorithm

Constants on Ethereum mainnet:

```text
ENS Registry:    0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
Base Registrar: 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85
Name Wrapper:   0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401
```

For normalized `name` and `node = namehash(name)`:

1. Read `ENSRegistry.owner(node)` at the evaluation block.
2. If the result is Name Wrapper:
   - read `NameWrapper.getData(uint256(node))`;
   - require nonzero wrapper owner;
   - require `now < wrapperExpiry`;
   - use the wrapper owner as authority;
   - set `authorityValidUntil = wrapperExpiry`;
   - for a wrapped `.eth` second-level name, also require the Base Registrar
     registration to be unexpired and take the earlier expiry.
3. Otherwise, if `name` is an unwrapped `.eth` second-level name:
   - read `BaseRegistrar.ownerOf(uint256(labelhash(label)))`;
   - require the registration to be unexpired;
   - use the registrant as authority;
   - set `authorityValidUntil = BaseRegistrar.nameExpires(tokenId)`.
4. Otherwise:
   - use `ENSRegistry.owner(node)` as exact-name authority;
   - no additional authority expiry exists unless ENS exposes one.
5. Reject zero or indeterminate authority.
6. Verify EOAs by ECDSA recovery and contracts by ERC-1271.

The algorithm is intentionally isolated. A future canonical registry can
replace this section without changing discovery, descriptors, claims, methods,
or results. A changed authority system uses a new EIP-712 domain.

## Subname Expiry Findings

### Unwrapped Subnames

ENS Registry records do not contain expiry. `setSubnodeOwner()` writes the child
owner independently. Base Registrar re-registration updates the `.eth`
second-level owner but does not recursively delete child Registry records.

Therefore:

```text
alice.eth expires
  does not automatically delete sub.alice.eth Registry ownership

alice.eth is re-registered
  does not automatically replace sub.alice.eth Registry ownership
```

The new `alice.eth` owner can replace the child through the parent-controlled
Registry path. Until then, the existing exact child owner remains the ENS
Registry owner.

Record verification follows exact-name ownership. It does not interpret parent
transfer or re-registration as transfer of an existing unwrapped child. This is
consistent with current Registry state and preserves delegated subnames.

### Wrapped Subnames

Name Wrapper stores owner, fuses, and expiry. Child expiry is capped by parent
wrapper expiry. A verifier always requires `now < wrapperExpiry`.

When an emancipated wrapped name expires, Name Wrapper exposes zero owner. A
parent-controlled expired name can retain an address in raw storage, but its
fuses reset and the parent can replace it. The explicit verifier expiry check
prevents either case from remaining verification authority after expiry.

### `.eth` Second-level Names

Base Registrar `ownerOf()` rejects an expired registration even during the
renewal grace period. Verification follows registration expiry, not availability
for re-registration. A proof stops verifying at `nameExpires(tokenId)`.

## Rejected Authority Sources

The following are not current ENS authority:

- resolver writer or delegate;
- approved resolver operator;
- profile manager;
- Universal Resolver implementation or proxy administrator;
- CCIP Read gateway signer;
- gateway-provided owner field;
- indexer result;
- parent owner for an exact child name;
- previous exact-name owner after transfer;
- expired wrapped or registered owner.

Future scoped delegation must be explicit. Resolver permissions are not
implicitly verification authority.

## EIP-712 Domain

Current Ethereum mainnet domain:

```text
name:              ENS Record Verification
version:           1
chainId:           1
verifyingContract: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
```

The verifying contract is domain separation. It does not execute verification
and no new contract is deployed.

## Required Test Matrix

| Case                                     | Expected authority/result                                    |
| ---------------------------------------- | ------------------------------------------------------------ |
| Unwrapped `.eth` second-level name       | Base Registrar registrant                                    |
| Registry manager differs from registrant | Manager signature rejected                                   |
| Registrar token transfers                | Previous registrant rejected                                 |
| Registration reaches expiry              | `expired`                                                    |
| Wrapped name                             | Exact wrapper owner                                          |
| Wrapped owner transfers                  | Previous wrapper owner rejected                              |
| Wrapped expiry reached                   | `expired` even if raw storage contains owner                 |
| Unwrapped subname                        | Exact ENS Registry owner                                     |
| Parent transfers                         | Existing exact child owner remains authority                 |
| Parent expires and is re-registered      | Existing exact child Registry owner remains until replaced   |
| Imported DNS name                        | Exact ENS Registry owner; DNS ownership not implied          |
| CCIP Read record                         | Gateway data validated by resolver; gateway is not authority |
| Contract authority                       | ERC-1271 decides signature validity                          |
| Zero owner                               | `unsupported_authority`                                      |

## Source Evidence

- ENSIP-23 defines Universal Resolver as the common resolution entrypoint.
- `ENSRegistry.setSubnodeOwner()` writes a child owner without an expiry field.
- `BaseRegistrar.ownerOf()` rejects names at registration expiry.
- Base Registrar re-registration updates only the `.eth` second-level Registry
  owner.
- `NameWrapper.getData()` exposes owner, fuses, and expiry.
- Name Wrapper normalizes child expiry to parent expiry.
