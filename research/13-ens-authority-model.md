# ENS Authority Model

This note researches what should count as verification authority across current
ENS, wrapped names, offchain resolution, and the work-in-progress ENSv2
architecture.

## Conclusion

ENS does not expose one universal authority interface. Depending on the name,
there may be a Registry owner, `.eth` registrant, Name Wrapper owner, resolver
writer, registry role holder, wildcard resolver, gateway, or offchain namespace
controller. Those accounts do not all mean the same thing.

Record Verification should use this definition:

> Verification authority is the current owner of the exact ENS name under a
> registered authority profile.

The common protocol remains version-neutral. Authority computation does not.
The descriptor's `a` field selects an immutable adapter for a particular ENS
ownership architecture.

Conceptually:

```ts
type AuthorityResult = {
  profile: number;
  authority: address;
  authorityValidUntil?: bigint;
  source: "exact-name-owner";
};
```

The target record, descriptor, authority state, expiry, and contract-signature
call must use the same evaluation block.

The current result shape does not bind an ownership generation. An eventual
`authorityContext` may need to commit to that generation in a new common claim;
returning it from an adapter without signing it would not solve replay.

The descriptor cannot force an obsolete profile. A dispatcher first identifies
the live ownership system from trusted deployment and migration state, then
requires `a` to select an applicable profile. Ambiguous or dual-active state
fails closed.

## Ownership Is Not Record-writing Permission

The authority signature answers:

> Did the current exact-name owner approve this verification claim?

It does not answer:

> Which account wrote the resolver record?

These are intentionally separate. Current resolver operators and ENSv2
record-scoped role holders can edit records without owning the name. A CCIP Read
gateway can return resolver data without owning anything. Treating any of these
actors as authority would let infrastructure create the target record,
descriptor, and authority approval by itself.

An explicit verification delegate may be useful later, but it must have its own
scope and revocation rules. Generic resolver-writing permission is not enough.

## Current ENS Authority Profile

Authority Algorithm 1 is limited to the current ENS deployment on Ethereum
mainnet:

```text
ENS Registry:    0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
Base Registrar: 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85
Name Wrapper:   0xD4416b13d2b3a9Bae7AcD5D6C2BbDBE25686401
```

For normalized `name` and `node = namehash(name)`:

1. Read `ENSRegistry.owner(node)` at the evaluation block.
2. If the result is the Name Wrapper:
   - read `NameWrapper.getData(uint256(node))`;
   - require a nonzero exact wrapped owner;
   - for a wrapped `.eth` second-level name, require active Base Registrar
     registration owned by the Name Wrapper and use the registrar expiry;
   - for another wrapped name with `PARENT_CANNOT_CONTROL` burned, require
     active wrapper expiry and use that expiry;
   - otherwise use the wrapped owner without treating wrapper expiry as an
     ownership bound.
3. Otherwise, if `name` is an unwrapped `.eth` second-level name:
   - read `BaseRegistrar.nameExpires(uint256(labelhash(label)))`;
   - require the expiry to be after the evaluation block timestamp;
   - use `BaseRegistrar.ownerOf(uint256(labelhash(label)))`;
   - set the registrar expiry as `authorityValidUntil`.
4. Reject name classes not defined by Algorithm 1, including reverse namespace
   names.
5. Otherwise, use the nonzero exact `ENSRegistry.owner(node)`. The Registry
   exposes no generic expiry for that entry.
6. Reject zero or indeterminate authority.
7. Read authority code at the same block. With no code, require strict ECDSA
   recovery. With code, require an ERC-1271 `staticcall` to return the exact
   magic value and do not fall back to ECDSA.

The proof cannot supply the Registry, registrar, wrapper, or authority account.
These come from the profile's trusted deployment configuration and live state.

## Current Name Types

| Name type                                 | Selected authority              | Validity bound                          |
| ----------------------------------------- | ------------------------------- | --------------------------------------- |
| Normal unwrapped `.eth` second-level name | Base Registrar registrant       | Registrar expiry                        |
| Normal unwrapped subname                  | Exact Registry owner            | No generic Registry expiry              |
| Wrapped `.eth` second-level name          | Exact Name Wrapper owner        | Registrar expiry                        |
| Emancipated wrapped subname               | Exact Name Wrapper owner        | Exact wrapper expiry                    |
| Parent-controlled wrapped subname         | Exact Name Wrapper owner        | No ownership expiry exposed             |
| Imported DNS name                         | Registry or wrapper owner       | Rule for its current ENS state          |
| Exact name using CCIP Read                | Same exact owner as above       | Rule for its current ENS state          |
| Ownerless wildcard or offchain-only child | Unsupported                     | None                                    |
| Reverse namespace name                    | Unsupported by Algorithm 1      | Separate profile required               |
| Custom registrar held in Registry         | Registry's exact owner contract | No generic look-through to a registrant |

### `.eth` Second-level Names

For an unwrapped `.eth` name, the ENS Registry owner is a manager and can differ
from the Base Registrar registrant. The registrant is the durable ownership
source, so the manager is not verification authority.

`BaseRegistrar.ownerOf()` stops returning an owner at registration expiry, even
though the name remains renewable during grace. Verification authority ends at
the start of grace as a policy cutoff. Some stored resolver-management
permissions can continue to work and are not treated as authority.

A wrapped `.eth` token stores registrar expiry plus the grace period. That value
supports wrapper behavior during renewal grace; it is not the authority bound.
The verifier separately uses `BaseRegistrar.nameExpires()`.

### Unwrapped Subnames

The ENS Registry stores each child owner independently and has no expiry field.
If `alice.eth` expires or is re-registered, the stored owner of
`team.alice.eth` is not recursively deleted. The new parent owner can replace
the child, but until then the exact child owner remains current Registry state.

This behavior can be surprising, but substituting the new parent would also be
wrong: it would contradict live child ownership and break delegated subnames.
Whether the old child should remain accepted after parent re-registration is an
open issue. ENSv1 cannot bind a registration generation for every unwrapped
child without extra indexed state or a new authorization mechanism.

### Wrapped Subnames

The earlier rule "every wrapped name must be unexpired" was incorrect.

Name Wrapper gives expiry two different meanings:

- with `PARENT_CANNOT_CONTROL`, expiry ends the child's independent ownership;
- without `PARENT_CANNOT_CONTROL`, expiry resets fuses but does not clear the
  wrapped owner, because the parent already retains control.

Normal non-`.eth` names wrapped with `wrap()` initially have expiry `0` and no
`PARENT_CANNOT_CONTROL` fuse. Requiring every wrapped expiry to be in the future
would reject these valid wrapped names immediately.

`NameWrapper.getData()` clears the returned owner after expiry only for an
emancipated name. The authority adapter must inspect the fuse state instead of
giving every wrapper expiry the same meaning.

### Imported DNS Names

A DNS name imported into ENS receives ENS Registry ownership and follows the
normal wrapped or unwrapped rule. This proves approval by the current ENS owner;
it does not establish that the same account still controls DNS.

Gasless DNS resolution is different. A DNSSEC-controlled name can resolve
without an exact ENS owner. It needs a separate DNS authority profile rather
than pretending an Ethereum parent or gateway is authority.

### Reverse Names

Reverse names should not use the generic Registry-owner fallback. The Registry
owner can be a delegated manager, while the account encoded by the reverse label
retains the ability to reclaim the node. This resembles the `.eth`
registrant-manager split and requires a chain-aware rule for deriving the
underlying account.

Algorithm 1 therefore rejects every name at or below the `reverse` suffix. A
separate profile can define the label encoding, durable account authority, and
EOA or smart-account signature validation for each reverse namespace. The
current claim can represent only mainnet EVM accounts; other ENSIP-19 coin types
need a chain-qualified principal and validation rule.

### Custom Registrars

ENSIP-1 does not define a universal end-user registrant interface for arbitrary
registrars. If a custom registrar contract is the exact Registry owner,
Algorithm 1 selects that contract. It can authorize through ERC-1271 if it
implements the interface. Looking through it to an internal registrant requires
a separately registered authority profile.

## CCIP Read, Wildcards, And Offchain Names

ENSIP-10 wildcard resolution and EIP-3668 CCIP Read are record-resolution
mechanisms. They do not create exact-name ownership.

Two cases must be separated:

1. An exact onchain name uses a CCIP-enabled resolver. Authority remains the
   exact onchain owner.
2. A virtual child exists only because an ancestor resolver answers by wildcard.
   No exact authority exists under Algorithm 1, so verification returns
   `unsupported_authority`.

The verifier must not substitute:

- the ancestor owner;
- resolver writer or operator;
- wildcard resolver;
- CCIP gateway or gateway signer;
- address returned by the resolver;
- owner field supplied by offchain JSON.

A future L2 or offchain profile must bind at least:

- exact normalized name;
- chain or namespace identifier;
- trusted registry/controller system;
- exact owner and ownership generation;
- expiry;
- authenticated state root or signed database revision;
- finality policy;
- one revision used for record, descriptor, and authority.

The current common claim stores authority as an Ethereum `address` and uses an
EIP-712 domain. A genuinely non-EVM authority may need a new claim version as
well as a new authority profile.

Using one Ethereum evaluation block is also insufficient for multiple offchain
responses. An L2 profile needs one finalized state root, and a database profile
needs one provider-signed revision, shared by record, descriptor, and authority
reads. Each profile must state whether its trust root is Ethereum state, an L2
state proof, DNSSEC, or an operator attestation.

## ENSv2 Authority Research

ENSv2 is still work in progress. The current local checkout uses hierarchical
registries and is planned for Ethereum L1, not the earlier Namechain design.

### Ownership Model

The base `IRegistry` interface exposes only:

- `getSubregistry(label)`;
- `getResolver(label)`;
- `getParent()`.

Ownership and expiry are optional extensions:

- `IOwnedRegistry.findOwner(label)`;
- `ITemporalRegistry.findExpiry(label)`.

For `team.alice.eth`, traversal is:

```text
Root Registry
  -> getSubregistry("eth")
  -> getSubregistry("alice")
  -> findOwner("team")
```

The owner of the exact name is stored as the final label in its parent
registry. The subregistry attached to `team` controls names below
`team.alice.eth`; it does not define ownership of `team.alice.eth` itself.

The current `UniversalResolverV2.findOwner()` and `LibRegistry.findOwner()`
implement the basic root-down owner lookup. The returned address alone is not a
complete authority result: zero collapses unsupported, reserved, expired,
unreachable, and ownerless states, and the function does not return path expiry
or generation.

### Expiry

The standard `PermissionedRegistry` returns zero owner, resolver, and
subregistry when a label expires. An expired ancestor therefore makes the whole
descendant path unreachable. Each label's expiry is read from its parent
registry, so `team.alice.eth` uses:

```text
root.findExpiry("eth")
ethRegistry.findExpiry("alice")
aliceRegistry.findExpiry("team")
```

A future profile should cap authority validity at the earliest expiry on the
live path. It must register supported persistent and temporal registry
implementations rather than silently treating a missing temporal interface on
an unknown registry as infinite validity.

The ENSv2 `.eth` registrar's grace period is for renewal and re-registration
policy. It is not authority grace: the expired registry entry exposes no active
owner.

### Roles Are Not Authority

ENSv2 supports registry roles and resolver permissions as narrow as one record
key. These permissions may survive transfers and may be registry-wide.

The exact owner remains the baseline verification authority. A
`ROLE_SET_RESOLVER` holder, record-specific resolver role, operator, or resolver
owner is not accepted automatically.

### Shared Registry Aliases

One ENSv2 registry may deliberately be mounted under multiple names. Because
`getParent()` can describe only one canonical location,
`findCanonicalRegistry(name)` returns zero for other valid aliases.

The authority profile must verify reachability through the exact requested path
from the trusted root. It must not require that path to be the registry's one
canonical name. `getParent()` can describe a different valid alias and must not
be used as a security input for reconstructing the requested path.

### Migration

ENSv2 migration creates hybrid states. A premigrated `.eth` entry can be
reserved with owner zero while its resolver falls back to ENSv1. A similar
fallback exists for unmigrated wrapped children.

Therefore a record may resolve through the ENSv2 Universal Resolver while its
authority is still ENSv1. The live migration state decides which profile is
applicable:

- authenticated ENSv1 fallback state uses Algorithm 1;
- native ENSv2 ownership uses the future ENSv2 profile;
- a proof cannot force an obsolete profile simply by publishing its `a` value.

The final dispatcher must define how it recognizes native activation, which
system wins if both contain state, and when Algorithm 1 becomes inapplicable.

### Custom Registries

ENSv2 permits registries that do not implement the optional ownership or expiry
interfaces. A generic owner profile cannot safely interpret them. The correct
result is `unsupported_authority` until the namespace has a separately defined
profile.

## Architectural Assessment

Good properties of the profile design:

- the common verification protocol is not tied to ENSv1 or ENSv2;
- exact-name ownership preserves delegated subnames;
- owner approval is independent of resolver-writing permission;
- ERC-1271 keeps multisig and smart-account policy out of the protocol;
- unsupported namespaces fail closed;
- expiry can be returned by the authority adapter without changing methods.

Good ENSv2 properties:

- rooted traversal invalidates an expired or replaced subtree;
- native owner and expiry interfaces replace registrar/wrapper special cases;
- roles make ownership and operational permission explicit;
- the Universal Resolver hides most traversal complexity from applications.

Risks and limitations:

- current ENS has inconsistent ownership sources and no universal generation;
- unwrapped child state can outlive a registrable parent;
- wrapper expiry has context-dependent meaning;
- ENSv2 ownership and expiry interfaces are optional;
- shared registries break one-registry-one-name assumptions;
- role holders may survive transfer and surprise users;
- migration can be resolvable but ownerless from the ENSv2 view;
- an upgradeable Universal Resolver address does not freeze authority semantics;
- non-EVM and DNS authority do not fit the current `address` claim field.

## Open Problems

### Authority Resurrection

Alice can sign a proof, transfer the name to Bob, and later receive it back
before the proof expires. The old Alice signature can then become valid again
because the live authority address matches.

Possible responses:

- accept this behavior and keep method lifetimes short;
- add an authority epoch or nonce to the signed claim;
- bind to an indexed ownership-change event;
- add an explicit verification delegation/revocation record.

Neither current ENS nor the present ENSv2 owner lookup exposes one generation
that solves every transfer case. This remains open.

### Descendant Authority After Parent Re-registration

Algorithm 1 selects an exact unwrapped child owner even after a lease-bearing
ancestor expires and is registered by someone else. This matches current
Registry state but does not prove the new ancestor registration authorized the
old child.

Possible stricter policies are rejecting the child, requiring current ancestor
co-approval, requiring an emancipated wrapped name, or binding authenticated
ownership-event history. This remains open rather than a solved exact-owner
decision.

### Authority-profile Registry

The proposal still needs a registry or specification section for each `a`
value. A profile must freeze:

- supported chain and deployment;
- trusted roots and contracts;
- exact applicability test;
- owner and expiry algorithm;
- migration behavior;
- accepted signature validation;
- error behavior and test vectors.

### Delegation

If verification delegation is added, it should bind the exact name, record
type, record key, method, authority profile, validity, and revocation or
generation value. It should not reuse broad resolver operator approval.

## Source Evidence

Current ENS:

- [ENS Registry](https://docs.ens.domains/registry/ens/)
- [Name Wrapper expiry](https://docs.ens.domains/wrapper/expiry/)
- [CCIP Read resolvers](https://docs.ens.domains/resolvers/ccip-read/)
- [Universal Resolver](https://docs.ens.domains/resolvers/universal/)
- [ENSIP-10 wildcard resolution](../.repos/ensips/ensips/10.md)
- [ENSIP-17 gasless DNS resolution](../.repos/ensips/ensips/17.md)

ENSv2:

- [ENSv2 contracts overview](https://docs.ens.domains/contracts/ensv2/overview/)
- [ENSv2 architecture](https://ens.domains/blog/post/ensv2-architecture)
- [ENS is staying on Ethereum](https://ens.domains/blog/post/ens-staying-on-ethereum)
- [`IRegistry`](../.repos/contracts-v2/contracts/src/registry/interfaces/IRegistry.sol)
- [`IOwnedRegistry`](../.repos/contracts-v2/contracts/src/registry/interfaces/IOwnedRegistry.sol)
- [`ITemporalRegistry`](../.repos/contracts-v2/contracts/src/registry/interfaces/ITemporalRegistry.sol)
- [`LibRegistry`](../.repos/contracts-v2/contracts/src/universalResolver/libraries/LibRegistry.sol)
- [`PermissionedRegistry`](../.repos/contracts-v2/contracts/src/registry/PermissionedRegistry.sol)
- [`PermissionedResolver`](../.repos/contracts-v2/contracts/src/resolver/PermissionedResolver.sol)
- [`WrapperRegistry`](../.repos/contracts-v2/contracts/src/registry/WrapperRegistry.sol)
