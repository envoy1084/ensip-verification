# Layered Native Verification Model

This is the revised architecture recommendation after re-questioning the
singleton assumption. A global singleton verification object is not the best fit
for ENS record verification. The current package implements the better target:
a base ENSIP with compact per-record descriptors plus method profiles for
external proof mechanics.

## Recommendation

Do not force all records into one singleton proof envelope.

Instead, define:

1. a small base ENSIP for verification keys, descriptor parsing, method
   identifiers, live-value hashing, current-authority discovery, common EIP-712
   claim fields, expiry, cache rules, and result states;
2. method profiles for native evidence, such as `https-origin`, `dns-txt`,
   `service-account`, `account-signature`, `content-manifest`,
   `email-domain`, `email-attestation`, and `issuer-attestation`;
3. optional issuer attestations for provider-mediated cases;
4. deterministic ENSIP-5 descriptor records for method discovery.

The base standard should be a contract between verifiers and UIs, not a
one-size-fits-all proof format.

Another way to state the architecture is: verification kernel plus method
profiles. The kernel is shared; proof validation remains native.

Current descriptor shape:

```text
ensrv1 m=<method> [u=<uri>] [h=<hash>]
```

Current discovery keys:

```text
verification[text][<key>]
verification[addr][<coinType>]
verification[contenthash]
verification[data][<key>]
```

## Why a Singleton Is Too Constraining

A singleton sounds clean because every verified record could share one envelope,
one sidecar key, one digest format, and one method registry. That simplicity is
mostly for the protocol author, not for real integrations.

Problems:

- OAuth social verification naturally produces provider tokens or provider
  attestations, not public target-side files.
- DNSSEC and HTTPS proofs are native to domains and URLs, but awkward for
  addresses.
- EVM address verification already has native primitives: EIP-712 for EOAs and
  ERC-1271 for contract accounts.
- Contenthash verification is partly redundant with content addressing; the
  missing properties are current ENS endorsement, publisher signature, or safety
  attestation.
- Future record profiles may have their own resolver functions, account
  standards, or offchain resolver semantics.
- A universal canonical claim format can become a bottleneck if every new method
  needs central changes.

The useful shared layer is not the proof envelope. It is the verification
contract: what counts as live ENS agreement, who can authorize, how expiry and
revocation work, and what result states mean.

## Ethereum-Native Base Layer

The base ENSIP should stay close to existing Ethereum and ENS patterns:

| Concern                      | Recommended Native Primitive                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| ENS record lookup            | Resolver interfaces and Universal Resolver.                                          |
| ENS authority                | Registry owner, Name Wrapper owner, or explicit scoped delegate.                     |
| EVM signatures               | EIP-712 typed data.                                                                  |
| Contract accounts            | ERC-1271 signature validation.                                                       |
| EIP-712 introspection        | ERC-5267 where a verification contract or attestation schema uses an EIP-712 domain. |
| Offchain resolver data       | ERC-3668/CCIP-Read validation model, when resolvers use offchain data.               |
| Address-to-name relationship | Forward-confirmed reverse resolution pattern from ERC-181 and ENS primary names.     |
| Third-party claims           | Ethereum Attestation Service or compatible attestation systems as optional methods.  |

This keeps verification aligned with how Ethereum developers already think:
typed signatures, contract-account validation, resolver profiles, attestations,
and explicit delegation.

## Base ENSIP Scope

The base ENSIP should define only what every method must share:

- normalized ENS name and node are part of the verification context;
- chain ID and registry are part of the verification context;
- live resolver data must still match the value being verified;
- the current ENS authority must authorize the relationship when the method
  claims ENS-side consent;
- proofs must be time-bounded unless the method is explicitly live-only;
- positive cache lifetime is bounded by proof expiry, resolver data freshness,
  method-specific TTLs, and revocation state;
- clients must return `verified` or `none` as public statuses, with failure
  reasons as error codes;
- UIs must not present control verification as safety, legal ownership, or ENS
  endorsement.

This base layer can also define a small common result object for SDKs:

```json
{
  "status": "verified",
  "kind": "control",
  "method": "https-origin",
  "name": "alice.eth",
  "recordType": "text",
  "recordKey": "url",
  "target": "example.com",
  "validUntil": 1790812800
}
```

That result object is for interoperability. It does not require every method to
put the same external evidence in the same format.

Public result states:

| State      | Meaning                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `verified` | A supported method validated live ENS state, current authority, live value hash, expiry, and target proof or trusted attestation. |
| `none`     | No positive result was produced. The optional error code explains why.                                                            |

Positive results carry `kind = control` or `kind = attestation`.

## Method Profiles

Method profiles should be independent ENSIPs or sub-specifications. Each method
owns its canonicalization, evidence, failure modes, and replay boundaries.

| Profile              | Native Proof Shape                                                               | Why It Should Stay Native                                                   |
| -------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `https-origin`       | Well-known JSON file on the canonical HTTPS origin plus ENS-authority signature. | Origin control is a web security boundary.                                  |
| `dns-txt`            | DNS TXT proof, with DNSSEC assurance where available.                            | DNS has its own authenticated data model and TTLs.                          |
| `service-account`    | Service-specific public proof surface, currently GitHub raw-file proof.          | Social and service platforms have different account and publication models. |
| `account-signature`  | ENS-authority signature plus target-account signature.                           | Addresses need proof from the target account, not only the ENS owner.       |
| `content-manifest`   | Manifest inside the content root.                                                | Content-root publication must be verified inside the content system.        |
| `email-domain`       | DNS proof for the email domain.                                                  | Domain control and mailbox control are different claims.                    |
| `email-attestation`  | Trusted issuer attestation for mailbox control.                                  | Mailbox proof is usually private or provider-mediated.                      |
| `issuer-attestation` | Issuer-signed claim with revocation and client trust policy.                     | Third-party trust is useful but issuer-specific.                            |

## Optional ENS-Side Records

The current package standardizes one discovery mode first: per-record ENSIP-5
verification descriptor records.

Additional discovery modes can be layered later:

| Mode                         | Example                                                          | Use When                                           |
| ---------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| ENS descriptor               | `verification[text][url] = ensrv1 m=https-origin`                | Current v1 discovery and explicit ENS-side opt-in. |
| Resolver-native verification | Future resolver interface or CCIP-Read resolver response.        | Resolver can return typed verification data.       |
| Optional index manifest      | Future text record or data record listing available descriptors. | Profile pages need enumeration or batching.        |

The descriptor remains the current trust entry point. A future manifest should
help discovery, not replace live method verification.

When a method profile uses an ENSIP-5 descriptor record, it should follow ENSIP
text-key practice: lowercase global-key style prefix, bracketed parameters for
deterministic lookup, explicit parameter grammar, example keys, and clear value
semantics.

## Delegation

Delegation should be explicit and scoped.

Recommended model:

- owner or wrapped owner is the default ENS verification authority;
- a delegate can be authorized for specific record classes, methods, and expiry;
- delegation can be onchain, resolver-native, or EIP-712 signed, depending on
  the profile;
- clients must reject broad or expired delegation for high-trust states.

Why this is more Ethereum-native than a singleton:

- contract wallets can express policy through ERC-1271;
- smart-account owners can rotate keys without changing every method;
- offchain resolvers can validate delegated data through CCIP-Read;
- method profiles can choose whether delegation is acceptable.

## Social Verification and OAuth

OAuth is not a public proof system. It is an authorization framework where a
user grants a client limited access to a provider. That means OAuth-based ENS
verification needs an issuer:

1. user signs into the provider through OAuth or OpenID Connect;
2. verifier receives the provider account ID and handle;
3. user signs an ENS authorization message with their wallet, or the verifier
   checks an ENS-side authorization;
4. verifier publishes an attestation with issuer, provider, stable account ID,
   handle, ENS name, expiry, and revocation rules.

This is not part of the current base method set. The current package uses
`service-account` for public account proof surfaces and `issuer-attestation` for
provider-mediated claims.

## URL Verification

URL verification can stay close to the existing draft because web origins have
clear native control boundaries:

- HTTPS proof at `/.well-known/...` for exact-origin control;
- DNS TXT proof for host control;
- DNSSEC result state when validation is available;
- ENS-side descriptor for explicit current ENS opt-in and method dispatch.

This is a method profile. It should not define the architecture for all records.

## Address Verification

EVM address verification should be Ethereum-first:

- use EIP-712 typed data for EOAs;
- use ERC-1271 for contract accounts;
- include chain ID, verifying contract or domain, ENS registry, node, resolver
  record selector, canonical address, expiry, and nonce;
- publish a proof URI in the descriptor when the method needs an external proof
  resource.

For EVM addresses, the target-side proof is already a wallet or account
signature. DNS-style publication adds nothing.

## Contenthash Verification

Contenthash should not be forced into a bidirectional external-target model.
The contenthash itself already commits to content bytes. Verification should
state which extra property is being checked:

- current ENS authority selected this contenthash;
- publisher key signed a manifest for this content;
- a security service attested to a scan result;
- a gateway or DNS/IPNS name currently points to this content.

These are different method profiles with different trust assumptions.

## Architecture Decision

The revised architecture is:

```text
Base ENSIP:
  resolver-class verification keys, compact descriptors, live-value hashing,
  current authority, common claim fields, result states

Method ENSIPs:
  https-origin, dns-txt, service-account, account-signature,
  content-manifest, email-domain, email-attestation, issuer-attestation

SDK:
  one verifyEnsRecord() interface that dispatches to native method adapters

Optional discovery:
  per-record descriptor records now; profile manifests or resolver-native data
  later
```

This keeps developer ergonomics simple without forcing protocols into the same
proof shape. The singleton, if any, belongs in the SDK API and result semantics,
not in the proof architecture.

## What Changes From the Previous Recommendation

Previous recommendation:

- one generic `ENSVERIFY1` envelope;
- deterministic `verification[<claimHash>]` sidecar;
- method registry under the envelope.

Current recommendation:

- no mandatory signed JSON proof envelope;
- no category-specific verification keys such as `verification[url]`;
- deterministic per-record descriptor keys;
- base ENSIP defines common verification semantics;
- method profiles define native proof formats;
- descriptor records provide method discovery while proof bodies remain
  method-specific and usually offchain.

This is a better fit for Ethereum because Ethereum standards usually define
small interoperable primitives and let applications compose them.

## Sources

- [ENS resolution documentation](https://docs.ens.domains/resolution/)
- [ENSIP-1: ENS](https://docs.ens.domains/ensip/1/)
- [ENSIP-5: Text Records](https://docs.ens.domains/ensip/5/)
- [ENSIP-25: AI Agent Registry ENS Name Verification](https://docs.ens.domains/ensip/25/)
- [ENSIP-26: Agent Text Records](https://docs.ens.domains/ensip/26/)
- [ENS Universal Resolver](https://docs.ens.domains/resolvers/universal/)
- [ENS CCIP-Read documentation](https://docs.ens.domains/resolvers/ccip-read)
- [ERC-137: Ethereum Domain Name Service](https://eips.ethereum.org/EIPS/eip-137)
- [ERC-181: ENS reverse resolution](https://eips.ethereum.org/EIPS/eip-181)
- [ERC-3668: CCIP Read](https://eips.ethereum.org/EIPS/eip-3668)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [ERC-5267: Retrieval of EIP-712 domain](https://eips.ethereum.org/EIPS/eip-5267)
- [RFC 6749: OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 8615: Well-Known URIs](https://datatracker.ietf.org/doc/html/rfc8615)
- [Ethereum Attestation Service documentation](https://docs.attest.org/)
