# Open Questions and Evaluation Checklist

This file lists decisions that should be resolved before turning the research
into final ENSIP text.

## Open Questions

### 1. Who Is the ENS Verification Authority?

Defaulting to owner or wrapped owner is safest and easiest to revalidate after
transfer. It may be too strict for delegated profile managers. Accepting resolver
writers is convenient but may over-trust operational permissions.

Recommended direction:

- owner or wrapped owner signs by default;
- scoped delegates are explicitly authorized;
- resolver writer status alone is not enough for high-trust verification.

Decision needed:

- exact delegation record format;
- whether delegation is onchain, offchain, or either;
- whether delegates can verify all records or only scoped claim classes.

### 2. Should the Sidecar Be Required?

Sidecars provide ENS-side opt-in and digest binding. Target-only proofs reduce
gas and are easier for some records.

Recommended direction:

- sidecar required for `bidirectional` verified status;
- target-only proofs can return `target-controlled` or a weaker status;
- optional manifest improves discovery.

### 3. How Should Canonical Claims Be Encoded?

JSON is readable but risky unless canonicalization is fully specified. EIP-712
is wallet-friendly for EVM signatures but less natural for non-EVM target
proofs.

Recommended direction:

- use EIP-712 for ENS authority signatures;
- define canonical byte encodings for claim hashes;
- include JSON examples only as examples;
- keep method evidence formats separate.

### 4. How Much Should the Base ENSIP Standardize?

Too little standardization causes fragmented methods. Too much delays adoption
and forces weak common denominators.

Recommended direction:

- base ENSIP: envelope, sidecar, authority, expiry, result semantics, method
  registry rules;
- initial method ENSIPs: web-origin HTTPS/DNS, EVM address signatures;
- later method ENSIPs: social protocols, VC/EAS attestations, non-EVM address
  signatures.

### 5. How Should Social Platforms Be Handled?

Some platforms support public proof discovery. Others require APIs, OAuth, or
screen scraping. A generic ENSIP cannot guarantee stable access to every
platform.

Recommended direction:

- prefer public, independently fetchable proofs;
- require stable account IDs where available;
- classify API-gated methods as provider-mediated;
- do not put platform-specific methods in the base required set.

### 6. What Does Address Verification Mean?

For a cryptocurrency address, a signature proves account control. It does not
prove the address should receive every payment, belongs to a legal person, or is
free from sanctions or abuse.

Recommended direction:

- label as account-control verification;
- keep safety and compliance checks separate;
- allow unverified addresses to resolve normally;
- support contract-account validation.

### 7. How Should Contenthash Be Labeled?

Contenthash values are already integrity-addressed. The missing property is
current ENS endorsement or publisher authorship.

Recommended direction:

- use `ens-authorized` for current owner signature over contenthash;
- use a separate publisher-signature method when content includes a manifest;
- never label contenthash as safe solely because it is verified.

### 8. How Should Revocation Work?

Deleting a sidecar is enough for ENS-side revocation, but target-side proofs can
remain cached. Third-party attestations have their own revocation models.

Recommended direction:

- expiry is mandatory;
- sidecar deletion or record change invalidates verification;
- target method revocation must be method-specific;
- indexers must expose last checked time and expiry.

### 9. What Governance Controls Method Names?

A method registry prevents collisions, but a heavily governed registry can slow
experimentation.

Recommended direction:

- method names include version suffixes, such as `https-well-known@1`;
- base ENSIP defines registration criteria;
- experimental methods use a reserved prefix;
- clients choose which methods they trust.

### 10. How Should UI Avoid Overclaiming?

The protocol can return precise states, but apps may still render a generic
checkmark.

Recommended direction:

- normative language should forbid presenting record-control verification as
  safety, legal ownership, or endorsement;
- SDK result labels should make misuse harder;
- examples should show distinct UI copy for control, attestation, and safety.

## Evaluation Checklist for Any Proposed ENSIP

Use this checklist before accepting a design decision:

- Does the proof bind to a normalized ENS name and node?
- Does it bind to chain ID and registry?
- Does it bind to the exact record selector?
- Does it bind to the canonical record value?
- Does live ENS resolution need to match the claim?
- Does the verifier check current owner or wrapped owner?
- Can delegated authority be audited and scoped?
- Does the target evidence prove the right target authority?
- Does the method handle stale target ownership?
- Is expiry mandatory?
- Is replay across names, records, targets, chains, and methods prevented?
- Can clients verify without a central API for the base method?
- Are unsupported methods distinguishable from invalid proofs?
- Is caching bounded by all relevant expiry and TTL values?
- Are privacy leaks documented?
- Does UI language avoid implying safety or legal identity?
- Can future record types plug in without changing the base envelope?

## Suggested ENSIP Work Plan

1. Rename the current URL-only draft into a method draft, not the base standard.
2. Write a base `ENSVERIFY1` ENSIP covering claims, sidecars, proof envelope,
   authority, delegation, expiry, and result semantics.
3. Write `https-well-known@1` and `dns-txt@1` as the first method profile.
4. Write `evm-eip712@1` and `evm-erc1271@1` as address method profiles.
5. Build a reference verifier with test vectors for canonical claims.
6. Add optional manifest support after the sidecar model is stable.
7. Add social methods only after each platform's stable target authority is
   clear.

## Sources

- [ENS records](https://docs.ens.domains/web/records/)
- [EIP-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)
- [EIP-1577: contenthash field for ENS](https://eips.ethereum.org/EIPS/eip-1577)
- [EIP-2304: Multicoin support for ENS](https://eips.ethereum.org/EIPS/eip-2304)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [RFC 8555: ACME](https://datatracker.ietf.org/doc/html/rfc8555)
- [W3C DID Core](https://www.w3.org/TR/did-core/)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
- [Ethereum Attestation Service documentation](https://docs.attest.org/docs/welcome)

