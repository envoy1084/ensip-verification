# Proof Lifecycle, Expiry, Revocation, And Cache Bounds

This document gives the final lifecycle model behind the normative draft. It
supersedes the earlier options analysis in this file.

## Core Rule

A proof is not a permanent certificate. A positive result exists only while all
of these statements agree:

```text
live target record
AND live verification descriptor
AND current exact-name authority
AND current method evidence
AND every applicable time and revocation condition
```

Changing any one input invalidates or shortens the result. A cached historical
proof can help performance, but it cannot establish current verification by
itself.

## Evaluation Snapshot

The target record and verification descriptor are resolved for the exact DNS
name through the Universal Resolver at the same block reference. Authority
contract reads use that reference wherever the underlying call supports it.

If the evaluation block is no longer canonical before the result is consumed,
the client discards the result and repeats evaluation. Applications choose a
confirmation policy appropriate to their risk; the base protocol does not
pretend that an unconfirmed block is final.

External HTTPS and DNS systems cannot be atomically snapshotted with Ethereum.
`checkedAt` records when those checks completed. This is a distributed
consistency limit, not something a nonce can solve.

## Validity Predicate

For evaluation time `now`, a verifier produces a positive result only if:

1. `name` is normalized with the required ENS normalization profile and hashes
   to the claim's `node`.
2. The live target resolver bytes are present and hash to `valueHash`.
3. The live descriptor is present, valid, supported, and matches
   `authorityVersion` and `method`.
4. The method derives exactly the claim's canonical `target`.
5. `issuedAt <= now + allowedClockSkew`.
6. `validUntil > now`.
7. `validUntil - issuedAt` does not exceed the method's maximum lifetime.
8. The selected authority is current and unexpired under the signed authority
   algorithm.
9. The authority validates `authoritySignature` over the common claim digest.
10. All method-specific target evidence validates.
11. Every required issuer or revocation check succeeds.

`issuedAt` is a signer assertion. It is useful for limiting lifetime and
rejecting implausibly future-dated claims, but it is not an independent trusted
timestamp.

## Effective Validity

The positive result's semantic upper bound is the earliest applicable bound:

```text
effectiveValidUntil = min(
  claim.validUntil,
  exactAuthorityExpiry?,
  methodEvidenceExpiry?,
  issuerAttestationExpiry?,
  revocationStatusNextUpdate?
)
```

An absent optional bound is omitted, not treated as infinity if the method
requires it. If a required expiry or status value cannot be obtained, the
result is not positive.

Examples:

- An emancipated wrapped child has `claim.validUntil` in 30 days but wrapper
  expiry in 4 days. The result expires in 4 days.
- An unwrapped `.eth` second-level name has registrar expiry tomorrow. A
  month-long signature does not survive tomorrow.
- An HTTPS proof has no independent signed expiry. Its result is still limited
  by the claim, authority, live publication freshness, and cache policy.
- A future issuer profile with `nextUpdate` in one hour cannot be cached as
  positive beyond that hour.

## Authority Lifecycle

Authority is checked against current ENS state, not the signer identity captured
when the proof was created.

### Transfer

If an exact name transfers from Alice to Bob, Alice's old signature fails the
current-authority check immediately after the transfer becomes canonical. Bob
must publish a new proof. If Alice later reacquires the name before her old
claim expires, that old proof can become valid again because the common claim
does not bind an ownership generation. P0-021 remains open.

### Unwrapped subname and parent expiry

Suppose `team.alice.eth` is an unwrapped Registry subname owned by Carol. The
parent `alice.eth` expires and is later registered by Dave. ENS Registry storage
still identifies Carol as the exact child owner until Dave replaces that child.
Algorithm 1 therefore continues to select Carol. Treating Dave as the automatic
child owner would contradict the current ENS Registry state and break delegated
subnames. Whether Carol should remain accepted after the ancestor registration
changes is unresolved in P0-001.

### Wrapped subname

An emancipated wrapped child exposes an ownership expiry. At or after that
expiry, the stored owner is not accepted. A parent-controlled wrapped child is
different: its expiry resets fuses but does not clear its owner, so that value
is not an authority-expiry bound. For a wrapped `.eth` second-level name itself,
Base Registrar expiry is enforced instead of the wrapper's grace-inclusive
expiry.

### Offchain or wildcard record without exact authority

A gateway or wildcard resolver can answer a record without supplying
authenticated exact-name ownership. The verifier returns
`unsupported_authority`; it does not treat the gateway signer, resolver writer,
or parent owner as equivalent authority.

## ENS-side Revocation

The immediate common revocation mechanism is ENS publication state:

- deleting the verification descriptor disables verification;
- changing `a`, `m`, or `u` invalidates the previous publication;
- changing the target record invalidates `valueHash`;
- transferring the exact name changes the accepted signer;
- expiry invalidates the applicable authority.

This makes a global nonce or revocation registry unnecessary for the first
version. A nonce in a signed claim has no effect unless verifiers share mutable
“already consumed” state, which this protocol deliberately does not require.

Method profiles may add revocation only when their evidence system needs it.
For example, a future issuer profile may require an online status endpoint. If
that endpoint is required and unavailable, the verifier returns
`revocation_unavailable`, not a stale positive result.

## Proof Publication Classes

### Live publication

HTTPS and DNS proofs demonstrate current publication at a target-controlled
location. Their presence is rechecked. HTTP cache headers and DNS TTLs can
shorten cache lifetime but cannot extend the signed or authority validity.

### Portable signed proof

Authority and account signatures are portable bytes. They remain usable only
while the live ENS record, descriptor, current authority, and signed time bounds
still match.

### Issuer-revocable proof

A future issuer method can require status checks. Its profile must specify
fail-open versus fail-closed behavior; a security-sensitive normative profile
should normally fail closed.

## Cache Model

Two bounds must not be confused:

- `effectiveValidUntil`: when the proof can no longer be semantically valid;
- `cacheUntil`: when this particular evaluation may be reused without another
  check.

For a positive result:

```text
cacheUntil = min(
  effectiveValidUntil,
  ENS record cache bound,
  ENS descriptor cache bound,
  authority-state cache bound,
  method maximum freshness,
  HTTP freshness?,
  DNS TTL?,
  revocation nextUpdate?,
  client policy bound
)
```

No transport cache directive can extend `effectiveValidUntil`. `no-store`
prevents persistent proof-body storage but does not prevent returning the result
for the current evaluation.

Negative results have separate, usually shorter bounds:

| Error class                                   | Caching guidance                                                |
| --------------------------------------------- | --------------------------------------------------------------- |
| Invalid syntax/signature                      | Cache until relevant ENS data changes, within policy cap        |
| Missing proof or temporary resolution failure | Short negative cache only                                       |
| Privacy blocked                               | Cache only for the current policy context                       |
| Unsupported capability                        | Cache until client capability changes                           |
| Revoked                                       | Follow status/profile bounds; never convert to positive offline |

High-risk actions should revalidate even before `cacheUntil`. A cache is an
optimization and a portable cache contract, not a guarantee that the world has
not changed.

## Proof Resource Rotation

The ENS descriptor does not hash the proof resource. Renewing a signed envelope
at a deterministic HTTPS location therefore does not require an ENS update.
The verifier still accepts only an envelope whose complete claim and method
evidence validate against live ENS state.

Content-addressed locations behave differently: new proof bytes produce a new
CID and therefore require updating descriptor `u`. For the DNS method, the
DNSSEC-authenticated TXT record carries the proof URI and hash, so the domain
can rotate both without an ENS transaction.

## Rotation Examples

### Renewing an unchanged URL proof

1. Create a new claim with a later `issuedAt` and `validUntil`.
2. Sign it with the current exact-name authority.
3. Publish it at the deterministic HTTPS `proofKey` path.
4. Verify from an independent client before the old cache bound ends.

### Changing the record target

The new resolver bytes create a new `valueHash`, canonical target, common claim
digest, and usually target evidence. The `proofKey` remains selector-and-method
specific, so the deterministic location can be replaced, but no old claim can
validate the new live bytes.

### Transferring the ENS name

The new authority must re-sign. Keeping the same record and proof body does not
preserve verification because authority is evaluated live.

## Result Metadata

A positive result should expose at least:

```ts
{
  status: "verified",
  relationship: "authorization" | "control" | "attestation",
  method: string,
  validUntil: number,
  checkedAt: number,
  cacheUntil: number
}
```

Debug metadata may record evaluation block, authority source, target evidence,
HTTP/DNS freshness, and issuer status. Such metadata explains the result; it
must not create additional public trust states.

## Final Recommendation

Use short, method-bounded signed lifetimes; re-check live ENS publication and
current exact authority; make deletion and change explicit revocation paths;
compute the earliest semantic and cache bounds; and fail closed when required
evidence is unavailable. Do not add a nonce or global revocation contract until
a concrete use case supplies the state and semantics needed to make it real.
