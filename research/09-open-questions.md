# Open Questions and Evaluation Checklist

This file tracks decisions for the current base-ENSIP-plus-method-profiles
architecture. The architecture files themselves should remain unchanged while
these questions are evaluated.

## Decisions Reflected By The Current Architecture

The current package resolves several earlier open questions:

| Area                    | Current decision                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discovery namespace     | Use resolver record classes: `verification[text][<key>]`, `verification[addr][<coinType>]`, `verification[contenthash]`, and reserved `verification[data][<key>]`. |
| ENS-side value          | Use compact descriptors: `ensrv1 m=<method> [u=<uri>] [h=<hash>]`.                                                                                                 |
| No-proof state          | No `method=none`; absent or empty descriptor means `none/not_configured`.                                                                                          |
| Result model            | Public status is only `verified` or `none`; positive results carry `control` or `attestation`.                                                                     |
| Descriptor expiry       | No descriptor-level expiry; expiry lives in signed claims, external proofs, or attestations.                                                                       |
| Descriptor kind         | No descriptor-level `kind`; the method profile determines result kind.                                                                                             |
| Value binding           | `valueHash` is always the hash of exact live resolver bytes. Method canonicalization affects `target`, not `valueHash`.                                            |
| Authority signature     | Methods that need ENS-side consent use a common EIP-712 claim unless a stronger method-specific replacement is defined.                                            |
| JSON proof body         | JSON may use a common proof envelope, but the signed object is the EIP-712 claim, not the JSON serialization.                                                      |
| Text keys with brackets | Supported by prefix plus final-`]` parsing, not recursive bracket matching.                                                                                        |
| Address records         | `account-signature` requires target-account proof, not only ENS-authority proof.                                                                                   |
| Email records           | Domain control and mailbox control are separate methods.                                                                                                           |

## Remaining Open Questions

### 1. Are The Current ENS Authority Rules Exactly Right?

The current profile uses:

- Name Wrapper owner for wrapped names;
- Base Registrar registrant for unwrapped `.eth` second-level names;
- ENS Registry owner for other unwrapped names;
- ECDSA for EOA authorities;
- ERC-1271 for contract authorities.

This is a strong default, but it needs an implementation matrix for wrapped
names, subnames, DNS-imported names, approved operators, resolver managers, and
CCIP Read resolver responses.

Decision needed:

- whether any manager/controller role can ever be accepted;
- how wrapper expiry is read and bounded;
- whether unsupported authority should always return `none/unsupported_authority`.

### 2. Does The First Release Need Delegation?

Delegation is out of scope in the current base ENSIP. That keeps the first
release smaller but may hurt real users with multisigs, DAO-owned names, profile
managers, custody systems, and smart accounts.

Decision needed:

- keep the first release owner-only except ERC-1271 contract policy; or
- add scoped delegation for `name + recordType + recordKey + method + expiry`.

### 3. How Should Method Versioning Work?

The descriptor is versioned as `ensrv1`, but methods are named
`https-origin`, `dns-txt`, `service-account`, and so on. If a method changes
incompatibly, the package needs a stable migration rule.

Decision needed:

- method names are immutable and incompatible versions get new names;
- method names include versions;
- method profile documents have separate version metadata that clients check.

### 4. Is One Advertised Method Per Descriptor Enough?

The descriptor advertises one method. This is simple, but some records may want
multiple proofs:

- URL verified by both HTTPS origin and DNS TXT;
- email verified by both domain control and mailbox attestation;
- addr verified by account signature and issuer attestation.

Decision needed:

- accept one method in the first release;
- define a future method-bundle profile;
- allow multiple descriptor records;
- add an optional index manifest for layered proofs.

### 5. Should Mutable Proof URIs Require `h`?

The descriptor `h` field pins exact proof-resource bytes. It is optional. That
is reasonable for content-addressed URIs, but mutable HTTPS proof URIs can
change over time.

Decision needed:

- require `h` for mutable issuer and service-account proof URIs;
- recommend `h` but let methods decide;
- keep `h` optional everywhere because signatures already bind claims.

### 6. How Strong Should DNS Assurance Be?

`dns-txt` may return `verified/control` without DNSSEC under ordinary DNS
resolution assumptions. DNSSEC is recommended and can produce assurance
metadata.

Decision needed:

- whether unsigned DNS TXT can produce `verified/control`;
- whether DNSSEC should change only metadata, not status;
- how UI should distinguish DNSSEC-backed proofs from ordinary DNS proofs.

### 7. How Should Service Account Profiles Avoid Overclaiming?

The GitHub profile proves control over a raw file under a login and repository
path. It may not prove sole control of the login because collaborators,
organizations, branches, and mutable refs exist.

Decision needed:

- whether GitHub proofs should require commit SHA refs or descriptor `h`;
- whether organization repositories need different UI wording;
- whether service profiles need stable account IDs beyond usernames.

### 8. Is The Common Proof Envelope Too Loose?

The schema permits additional properties and cannot itself reject duplicate JSON
keys. The spec requires duplicate-key rejection in verification objects.

Decision needed:

- parser requirements before schema validation;
- exact casing rules for hex strings;
- method-specific schema extension pattern;
- whether unknown proof fields should be retained for audit logs.

### 9. How Should Issuer Trust Policy Be Represented?

`issuer-attestation` intentionally leaves trust policy to clients. This is
correct but means clients may disagree on the same proof.

Decision needed:

- required result metadata for issuer id, profile, trust-policy source, and
  revocation check time;
- whether unknown issuers return `unsupported_method`, `proof_invalid`, or a
  distinct error code such as `issuer_untrusted`;
- how UI distinguishes attested claims from direct control proofs.

### 10. What Are The Privacy Defaults?

Verification can fetch websites, DNS records, GitHub raw files, content roots,
issuer endpoints, and agent proof resources. Fetches leak interest in names and
records.

Decision needed:

- default wallet fetch behavior;
- whether sensitive records require user opt-in;
- how indexer hints can be used without becoming trust roots;
- when to return `privacy_blocked`.

### 11. Should `data` Records Be In The First Release?

`verification[data][<data-key>]` is reserved for arbitrary byte-data records.
This is future-proof but expands the base namespace before method profiles
exist.

Decision needed:

- keep `data` reserved in the base;
- move it to a future extension;
- define one concrete data-record method before including it.

### 12. Are Error Codes Specific Enough?

The package defines useful errors, but boundaries can blur between:

- `not_configured`;
- `unsupported_method`;
- `unsupported_record_type`;
- `proof_missing`;
- `proof_invalid`;
- `target_mismatch`;
- `value_mismatch`;
- `signature_invalid`;
- `authority_mismatch`.

Decision needed:

- a normative error precedence order;
- SDK regression tests for each failure;
- method-specific mappings that do not diverge across clients.

## Evaluation Checklist

Use this checklist before accepting a design decision:

- Does the proof bind to normalized ENS name and node?
- Does it bind to the correct ENS deployment and authority rule set?
- Does it bind to the exact resolver record class and key?
- Is `valueHash` computed from exact live resolver bytes?
- Is method-specific `target` canonicalization deterministic?
- Does the verifier re-read live ENS state or use cryptographically verified
  resolution?
- Does current ENS authority validation handle EOAs and ERC-1271 contracts?
- Does the target proof prove the correct external authority?
- Does the proof expire?
- Is replay across names, records, values, targets, methods, and chains blocked?
- Are transfer, expiry, authority change, resolver change, and record change invalidated?
- Are unsupported methods distinguishable from invalid proofs?
- Are duplicate descriptor fields and duplicate JSON keys rejected?
- Are proof-fetch limits defined?
- Are privacy leaks documented?
- Does UI language avoid safety, endorsement, legal ownership, and anti-phishing
  claims?
- Can future methods be added without changing the discovery namespace?
- Can indexers cache results without becoming authoritative?
- Are method-profile names collision-resistant?

## Suggested Next Work

1. Build an authority-rule test matrix before modifying the base ENSIP.
2. Decide whether the first release remains owner-only or includes scoped delegation.
3. Define method versioning and collision policy.
4. Decide whether mutable `u` proof resources require descriptor `h`.
5. Add test vectors for descriptor parsing, bracketed text keys, EIP-712 digest,
   ERC-1271 validation, proof-resource hash mismatch, expired proofs, and ENS
   transfer invalidation.
6. Define privacy modes for SDKs and wallets.
7. Add required attestation result metadata for issuer-backed verification.
8. Revisit multi-method support only after the single-method first release is implementable.

## Sources

- [ENS records](https://docs.ens.domains/web/records/)
- [ENSIP-5: Text Records](https://docs.ens.domains/ensip/5/)
- [ENSIP-7: Contenthash Records](https://docs.ens.domains/ensip/7/)
- [ENSIP-9: Multicoin Address Resolution](https://docs.ens.domains/ensip/9/)
- [ENSIP-12: Avatar Text Records](https://docs.ens.domains/ensip/12/)
- [ENSIP-18: Profile Text Records](https://docs.ens.domains/ensip/18/)
- [ENSIP-24: Data Records](https://docs.ens.domains/ensip/24/)
- [ENSIP-25: AI Agent Registry ENS Name Verification](https://docs.ens.domains/ensip/25/)
- [ENSIP-26: Agent Text Records](https://docs.ens.domains/ensip/26/)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [RFC 8615: Well-Known URIs](https://datatracker.ietf.org/doc/html/rfc8615)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
