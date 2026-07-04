# Verification Kernel

This kernel defines the shared rules for ENS record verification. It is for SDKs
and clients that recompute verification from live ENS state. It is not an
indexer trust model and it is not a mandatory singleton proof format.

Verification only applies when a record claims control of an external target.
Profile metadata such as `name`, `description`, `location`, `keywords`, and
theme/display fields has no external authority and SHOULD be returned without
verification.

## Record Categories

| Category | Records | Verification target |
| --- | --- | --- |
| URL | `text("url")`, URL-valued endpoints | HTTPS origin or DNS host |
| Address | `addr(bytes32)`, `addr(bytes32,uint256)` | Account or wallet |
| Social | ENSIP-5 service text keys | Social account, protocol identity, or issuer |
| Contenthash | `contenthash(bytes32)` | Publisher key, mutable namespace, Arweave owner, or issuer |
| Avatar NFT | `text("avatar")` with CAIP NFT URI | NFT owner |
| Display metadata | `name`, `description`, profile text | No verification |

Method profiles MAY define additional categories, but they MUST state the target
authority and the exact live ENS record being checked.

## Result Model

Clients MUST NOT mix verification status with errors. The only verification
statuses are:

```ts
type VerificationStatus = "none" | "verified";
type VerificationKind = "control" | "attestation";

type VerificationResult =
  | {
      status: "none";
      record: string;
      value?: string;
      checkedAt: number;
      error?: VerificationError;
    }
  | {
      status: "verified";
      verification: VerificationKind;
      method: string;
      record: string;
      value: string;
      checkedAt: number;
      expiresAt?: number;
      evidence?: Record<string, unknown>;
    };
```

`control` means live ENS state and the target authority both validate the same
claim, or the method defines an equivalent deterministic ownership check such as
CAIP NFT avatar ownership.

`attestation` means an issuer made a signed or onchain claim. Clients MUST apply
their own issuer trust policy before returning `verified`.

Missing proofs, unsupported methods, malformed sidecars, stale signatures, and
expired proofs all return `status: "none"` with an `error.code`.

## Claim Binding

Signed and attested methods MUST bind the following minimal claim:

```solidity
struct ENSRecordClaim {
    bytes32 contextId;
    bytes32 nameId;
    bytes32 recordRef;
    bytes32 valueHash;
    bytes32 targetRef;
    bytes32 methodId;
    uint64 expiresAt;
    bytes32 nonce;
}
```

Where:

- `contextId` identifies the ENS resolution namespace.
- `nameId` identifies the name in that namespace.
- `recordRef` identifies the resolver record, such as `text:url`,
  `addr:60`, or `contenthash`.
- `valueHash` is the hash of the canonical live resolver value.
- `targetRef` identifies the external target being verified.
- `methodId = keccak256(bytes(method))`.
- `expiresAt` is the latest time a positive result may be returned.
- `nonce` prevents accidental proof reuse when two claims otherwise match.

The claim hash is method-defined, but EVM methods SHOULD use EIP-712 over the
struct above. JSON proof envelopes MAY carry the readable `method` string;
verifiers MUST compute `methodId` from that string before checking signatures.
Human-readable names, display URLs, proof URIs, gateway URLs, `issuedAt`, and
`checkedAt` MUST NOT be required signed fields. They may appear as unsigned
helpers and MUST be ignored for signature validity.

## ENS Authority

Every positive `control` verification MUST be checked against current ENS
authority at verification time.

An authority adapter MUST return:

```ts
type AuthorityState = {
  contextId: `0x${string}`;
  nameId: `0x${string}`;
  authority: `0x${string}` | { contract: `0x${string}` };
  validUntil?: number;
  stateVersion?: `0x${string}`;
};
```

For ENSv1, `nameId` is the ENSIP-1 namehash of the normalized name and
`contextId` binds at least the L1 chain ID and registry address. The adapter
MUST account for the Name Wrapper when the registry owner is the wrapper, and it
MUST treat expired `.eth` names or expired wrapped names as unavailable for
positive verification.

For ENSv2, clients SHOULD resolve records through the Universal Resolver or a
library that uses it. The authority adapter MUST hide the hierarchical registry
path and return the current owner or current verification delegate for the
specific name. A record-writer role is not a verification authority unless the
current owner explicitly grants a verification delegation. If the v2 registry
exposes a generation, registration nonce, or equivalent remint boundary, the
adapter MUST include it in `nameId` or `stateVersion`.

Verifier rules:

- A signature from a previous owner MUST fail.
- A resolver writer or manager alone MUST NOT count as authority.
- A delegate MUST be scoped by name, record category, method, and expiry.
- A proof MUST fail if the authority state is expired or unavailable.
- A transfer, expiry, remint, resolver replacement, or record value change MUST
  invalidate cached positive results.

## Proof Publication

Proofs may be published in any method-defined location:

- target publication, such as HTTPS well-known files or DNS TXT records;
- ENS text sidecars;
- onchain verifier contracts, events, attestations, or resolver-native data;
- content manifests or protocol-native messages.

The publication location is not the claim. The signed or attested material MUST
bind the claim fields above.

Method profiles MAY use this optional sidecar convention:

```text
verification[<recordRef>][<valueHash>]
```

`recordRef` and `valueHash` parameters SHOULD be lowercase `0x`-prefixed hex.

Recommended sidecar value:

```text
v=ENSVERIFY1;method=<method-id>;claim=<claimHash>;exp=<unix-time>;uri=<proof-ref>
```

Parsing rules:

- field names are case-sensitive;
- fields are separated by semicolons;
- duplicate fields invalidate the sidecar;
- unknown fields MAY be ignored unless the method profile forbids them;
- `exp` MUST equal the claim `expiresAt`;
- `uri` grammar is method-defined.

Sidecars are hints. A client MUST still resolve live ENS state and verify the
method proof before returning `verified`.

## SDK Verification Algorithm

An SDK verifier MUST:

1. Normalize the name according to ENS name processing rules.
2. Resolve the live record value through the supported ENS resolution path.
3. Classify the record category and select supported method profiles.
4. Read current authority state through the ENSv1 or ENSv2 adapter.
5. Build the claim from live state.
6. Discover candidate proofs from deterministic target locations, sidecars, or
   caller-supplied proof references.
7. Validate signatures, attestations, target evidence, expiry, and revocation.
8. Return `verified` only if all method requirements pass; otherwise return
   `none` with an error code.

Indexers, APIs, and subgraphs MAY supply candidate proof references, but SDKs
MUST treat those references as untrusted hints.

## Error Codes

| Code | Meaning |
| --- | --- |
| `record_missing` | The ENS record is absent or empty. |
| `unsupported_record` | No verification category is defined for the record. |
| `unsupported_method` | The client does not implement the advertised method. |
| `proof_missing` | No candidate proof was found. |
| `proof_malformed` | Proof or sidecar parsing failed. |
| `signature_invalid` | Signature recovery or ERC-1271 validation failed. |
| `authority_mismatch` | Signer is not current ENS authority or delegate. |
| `target_mismatch` | Target proof binds a different claim. |
| `target_unavailable` | Target evidence could not be fetched or checked. |
| `issuer_untrusted` | Attestation issuer is outside verifier policy. |
| `revoked` | Attestation or delegation has been revoked. |
| `expired` | Proof, delegation, name, or attestation expired. |

## Cache Rules

Positive results MUST NOT be cached past the earliest of:

- claim `expiresAt`;
- sidecar `exp`;
- delegate expiry;
- attestation expiry or revocation;
- DNS TTL for DNS methods;
- HTTP cache lifetime for HTTPS methods;
- ENS authority `validUntil`;
- authority `stateVersion` change;
- observed ENS owner, resolver, wrapper, subregistry, or record change.

Negative results MAY be cached briefly, but clients SHOULD allow refresh because
target proofs can be published after the ENS record is set.
