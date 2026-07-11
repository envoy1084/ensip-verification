# Current Architecture Review

This review evaluates the architecture adopted by the normative ENS Resolver
Record Verification draft. It supersedes the earlier review in this file.
Protocol details live in `16-protocol-decisions.md`; unresolved work is tracked
in `14-issues.md`.

## Verdict

The proposal is useful and technically defensible if it is presented narrowly:
it proves a relationship between the current ENS authority, an exact live ENS
record, and optional target-side evidence. It does not prove that a target is
safe, official, reputable, or legally owned.

The strongest part of the design is its separation of concerns:

```text
Universal Resolver record reads
  -> versioned exact-name authority
    -> strict common claim
      -> method-specific target evidence
```

This keeps the protocol ENS-wide rather than tied to a marketing label such as
“v1” or “v2.” A registry migration should normally change only the isolated
authority algorithm and its version. The discovery model, live-value binding,
claim kernel, method profiles, results, and UI semantics remain reusable.

The proposal is not ready to call fully interoperable until a reference
verifier and comprehensive executable vectors exist. The written protocol is
now substantially stronger, but prose plus a handful of vectors cannot expose
all byte-level disagreements.

## What It Actually Adds

ENS already authenticates resolver writes through ENS ownership and resolver
permissions. That answers “who was allowed to publish this record?” It does not
answer whether the HTTPS origin, DNS zone, account, or issuer named by the record
participated in the assertion.

Record Verification adds two useful capabilities:

1. A portable authorization from the current exact-name ENS authority over the
   exact live resolver bytes.
2. Optional native evidence from the target system, such as an HTTPS origin,
   DNSSEC-authenticated zone, or EVM account.

Examples:

- A URL record can prove that the ENS authority approved the exact URL and that
  the URL's origin published a matching proof.
- An address record can prove that both the ENS authority and target EVM account
  signed the same claim.
- A contenthash can prove exact ENS-authority authorization without pretending
  that a decentralized content identifier is an independently controlled actor.

This is valuable for wallets, agent discovery, account linking, and automated
systems that need stronger evidence than an unsigned resolver value. It is less
valuable for ordinary low-risk display, where live ENS resolution is often
enough and proof fetching adds latency and privacy cost.

## Architecture Decisions That Are Right

### Universal Resolver as the read boundary

Using the Universal Resolver for both the target record and descriptor is the
right SDK boundary. It covers direct resolvers, inherited resolvers, wildcard
resolution, and CCIP Read through one interface. Both reads must use the exact
DNS name and the same block reference.

It is important not to overstate this decision: the Universal Resolver resolves
records, but today it is not a universal authority oracle. Authority discovery
therefore remains a separate read-only algorithm.

### Exact-name authority

The exact ENS name—not its parent and not merely the resolver writer—is the
correct authority unit. This preserves real subname delegation.

An initially surprising consequence is intentional: an unwrapped Registry
subname survives its parent's `.eth` expiry or re-registration because the ENS
Registry stores child ownership independently. The new parent owner can replace
the child, but the protocol should not silently treat the parent change as a
transfer of the child.

Wrapped names are different because the Name Wrapper exposes exact expiry.
Wrapped child validity is bounded by that exact wrapper expiry. A wrapped child
should not additionally be capped by its parent's registrar expiry unless ENS
contracts define that relationship. A wrapped `.eth` second-level name is also
bounded by its Base Registrar expiry.

### Explicit authority versioning

Putting `a=<authorityVersion>` in the descriptor and signing the same value is
better than guessing whether a name belongs to “ENS v1” or “ENS v2.” If ENS
authority semantics change, a new algorithm version can be allocated. Old
clients fail closed instead of applying old ownership rules to new state.

The current EIP-712 domain uses the long-lived mainnet Universal Resolver proxy
as a deployment anchor. It does not imply that the proxy verifies signatures.

### One strict common claim

One closed EIP-712 type is easier to audit and implement than extensible typed
data. The claim binds:

- normalized name and node;
- record type and key;
- hash of the exact live resolver return bytes;
- authority algorithm version;
- immutable method identifier and canonical target;
- issued-at and valid-until bounds.

Method evidence binds to the common claim digest rather than adding fields to
the common type. This avoids incompatible EIP-712 encoders and ambiguous
extension ordering.

No nonce is needed. A nonce only prevents replay if a verifier has a consumed
nonce registry or another stateful rule. Here, replay is defeated by checking
the live record, live descriptor, current authority, target, and expiry.

### Closed descriptor and immutable method identifiers

The compact descriptor fits existing ENS text records:

```text
ensrv1 a=1 m=https-origin.v1
```

Rejecting duplicate and unknown fields is correct because silently ignored
future fields could contain security requirements. Concrete method identifiers
must be immutable and versioned. Abstract names such as `service-account` and
`issuer-attestation` are families, not valid deployable profiles.

### CAIP-10 for account targets

A bare address or coin type is not enough to identify an account. CAIP-10 gives
the target explicit chain context. The initial method supports only mappings
that are unambiguous under ENSIP-9 and ENSIP-11; other chains require their own
profile rather than heuristics.

### Relationship, not generic “verified” meaning

The result relationships are correctly separated:

- `authorization`: current ENS authority approved the exact record;
- `control`: authority approved it and the target participated;
- `attestation`: authority approved it and an accepted issuer attested.

This is more honest than treating every positive result as target control.

## Remaining Architectural Risks

### Authority is the migration seam

Authority Algorithm 1 is necessarily specific to today's Ethereum mainnet ENS
contracts. This is not the same as making the whole ENSIP “v1-only.” The risk is
that clients scatter these rules through SDK code. Implementations should expose
authority as a versioned module with its own conformance vectors.

A future ENS registry can preserve Algorithm 1 compatibility, expose a stable
authority interface, or allocate Algorithm 2. The rest of the verifier should
not change.

### Exact authority can be unavailable

A wildcard or offchain resolver may return valid record data even when no
authenticated exact-name authority is discoverable. A CCIP gateway response is
not ownership evidence. The safe result is `unsupported_authority`; falling back
to a parent would change the meaning of the claim.

### External retrieval creates a new attack surface

HTTPS, DNS, CCIP Read, revocation, and issuer checks create SSRF, DNS rebinding,
redirect, decompression, availability, privacy, and tracking risks. The protocol
now defines strict retrieval behavior, but implementers must actually enforce it
and should default wallets to privacy-preserving modes.

### One descriptor advertises one method

This simplifies deterministic verification but prevents publishing a fallback
or layering several independent methods. That is acceptable for the first
version. Adding a list syntax now would complicate precedence, UI meaning,
lifecycle, and downgrade resistance before there is evidence it is needed.

### Delegation is absent

Requiring the current ENS authority to sign every renewal can be inconvenient
for cold wallets and organizations. Delegation is important, but it introduces
scope, expiry, revocation, transfer, and compromise questions of its own. It
should be a separate authority algorithm or method extension, not an optional
field smuggled into the base claim.

### Provider and issuer methods are not protocols yet

“Service account control” and “issuer attestation” sound concrete but are not
interoperable without a provider, subject syntax, issuer key discovery, trust
policy, revocation model, and privacy rules. Keeping those families explicitly
non-normative avoids false interoperability.

### Runtime cost may exceed user value

A strong verification can require two ENS resolutions, authority contract
reads, proof retrieval, and target checks. Smart multicall and caching help, but
high-risk applications should still revalidate live. SDKs should make ordinary
resolution cheap and verification opt-in rather than turning every ENS lookup
into multiple third-party requests.

## Onchain Versus SDK Responsibilities

The design intentionally introduces no verification contract and no new
resolver interface. Most behavior is SDK/verifier logic:

| Concern               | Existing onchain state       | Verifier responsibility                   |
| --------------------- | ---------------------------- | ----------------------------------------- |
| Target and descriptor | Resolver records             | Universal Resolver reads at one block     |
| Current authority     | Registry, Wrapper, Registrar | Apply the selected authority algorithm    |
| EOA proof             | Authority/account address    | Recover signature locally                 |
| Contract proof        | ERC-1271 contract            | Read-only `isValidSignature` call         |
| HTTPS/DNS evidence    | None                         | Fetch and validate under method policy    |
| Lifecycle             | ENS expiry plus signed times | Compute earliest validity and cache bound |

ERC-1271 and ENS authority checks involve onchain `eth_call`s, but the protocol
does not write state or require a new deployed contract.

## Required Improvements Before Finalization

1. Build a small reference verifier that executes the exact normative order.
2. Expand vectors for name normalization, descriptor parsing, value hashing,
   EIP-712, authority states, CAIP mapping, URL/DNS canonicalization, lifecycle,
   SSRF policy, and error precedence.
3. Obtain at least two independent implementations and compare outputs.
4. Run an ENS ecosystem review focused on authority semantics and resolver
   compatibility.
5. Run a security review focused on external retrieval and signature domains.
6. Keep provider and issuer profiles out of the normative method registry until
   each has a complete standalone specification.

## Final Assessment

The architecture is now pointed in the right direction. Its main insight is not
“put verification onchain”; it is to define a deterministic, portable SDK-level
protocol that composes existing ENS authority with evidence native to the record
target.

Its success depends less on adding features and more on staying narrow:
exact-name authority, exact live bytes, one strict claim, versioned methods,
fail-closed evolution, precise relationship language, and executable
conformance. If those constraints are preserved, the proposal can apply across
ENS generations with authority as the main migration seam.
