# Developer UX and Adoption

A technically correct verification protocol will fail if users need to hand-edit
records, copy opaque hashes, or understand every target method. The protocol
needs a good wallet and developer flow from the start.

## Target UX

For a user verifying one ENS record:

1. The app reads the current ENS record.
2. The app explains the exact relationship being verified.
3. The user signs one typed message authorizing the claim or delegate.
4. The app runs the native method flow, such as publishing a well-known file,
   adding a DNS TXT record, completing OAuth, signing from an address, or
   producing an attestation.
5. The app writes ENS-side data only when the method profile needs it, ideally
   batched with the record update.
6. The app shows the proof expiry and renewal path.

The user should not manually calculate hashes. The UI should show human-readable
claim text and method-specific instructions.

## One-Click Authorization

"One click" can mean different things. The realistic target is:

- one wallet signature to authorize the verification claim or delegate;
- one transaction or resolver write when ENS-side data is required by the
  method profile;
- one guided target publication step, which may be automatic for some targets
  and manual for DNS or static hosting.

For web proofs, a hosting integration can publish the file automatically. For
DNS proofs, the user may still need to add a TXT record unless their registrar
or DNS provider is integrated. For social accounts, OAuth or provider APIs often
produce an attestation rather than a public proof every client can refetch.

## SDK Shape

A reference SDK should expose small, explicit functions:

```typescript
const claim = await createEnsRecordClaim({
  name: "alice.eth",
  record: { kind: "text", key: "url" }
});

const proof = await createVerificationProof({
  claim,
  method: "url-https@1",
  signer: wallet
});

const result = await verifyEnsRecord({
  name: "alice.eth",
  record: { kind: "text", key: "url" }
});
```

Verifier results should include:

- status;
- level;
- method;
- target;
- expiry;
- failure reason;
- whether live ENS state, ENS authority, and target evidence each passed.
- whether the result is independently refetchable or provider-mediated.

This lets apps render accurate UI without reverse-engineering proof internals.
The SDK should look like a singleton to developers, but internally it should be
adapter-based and method-native.

## Developer Defaults

Recommended defaults:

- verify specific records on demand;
- do not block resolution when verification fails;
- show unverified records plainly;
- cache positive results only until the earliest expiry boundary;
- avoid showing the same badge for bidirectional proof and third-party safety
  review;
- treat unsupported methods as `unverified` or `unsupported-method`, not as
  invalid.

## Integrator Profiles

### Wallets

Wallets need low-latency checks for high-risk records:

- payment addresses;
- URLs shown near signing or transaction flows;
- primary names;
- avatars when used as trust signals.

Wallets should avoid making every profile field a blocking network fetch. They
can verify on demand, cache carefully, and rely on indexers for low-risk display
while revalidating before high-value actions.

### ENS Profile Apps

Profile apps need discovery. They can use an optional manifest, sidecars,
resolver-native data, or attestation references to show available
verifications. Discovery is not the trust root; each method still validates its
native evidence.

### Indexers

Indexers can improve UX by prefetching proofs and exposing status. They must
store enough metadata for clients to understand expiry, method, and last checked
time. A stale indexer result should not be treated as final proof.

### Verification Services

Verification services can help with provider APIs, OAuth, DNS integrations, and
attestations. They should output verifiable proof material or attestations,
instead of only serving a private badge API.

For OAuth methods, a verification service may be unavoidable because OAuth
tokens are bearer credentials and should not be published in ENS. The service
should publish a revocable attestation with the provider account ID, handle,
ENS name, method, expiry, and issuer.

## Renewal and Expiry

Proofs should be short-lived enough to limit stale trust but not so short that
users constantly renew records.

Suggested starting points:

| Record Class | Suggested Max Validity |
| --- | --- |
| Web/DNS proofs | 90 days |
| Social account proofs | 30 to 90 days, depending on handle-recycle risk |
| Address signatures | 90 to 365 days, depending on wallet UX and risk |
| Delegations | 30 to 180 days, scoped by method and record class |
| Third-party attestations | Issuer-defined, but clients need expiry or revocation checks |

The standard should set maximums for base methods and allow stricter client
policy.

## Failure UX

Failure states should be actionable:

- "No proof found" means the record is self-asserted.
- "Proof expired" means renewal is needed.
- "ENS owner changed" means the current owner must reauthorize.
- "Target proof missing" means the website, DNS, social account, or address no
  longer confirms the claim.
- "Unsupported method" means the client cannot evaluate that proof type.

This is better than a binary badge because developers can explain what actually
failed.

## Adoption Path

1. Write a small base ENSIP for semantics, authority, delegation, expiry,
   caching, and result states.
2. Keep the existing URL draft as a `url-https@1` and `url-dnssec@1` method
   profile, not as the general architecture.
3. Add `addr-evm@1` for EIP-712 and ERC-1271 address-control verification.
4. Add `social-public-proof@1` for public protocol proofs such as AT Protocol,
   Nostr, Farcaster, Mastodon, and `rel="me"` where applicable.
5. Add `social-oauth@1` for provider-mediated OAuth/OIDC flows that produce
   revocable attestations.
6. Add contenthash profiles for ENS-owner authorization and publisher manifests.
7. Build a reference SDK and command-line verifier that expose one API over
   native method adapters.
8. Integrate with ENS profile managers as guided publish and renew flows.

## Sources

- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [RFC 8555: ACME](https://datatracker.ietf.org/doc/html/rfc8555)
- [RFC 8615: Well-Known URIs](https://datatracker.ietf.org/doc/html/rfc8615)
- [RFC 6749: OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [AT Protocol handle specification](https://atproto.com/specs/handle)
- [Nostr NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
