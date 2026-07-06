# Current Architecture Review

This note reviews the architecture package currently in the repository without
modifying the architecture files themselves. The package under review is:

- `README.md`
- `ensip-x-resolver-record-verification.md`
- `method-https-origin.md`
- `method-dns-txt.md`
- `method-service-account.md`
- `method-addr-account-signature.md`
- `method-contenthash-manifest.md`
- `method-email-records.md`
- `method-agent-records.md`
- `method-issuer-attestation.md`
- `schemas/ens-record-verification-proof.schema.json`
- `sdk-verifier-checklist.md`
- `REFERENCES.md`

## Executive Summary

The architecture is a base ENSIP plus method-profile package.

The base ENSIP standardizes the shared verification kernel:

- verification discovery keys;
- compact descriptor parsing;
- method identifiers;
- raw live resolver-value hashing;
- common EIP-712 signed claim fields;
- optional common JSON proof envelope;
- ENS mainnet current-authority rules;
- a two-status result model;
- method-profile requirements.

The method profiles define the external proof mechanics:

- `https-origin` for HTTPS URL and agent endpoint origins;
- `dns-txt` for DNS host or domain control;
- `service-account` for public service accounts, with a GitHub profile;
- `account-signature` for `addr` records with target-account signatures;
- `content-manifest` for manifests inside content roots;
- `email-domain` and `email-attestation` for domain-level and mailbox-level
  email records;
- `issuer-attestation` for policy-bound third-party attestations;
- agent-record guidance that reuses the text-record methods.

This is substantially better than a URL-only or category-based standard. It
uses ENS resolver record classes as the organizing model and leaves target
semantics to method profiles. The main risks are complexity, authority edge
cases, underspecified method governance, no delegation model, and proof-fetching
privacy.

## What The Architecture Is

### Discovery Model

Every verified claim starts with an existing ENS resolver record:

```text
text(node, <text-key>)
addr(node, <coinType>)
contenthash(node)
data(node, <data-key>)
```

The matching verification descriptor is stored as an ENSIP-5 text record:

```text
verification[text][<text-key>]
verification[addr][<coinType>]
verification[contenthash]
verification[data][<data-key>]
```

This is an important correction from category-based designs. URL, social,
email, description, avatar, and agent endpoint records are all text records, so
they remain under `verification[text][...]`.

The bracket rule is also improved. Text keys may contain `[` or `]`. Parsers do
not recursively match brackets; they check the prefix and final `]`, then treat
the substring as the text key. This allows keys such as:

```text
agent-endpoint[mcp]
verification[text][agent-endpoint[mcp]]
```

### Descriptor Model

The ENS-side value is a compact descriptor, not JSON:

```text
ensrv1 m=<method> [u=<uri>] [h=<hash>] [extension=value ...]
```

Examples:

```text
ensrv1 m=https-origin
ensrv1 m=account-signature u=ipfs://bafy.../proof.json
ensrv1 m=issuer-attestation u=https://issuer.example/a/123 h=0x...
```

Design decisions encoded here:

- no `method=none`;
- no descriptor-level `kind`;
- no descriptor-level `expiry`;
- one advertised method per descriptor;
- unknown fields are ignored after duplicate-field validation;
- `u` points to a proof resource when the method needs one;
- `h` optionally pins the exact proof-resource bytes.

This is cleaner than the older semicolon format because the version token and
fields are visually small and wallet/profile-manager friendly.

### Method Identifiers

Method identifiers match:

```text
[a-z0-9][a-z0-9.-]{0,63}
```

Undotted identifiers are intended for ENSIP-accepted method profiles.
Reverse-DNS/dotted identifiers are available for experiments such as:

```text
com.example.custom-proof
```

The current standard methods are not versioned in the method string. Versioning
is carried by the descriptor token `ensrv1` and method-profile evolution.

### Live Value Hashing

The architecture intentionally separates raw resolver-value binding from
method-specific target canonicalization.

`valueHash` is always:

```text
keccak256(raw live resolver value bytes)
```

Inputs:

| Record type   | Hash input                                                      |
| ------------- | --------------------------------------------------------------- |
| `text`        | Exact UTF-8 bytes returned by `text(node, key)`.                |
| `addr`        | Native binary address bytes returned by `addr(node, coinType)`. |
| `contenthash` | Raw `contenthash` bytes.                                        |
| `data`        | Exact bytes returned by `data(node, key)`.                      |

This is a strong design choice. URL normalization, email normalization, social
handle normalization, CAIP strings, content URI decoding, and display address
formatting do not change the base hash. They only affect the method-defined
`target`.

### Common Signed Claim

Methods that need an ENS-authority signature use a common EIP-712 claim:

```solidity
ENSRecordVerification(
  string name,
  bytes32 node,
  string recordType,
  string recordKey,
  bytes32 valueHash,
  string method,
  string target,
  uint64 validUntil,
  bytes32 nonce
)
```

This claim binds:

- normalized ENS name;
- namehash;
- record class and key;
- exact live resolver value hash;
- method;
- canonical external target;
- expiry;
- nonce.

For ENS on Ethereum mainnet, the EIP-712 domain uses the ENS registry as
`verifyingContract`.

### Proof Envelope

The architecture allows JSON proof resources, but the JSON serialization itself
is not signed. The signed object is the EIP-712 claim.

Common envelope:

```json
{
  "v": "ensrv1",
  "proofs": [
    {
      "claim": {},
      "authority": {},
      "targetProof": {}
    }
  ]
}
```

This is a compromise between no common envelope and one mandatory proof object.
The envelope gives SDKs a predictable shape, while method profiles still define
the contents and validation of `targetProof`.

### Current ENS Authority

For ENS on Ethereum mainnet, the authority rules are:

1. Wrapped name: Name Wrapper owner, with wrapper expiry bound.
2. Unwrapped `.eth` second-level name: Base Registrar registrant, with
   registration expiry bound.
3. Other unwrapped names: ENS Registry owner.
4. EOA authority: ECDSA EIP-712 verification.
5. Contract authority: ERC-1271 verification.

This is stricter than accepting any resolver writer. It is designed to prevent a
proof from surviving `.eth` registration transfer while an old resolver manager
or stale resolver record remains in place.

### Result Model

Only two public statuses exist:

```ts
"verified" | "none";
```

A positive result includes:

```ts
"control" | "attestation";
```

Failures are error codes on `none`, such as:

```text
not_configured
invalid_descriptor
unsupported_method
unsupported_authority
record_missing
proof_missing
proof_invalid
target_mismatch
value_mismatch
signature_invalid
authority_mismatch
expired
revoked
privacy_blocked
```

This avoids the earlier mistake of turning every failure mode into a user-facing
trust state.

## End-To-End Flow

For any target record, an SDK roughly does this:

1. Normalize the ENS name.
2. Compute the node.
3. Resolve the live target record from the current resolver.
4. Hash the exact live value into `valueHash`.
5. Construct the verification text key from the target record.
6. Resolve the compact descriptor.
7. If missing or empty, return `none/not_configured`.
8. Parse `ensrv1 m=...`.
9. Dispatch to the method profile.
10. Derive the method target from the live value.
11. Fetch or query method-specific proof material.
12. Validate common claim fields against live ENS state.
13. Resolve the current ENS authority.
14. Verify the authority signature with ECDSA or ERC-1271.
15. Verify target-side proof or issuer attestation.
16. Enforce expiry, revocation, and method-specific freshness.
17. Return `verified/control`, `verified/attestation`, or `none/<error>`.

## What Is Good

### 1. ENS record-class layout is correct

The design follows ENS resolver classes instead of product categories:

```text
verification[text][url]
verification[text][com.github]
verification[text][email]
verification[addr][60]
verification[contenthash]
```

This avoids hardcoding URL, social, email, avatar, and agent categories at the
base layer.

### 2. The descriptor is small enough for ENS text records

Keeping the onchain value to:

```text
ensrv1 m=<method> [u=<uri>] [h=<hash>]
```

is practical. Large JSON, signatures, and attestations live offchain.

### 3. `method=none` was removed

Absence or empty value means no advertised proof. That is simpler than adding an
explicit no-proof method that clients must parse and explain.

### 4. `kind` was removed from the descriptor

The method profile determines whether success is `control` or `attestation`.
That avoids user-controlled descriptor values pretending that an issuer claim is
a control proof.

### 5. Expiry moved into signed claims and attestations

Descriptor-level expiry could diverge from proof-level expiry. The new model
puts validity where the cryptographic or issuer claim lives.

### 6. Raw resolver-value hashing is strong

Hashing the exact live resolver value prevents hidden changes. For example, with
`https-origin`, the target is only the origin, but `valueHash` still binds the
full URL including path and query.

### 7. The common EIP-712 claim is readable

Explicit `recordType` and `recordKey` fields are easier to review in wallets
than a delimiter-packed record string.

### 8. ENS authority rules are more realistic

Binding unwrapped `.eth` second-level names to the Base Registrar registrant is
a good security decision. It avoids treating stale resolver managers as proof
authorities after registration transfer.

### 9. Address verification requires target-account proof

This fixes an important flaw in simpler designs. An ENS owner should not be able
to set `addr(60)` to a random wallet and verify it using only the ENS owner's
signature.

### 10. Email semantics are split correctly

`email-domain` and `email-attestation` answer different questions. Domain
control does not prove mailbox control, and the architecture now states that.

### 11. Contenthash proof is scoped carefully

`content-manifest` verifies that the manifest is inside the content root. It
does not pretend that content addressing proves safety or authorship.

### 12. Agent records fit naturally

Agent records remain ENSIP-5 text records. Endpoint records can reuse
`https-origin`, and inline context is not forced into an external verification
badge.

### 13. The SDK checklist is implementable

The checklist gives concrete parsing, fetching, hashing, authority, result, UI,
and regression-test requirements. That makes the design much easier to turn into
software.

## What Is Bad Or Risky

### 1. Delegation is out of scope but operationally important

The architecture intentionally excludes a generic delegated-verifier system.
That keeps the first release smaller, but many real ENS names are managed by teams,
multisigs, profile managers, custody systems, or smart-account policies.

Without delegation, verification setup may require the registrant/wrapped owner
to sign every record proof directly.

### 2. Current-authority rules need implementation proof

The ENS mainnet authority rules are plausible, but they must be checked against
real wrapper expiry behavior, manager behavior, approved operators, subnames,
CCIP Read resolver responses, and imported DNS names.

Clients need to return `unsupported_authority` consistently rather than
accidentally accepting weak proofs from resolver writers, gateway response
fields, or indexers.

### 3. One descriptor means one advertised method

A descriptor advertises only one method. This simplifies parsing, but it limits
multi-method claims.

Examples where multiple methods could be useful:

- `url` verified by both HTTPS origin and DNS TXT;
- `email` verified by both domain control and mailbox attestation;
- `addr` verified by both target signature and issuer attestation.

The current answer is to let methods define fallback behavior or have users
choose one descriptor. That may be too limiting for wallets that want layered
assurance.

### 4. Proof validity is invisible until fetch

No descriptor-level expiry means indexers and wallets must fetch the proof to
know whether it is expired. This is cleaner cryptographically but worse for
cheap discovery and profile rendering.

The design may need an optional cache-hint field that is explicitly non-
authoritative, or indexers must accept that proof fetching is required.

### 5. Method versioning is unclear

The descriptor version is `ensrv1`, but method identifiers such as
`https-origin` do not carry a version. If a method changes incompatibly, the
standard needs a clear answer:

- create `https-origin2`;
- use dotted profiles;
- rely on ENSIP revision history;
- add method-profile version metadata somewhere else.

### 6. `h` is optional even for mutable proof URIs

For HTTPS proof resources, an optional `h` makes sense when the proof is not at
a deterministic well-known location. But for mutable `u` fields, omitting `h`
means the URI content can change. That may be acceptable because the signed
claim is still verified, but it weakens byte-level auditability and indexer
stability.

### 7. JSON parser requirements exceed JSON Schema

The base spec says clients must reject duplicate JSON object keys in
verification objects. JSON Schema cannot enforce that by itself. SDKs need a
parser-level duplicate-key check before schema validation.

The schema also allows additional properties and uppercase hex, while some
descriptor fields require lowercase. That is not fatal, but it means the schema
is only a loose structural check.

### 8. `service-account` can overclaim account control

The GitHub profile verifies the ability to publish a raw file under a login and
repository path. It may not prove sole control of the login. Repository
collaborators, organization permissions, branch mutability, and account
compromise all matter.

The method says this, but UI and trust policy must be strict.

### 9. DNS without DNSSEC has weaker assurance

`dns-txt` can return `verified/control` without DNSSEC under the ordinary DNS
trust model. That is practical, but wallets should expose DNSSEC assurance
separately and avoid making unsigned DNS look equivalent to cryptographic DNSSEC
validation.

### 10. `content-manifest` has a bootstrapping problem

The manifest signs the final contenthash, but adding the manifest changes the
contenthash. The document describes possible flows, but production tooling is
required or users will get this wrong.

### 11. `issuer-attestation` is powerful but underspecified

The profile intentionally leaves issuer trust policy out of the base ENSIP. That
is correct architecturally, but it also means two clients can return different
results for the same proof. This is acceptable only if UI always shows issuer
context and policy source.

### 12. Privacy is a first-class risk

Verifying records can fetch:

- websites;
- DNS names;
- GitHub raw files;
- IPFS gateways;
- issuer endpoints;
- agent endpoints or context resources.

Those fetches reveal user interest. The architecture includes
`privacy_blocked`, but product defaults need stronger guidance.

### 13. `data` records are reserved before method maturity

Including `verification[data][<data-key>]` is forward-looking. It is useful, but
it also expands the base ENSIP surface before real method profiles exist for
arbitrary data records.

### 14. Error code boundaries may be inconsistent

Some examples return `unsupported_method` where `not_configured` or
`unsupported_record_type` might also fit. SDKs need a stricter error taxonomy so
different clients do not make the same failure look different.

## What Can Be Improved

### 1. Add a non-normative authority test matrix

Before changing the architecture, build a table for:

- wrapped `.eth`;
- unwrapped `.eth`;
- subnames;
- DNS-imported names;
- registry owner contracts;
- Name Wrapper fuses and expiry;
- resolver managers;
- approved operators;
- CCIP Read resolver responses.

For each case, define current authority, signature path, expiry bound, and
expected failure code.

### 2. Decide whether the first release needs scoped delegation

If delegation stays out of scope, say explicitly that the first release is
owner-only except for ERC-1271 contract policy. If delegation moves in, keep it narrowly
scoped:

```text
delegate authorized for name + recordType + recordKey + method + validUntil
```

Avoid broad "can verify anything for this name" delegation by default.

### 3. Define method profile versioning before adoption

Pick one approach:

- method identifiers are immutable and new incompatible methods get new names;
- method identifiers include versions;
- method profile documents have a stable version field that clients check.

Do this before multiple wallets implement `https-origin` differently.

### 4. Strengthen `h` guidance for mutable `u`

Recommended rule:

- `h` optional for content-addressed URIs;
- `h` recommended or required for mutable HTTPS issuer and service-account
  proof URIs;
- `h` not used for deterministic same-origin `https-origin` unless a method
  variant allows custom proof URLs.

### 5. Add proof-fetch privacy profiles

Define product modes:

- strict local only;
- fetch on user action;
- fetch through trusted cache;
- fetch through privacy proxy;
- indexer hint plus live revalidation for sensitive actions.

Make `privacy_blocked` a normal result, not an exceptional failure.

### 6. Tighten the JSON proof schema

The schema should remain permissive for extension, but the SDK checklist should
separate:

- duplicate-key rejection;
- schema validation;
- method-specific validation;
- signature validation.

It may also need stricter hex casing where the spec requires lowercase.

### 7. Add test vectors early

The package currently describes test vector shape but does not include vectors.
Add vectors for:

- descriptor parsing;
- bracketed text keys;
- duplicate fields;
- duplicate JSON keys;
- raw `valueHash` for text, addr, and contenthash;
- EIP-712 digest;
- ERC-1271 happy path and failure;
- `.eth` transfer invalidation;
- expired proof;
- `h` mismatch;
- unsupported authority.

### 8. Separate assurance metadata from verification status

For example:

```json
{
  "status": "verified",
  "kind": "control",
  "method": "dns-txt",
  "assurance": ["dnssec"]
}
```

This avoids creating more public statuses while still letting clients distinguish
ordinary DNS from DNSSEC-backed DNS.

### 9. Add a multi-method story

Possible options:

- allow only one descriptor in the first release and treat layering as future work;
- define a method that points to a method bundle;
- allow extension fields that list alternate proof descriptors;
- define deterministic priority rules for multiple verification records.

The simplest first-release answer may be "one descriptor only", but the limitation should
be called out.

### 10. Define UI wording per method in a table

Each method should include allowed UI wording and forbidden wording. The current
docs do this in prose; a table would make wallet implementation safer.

### 11. Clarify result metadata for attestations

For `issuer-attestation`, positive results should always include:

- issuer id;
- issuer display name;
- issuer profile;
- trust policy source;
- revocation checked at;
- attestation expiry.

Otherwise users cannot distinguish issuer-backed verification from direct
control proof.

### 12. Make `service-account` profiles more explicit

For GitHub, specify whether `<ref>` should be:

- a branch;
- a tag;
- a commit SHA;
- any ref if `h` pins the bytes.

Without this, a mutable branch plus no descriptor hash makes auditability weaker.

## Verdict

The architecture is directionally strong. Its best decisions are:

- record-class discovery;
- compact ENS-side descriptors;
- raw live-value hashing;
- common EIP-712 claim fields;
- current-authority binding;
- minimal `verified`/`none` status;
- method profiles for external proof complexity.

The largest issues to resolve before finalizing are:

- authority and delegation;
- method versioning;
- multi-method support;
- proof-resource integrity for mutable URIs;
- privacy defaults;
- issuer trust UX;
- concrete test vectors.

The architecture should not be rewritten back into URL/social/email categories.
The right next step is to harden this base-plus-method-profile model.
