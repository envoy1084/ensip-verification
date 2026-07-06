# Proof Lifecycle, Expiry, Revocation, And Cache Bounds

This note recommends the lifecycle model for ENS Resolver Record Verification.
It is a research recommendation for P0-002 in `research/14-issues.md`.

The core question is:

```text
When does a previously valid proof stop being valid?
```

## Recommendation

Treat verification as a live evaluation, not as a permanent credential.

A client may return `verified` only if all required live inputs still match at
verification time:

```text
verified at time T =
  live ENS record still matches
  + live verification descriptor still selects the method/proof
  + current ENS authority still verifies the signature
  + target proof or attestation still verifies
  + no required revocation check fails
  + T is before every applicable expiry
```

The best rule is:

```text
effectiveValidUntil = earliest applicable expiry
```

where applicable expiries include:

- `claim.validUntil`;
- external target-proof expiry, if the method has one;
- issuer-attestation expiry, if the method has one;
- `.eth` registration expiry;
- wrapped-name expiry;
- method-defined proof expiry.

`verified.validUntil` should be the effective validity bound, not merely the
signed claim's `validUntil`.

## Decision Criteria

The lifecycle model should optimize for:

1. **Fast revocation**: changing ENS records, deleting descriptors, transferring
   names, or removing live target proofs should stop positive verification.
2. **Short stale window**: caches should improve performance without becoming
   the trust root.
3. **Method flexibility**: HTTPS, DNS, address signatures, content manifests, and
   issuer attestations have different proof freshness needs.
4. **Simple public status**: keep `verified` and `none`; put expiry, cache, and
   revocation details in metadata/debug output.
5. **Implementation consistency**: SDKs need one common validity predicate, not
   method-by-method reinvention.

## Validity Predicate

At time `T`, a proof is valid only if every check below passes.

### 1. Live Target Record Check

The verifier resolves the current target resolver record and computes
`valueHash` from the exact live resolver bytes.

The proof fails if:

- target record is missing;
- target record is malformed for its resolver profile;
- computed `valueHash` differs from `claim.valueHash`.

This is the main invalidation path for resolver record changes.

### 2. Live Verification Descriptor Check

The verifier resolves the current verification descriptor for the exact target
record.

The proof fails if:

- descriptor is missing or empty;
- descriptor is invalid;
- descriptor method `m` no longer matches `claim.method`;
- descriptor `u`, when required by the method, no longer points to the selected
  proof resource;
- descriptor `h`, when present, does not match the fetched proof bytes.

Deleting the descriptor is sufficient ENS-side revocation. Changing the method,
`u`, or `h` also stops the old proof from being selected.

### 3. Current ENS Authority Check

The verifier resolves the current ENS authority under the current ENS mainnet
authority rules and verifies the authority signature.

The proof fails if:

- authority cannot be determined;
- authority is zero;
- ECDSA recovery does not equal the current authority;
- ERC-1271 returns invalid;
- name transfer, wrapper transfer, name expiry, or authority change means the
  signer is no longer current authority.

### 4. Target Proof Or Attestation Check

The method validates the external proof.

For direct control methods, this may mean:

- HTTPS origin still serves the proof;
- DNS TXT still publishes the proof;
- service account proof surface still publishes the proof;
- target account signature validates;
- content root still contains the manifest.

For attestation methods, this means:

- issuer signature validates;
- issuer profile is supported;
- trust policy accepts the issuer;
- required revocation check passes.

### 5. Expiry Check

The verifier computes:

```text
effectiveValidUntil = min(
  claim.validUntil,
  authorityValidUntil,
  targetProofValidUntil,
  issuerAttestationValidUntil,
  methodValidUntil
)
```

Ignore any bound that does not apply. If only `claim.validUntil` applies, it is
the effective validity bound.

Recommended timestamp rule:

```text
valid only if now < effectiveValidUntil
```

At `now >= effectiveValidUntil`, verification returns `none/expired`.

### 6. Revocation Check

Revocation depends on where the proof's authority comes from:

| Revocation source         | How revocation happens                                        |
| ------------------------- | ------------------------------------------------------------- |
| ENS-side opt-in           | Delete or change the verification descriptor.                 |
| Live resolver value       | Change or remove the target resolver record.                  |
| Current ENS authority     | Transfer, unwrap/rewrap, expiry, or authority change.         |
| Live target proof         | Remove or change HTTPS/DNS/service proof publication.         |
| Portable target signature | No live revocation unless method defines one; rely on expiry. |
| Issuer attestation        | Issuer revocation status or attestation expiry.               |
| Content manifest          | Content root change or manifest mismatch.                     |

The base ENSIP should not define a global revocation registry. Revocation is
live-state based for ENS and method-specific for external proofs.

## Proof Freshness Classes

Method profiles should declare one proof freshness class.

### Class A: Live Publication Proof

The target proves control by currently publishing proof material.

Examples:

- `https-origin`;
- `dns-txt`;
- GitHub raw-file style `service-account`;
- domain-level email proof.

Rule:

```text
current publication required
```

If the proof disappears or no longer matches, verification returns `none`.

Caching can reduce fetches, but the cache should be short-lived because removing
the proof is the target-side revocation mechanism.

### Class B: Portable Signed Proof

The proof is a portable signature or content-addressed object. It can be stored,
mirrored, or cached without relying on current publication at the original URL.

Examples:

- target-account signature proof;
- content-addressed proof resource;
- proof resource pinned by descriptor `h`, when the method allows cached bytes.

Rule:

```text
cached proof bytes may be reused if integrity is pinned and all live ENS checks pass
```

Revocation is mainly expiry, live ENS invalidation, or a method-defined
revocation mechanism.

### Class C: Issuer-Revocable Proof

The proof is signed by an issuer and may require live revocation status.

Examples:

- `issuer-attestation`;
- mailbox-level email attestation.

Rule:

```text
issuer signature + trust policy + revocation status required
```

If revocation status is required but unavailable, fail closed. The method should
map the failure to `proof_missing`, `proof_invalid`, or `revoked`.

## Cache Model

Separate these caches:

| Cache             | What it stores                      | Trust role                                             |
| ----------------- | ----------------------------------- | ------------------------------------------------------ |
| Resolver cache    | ENS resolver values and descriptors | Hint only unless cryptographically verified and fresh. |
| Authority cache   | Current ENS authority lookup        | Hint only for positive results.                        |
| Proof bytes cache | External proof resource bytes       | Usable only within method freshness rules.             |
| Revocation cache  | Issuer or method revocation status  | Usable until revocation freshness expires.             |
| Result cache      | Final `verified` or `none` result   | Low-risk display optimization only.                    |

### Positive Result Cache Bound

For a cached positive result:

```text
cacheUntil = min(
  effectiveValidUntil,
  checkedAt + clientPositiveCacheMaxAge,
  liveEnsFreshUntil,
  proofFreshUntil,
  revocationFreshUntil
)
```

The result must not be reused after `cacheUntil`.

Recommended SDK defaults:

| Context                                                  | Positive cache max age                                  |
| -------------------------------------------------------- | ------------------------------------------------------- |
| Passive profile display                                  | 15 minutes                                              |
| User-triggered verification refresh                      | Revalidate now                                          |
| Payment, sign-in, transaction, or security-sensitive use | Revalidate now                                          |
| Indexer batch cache                                      | Store as hint; clients revalidate before high-trust use |

These are product defaults, not proof lifetime. Proof lifetime is still bounded
by `effectiveValidUntil`.

### Negative Result Cache Bound

Negative results should be cached for a shorter time because users may fix
configuration quickly.

Recommended SDK defaults:

| Error class             | Negative cache max age                     |
| ----------------------- | ------------------------------------------ |
| `not_configured`        | 5 minutes                                  |
| `proof_missing`         | 5 minutes                                  |
| `privacy_blocked`       | Until user changes privacy mode            |
| `unsupported_method`    | Until client capability changes            |
| `unsupported_authority` | 5 minutes or until authority state changes |
| `expired`               | Until the descriptor or proof changes      |

### HTTP And DNS TTLs

HTTP cache headers and DNS TTLs are freshness hints, not proof validity.

Rules:

- A response cache TTL must not extend beyond `effectiveValidUntil`.
- A method profile may cap HTTP/DNS freshness even if the response advertises a
  long TTL.
- DNS TTL should not make a DNS proof valid after `claim.validUntil`.
- For live-publication proofs, long cache headers should not defeat revocation by
  removal.

Recommended cap for live-publication proof freshness:

```text
proofFreshUntil <= checkedAt + 15 minutes
```

Method profiles may choose a shorter cap.

## Descriptor `h` And Lifecycle

`h` is an integrity pin, not an expiry.

If descriptor `h` is present:

```text
keccak256(proofResourceBytes) MUST equal h
```

Lifecycle effects:

- Changing `h` revokes the previously selected proof bytes.
- Removing `h` changes the selected descriptor semantics and should require
  revalidation.
- If proof bytes are cached and `h` matches, the bytes can be reused when the
  method allows portable/pinned proof caching.

Best first-release rule:

```text
Do not require h globally.
Each method profile declares whether h is ignored, optional, recommended, or required.
```

Why not require `h` globally?

- Default `https-origin` uses a deterministic same-origin well-known URL and
  current publication.
- DNS TXT often carries the proof or pointer itself.
- Some methods rely on live revocation and should not turn every proof into a
  portable pinned object.

Why recommend or require `h` for some methods?

- Mutable issuer URLs can change without an audit trail.
- Mutable service-account URLs can move to a different branch/ref.
- Indexers need stable bytes for reproducible verification.

## Result Metadata

The public result can stay small, but verifier internals should track lifecycle
metadata.

Recommended positive result:

```ts
{
  status: "verified",
  kind: "control" | "attestation",
  method: string,
  name: string,
  node: `0x${string}`,
  recordType: string,
  recordKey: string,
  target: string,
  validUntil: number,
  checkedAt: number,
  cacheUntil: number
}
```

Recommended debug metadata:

```ts
{
  expiry: {
    claim?: number,
    authority?: number,
    targetProof?: number,
    issuerAttestation?: number,
    method?: number,
    effective: number
  },
  freshness: {
    liveEnsFreshUntil?: number,
    proofFreshUntil?: number,
    revocationFreshUntil?: number,
    cacheUntil: number
  },
  revocation: {
    checked: boolean,
    checkedAt?: number,
    status?: "not_revoked" | "revoked" | "unknown"
  }
}
```

If the public result remains unchanged, SDKs should still keep this metadata
internally for cache correctness and debugging.

## Options Considered

### Option A: Long-Lived Signed Claims Only

Model:

```text
If the signature is valid and claim.validUntil is in the future, return verified.
```

Good:

- Simple.
- Works offline after the proof is fetched.

Bad:

- Target cannot revoke by removing the proof.
- ENS descriptor deletion has weak effect if clients cache old proof state.
- Stale proofs can survive resolver changes unless every client rechecks live
  value.

Decision:

Reject. Too stale for a record-verification standard.

### Option B: Descriptor-Level Expiry

Model:

```text
Add expiry to the ENS descriptor.
```

Good:

- Indexers can see rough expiry without fetching proof.
- Wallets can avoid fetching obviously stale proofs.

Bad:

- Creates two expiry sources: descriptor and signed claim.
- Requires resolver writes just to renew cache metadata.
- Descriptor expiry is not signed by the target proof.
- A stale descriptor expiry can mislead clients if the proof itself expired or
  was revoked.

Decision:

Reject for P0. Consider a future non-authoritative cache hint only.

### Option C: Always Revalidate Everything Live

Model:

```text
Every display fetches live ENS state and live target proof.
```

Good:

- Strongest freshness.
- Simple mental model.
- Removal revocation works quickly.

Bad:

- Bad wallet/profile performance.
- Privacy leaks on every render.
- Expensive for indexers and profile pages.
- Some proof types are portable and do not need live publication checks.

Decision:

Use for high-trust actions, but not as the only allowed mode.

### Option D: Earliest Expiry Plus Freshness-Bounded Caching

Model:

```text
verified is live-state based;
cache is allowed only until the earliest validity/freshness bound.
```

Good:

- Preserves revocation.
- Allows performant passive UI.
- Lets methods choose proof freshness classes.
- Keeps public result simple.

Bad:

- More implementation work.
- Requires SDKs to track `checkedAt`, `cacheUntil`, and debug expiry sources.

Decision:

Adopt.

### Option E: Global Revocation Registry

Model:

```text
Every proof has a nonce and a revocation registry.
```

Good:

- Explicit revocation.
- Easy to query if standardized.

Bad:

- Adds new infrastructure.
- Forces all methods into one revocation model.
- Privacy and gas costs.
- Not needed for records already revoked by live ENS or live target publication.

Decision:

Reject for first release. Use method-specific revocation only.

## Recommended Spec Changes

### 1. Add A Lifecycle Section To The Base ENSIP

The lifecycle section should define:

- live target record binding;
- live verification descriptor binding;
- current ENS authority binding;
- earliest-expiry rule;
- ENS-side revocation through descriptor deletion/change;
- target-side revocation through method-specific proof failure;
- cache bounds.

### 2. Define `effectiveValidUntil`

Normative rule:

```text
A positive result MUST NOT outlive the earliest applicable expiry.
```

The returned positive result's `validUntil` should be the effective validity
bound.

### 3. Define `cacheUntil`

Normative rule:

```text
Cached positive results MUST NOT be reused after cacheUntil.
```

Recommended:

```text
cacheUntil = min(effectiveValidUntil, freshness bounds)
```

### 4. Define Proof Freshness Classes For Method Profiles

Each method profile should declare one of:

- `live-publication`;
- `portable-signed`;
- `issuer-revocable`;
- method-specific hybrid.

### 5. Make Descriptor Deletion A Clear Revocation Path

Normative rule:

```text
If the verification descriptor is absent, empty, invalid, or no longer selects
the proof method, clients MUST NOT return verified for the old proof.
```

### 6. Clarify Timestamp Semantics

Normative rule:

```text
validUntil is the first Unix timestamp at which the claim is invalid.
Clients MUST require now < validUntil.
```

This avoids mixed `>= now` and `> now` implementations.

## Method Profile Requirements

Every method profile should define:

- proof freshness class;
- proof expiry source, if any;
- whether target-side removal revokes the proof;
- whether descriptor `h` is ignored, optional, recommended, or required;
- whether cached proof bytes may be used;
- revocation check requirements;
- revocation failure behavior;
- maximum positive cache age for that method;
- whether HTTP/DNS cache headers are honored and capped.

## Failure Matrix

| Event                                                | Expected result                                       |
| ---------------------------------------------------- | ----------------------------------------------------- |
| Target resolver value changes                        | `none/value_mismatch`                                 |
| Target resolver record removed                       | `none/record_missing`                                 |
| Verification descriptor removed                      | `none/not_configured`                                 |
| Descriptor malformed                                 | `none/invalid_descriptor`                             |
| Descriptor method changed to unsupported method      | `none/unsupported_method`                             |
| Descriptor `h` mismatch                              | `none/proof_invalid`                                  |
| Authority changes                                    | `none/authority_mismatch` or `none/signature_invalid` |
| Name expires                                         | `none/expired` or `none/unsupported_authority`        |
| Claim expires                                        | `none/expired`                                        |
| External proof expires                               | `none/expired`                                        |
| Live-publication proof disappears                    | `none/proof_missing`                                  |
| Live-publication proof changes and no longer matches | `none/proof_invalid` or method-specific mismatch      |
| Issuer revokes attestation                           | `none/revoked`                                        |
| Required revocation status unavailable               | fail closed under method policy                       |
| Cache is older than `cacheUntil`                     | revalidate before returning `verified`                |
| Fetch blocked by privacy mode                        | `none/privacy_blocked`                                |

## Cross-Questions

### Why not rely only on `claim.validUntil`?

Because the ENS record, current authority, and target proof can change before the
claim expires. `claim.validUntil` is only one bound.

### Why not add descriptor-level expiry?

It helps discovery, but it creates another expiry source and requires onchain
writes for renewal. It is better as a future cache hint, not a P0 validity rule.

### Should deleting the descriptor revoke verification?

Yes. The descriptor is ENS-side opt-in and method selection. If it is gone, the
old proof is no longer advertised by the current ENS name state.

### Can clients use cached proof bytes?

Yes, if the method allows it and the cache is inside `cacheUntil`. For
portable-signed or integrity-pinned proofs, cached bytes are often acceptable.
For live-publication proofs, cached bytes should be short-lived because removal
is the revocation path.

### Should indexers return `verified`?

Indexers may return cached verification results as hints, but clients should
revalidate live ENS state and freshness before high-trust use. An indexer result
must include `checkedAt`, `validUntil`, and `cacheUntil` to be useful.

### Does `h` make revocation harder?

It can. If a method treats `h`-pinned bytes as portable proof, removing the
original URL may not revoke the proof. That is fine for portable-signed methods,
but wrong for methods where current publication is the proof. Method profiles
must declare the freshness class.

## Best Current Answer

Adopt this lifecycle model:

```text
1. Verification is live-state based.
2. Descriptor deletion/change is ENS-side revocation.
3. Resolver value change invalidates through valueHash.
4. Authority change invalidates through current-authority check.
5. Target proof removal/change invalidates under method rules.
6. Issuer revocation is method-specific and fail-closed when required.
7. Positive results expire at the earliest applicable expiry.
8. Cached positives expire at the earlier of validity expiry and freshness bounds.
9. High-trust actions revalidate now.
10. Public status remains verified/none.
```

This gives strong revocation semantics without adding a global revocation
registry or making every proof fetch mandatory on every passive profile render.
