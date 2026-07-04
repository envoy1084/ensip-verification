# SDK Verification

Verification is an SDK-level operation. Indexers, APIs, and subgraphs may help
with discovery, but they are not the trust boundary.

## SDK Contract

A verifier SDK SHOULD expose a function shaped like:

```ts
type VerifyRecordInput = {
  name: string;
  record: "text:url" | `addr:${number}` | "contenthash" | "text:avatar" | string;
  methods?: string[];
  proofRefs?: string[];
  now?: number;
  policy?: VerificationPolicy;
};

async function verifyRecord(input: VerifyRecordInput): Promise<VerificationResult>;
```

The SDK MUST resolve live ENS state and recompute verification before returning a
positive result. Cached or indexed data may only be used as candidate proof
references.

## Authority Adapters

The SDK should isolate ENS version differences behind authority adapters:

```ts
interface AuthorityAdapter {
  resolveRecord(name: string, record: string): Promise<ResolvedRecord>;
  getAuthority(name: string, record: string): Promise<AuthorityState>;
}
```

The ENSv1 adapter handles registry ownership, Name Wrapper ownership, `.eth`
registrar expiry, resolver lookup, and wrapped-name expiry.

The ENSv2 adapter should use the Universal Resolver or a supported library for
resolution and should map hierarchical registry state to the kernel
`AuthorityState`. It must not expose v2 registry complexity to method profiles.

## Verification Order

The SDK MUST run verification in this order:

1. Normalize the name.
2. Resolve the live record.
3. Determine the record category.
4. Select supported method profiles.
5. Load current authority state.
6. Build method claims from live state.
7. Discover proofs from deterministic locations, sidecars, onchain references,
   and caller-supplied proof references.
8. Validate proofs.
9. Return the highest-priority valid result according to caller policy.

If no proof validates, return `status: "none"`.

## Indexer Hints

Indexers may provide:

- sidecar keys;
- proof URIs;
- onchain attestation references;
- last-seen ENS record values;
- candidate methods.

SDKs MUST treat all of these as hints. A stale indexer response MUST NOT be
returned as `verified` without recomputing the method against current state.

## Policy Inputs

Verification policy is local to the client or application. It may include:

- supported method list;
- trusted attestation issuers;
- maximum proof age shorter than `expiresAt`;
- DNSSEC requirements;
- HTTP timeout and redirect policy;
- privacy mode for target fetches;
- chain clients available for NFT or address checks.

Policy can make verification stricter. It MUST NOT convert a failed proof into
`verified`.

## Cache Behavior

SDKs MAY cache:

- negative results for a short period;
- proof fetches until HTTP cache expiry or DNS TTL;
- positive results until the earliest kernel cache boundary.

Before showing a high-trust UI or routing funds, clients SHOULD refresh live ENS
state and the method proof.
