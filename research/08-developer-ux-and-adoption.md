# Developer UX and Adoption

A technically correct verification protocol will fail if users need to hand-edit
records, copy opaque hashes, or understand every target method. The protocol
needs a good wallet and developer flow from the start.

## Target UX

For a user verifying one ENS record:

1. The app reads the current ENS record.
2. The app explains the exact relationship being verified.
3. The user signs one typed message authorizing the claim when the method
   requires ENS-authority consent.
4. The app runs the native method flow, such as publishing a well-known file,
   adding a DNS TXT record, signing from an address, publishing a content
   manifest, or producing an issuer attestation.
5. The app writes the compact verification descriptor, ideally batched with the
   record update.
6. The app shows the proof expiry and renewal path.

The user should not manually calculate hashes. The UI should show human-readable
claim text and method-specific instructions.

## One-Click Authorization

"One click" can mean different things. The realistic target is:

- one wallet signature to authorize the verification claim, with delegation only
  if a future scoped-delegation profile defines it;
- one transaction or resolver write for the verification descriptor;
- one guided target publication step, which may be automatic for some targets
  and manual for DNS or static hosting.

For web proofs, a hosting integration can publish the file automatically. For
DNS proofs, the user may still need to add a TXT record unless their registrar
or DNS provider is integrated. For service accounts, the user may need to place
a proof file in a provider-specific public location. For mailbox or private
provider flows, an issuer attestation is usually more realistic than a public
proof every client can refetch.

## SDK Shape

A reference SDK should expose small, explicit functions:

```typescript
const claim = await createEnsRecordClaim({
  name: "alice.eth",
  record: { type: "text", key: "url" },
  method: "https-origin",
});

const proof = await createVerificationProof({
  claim,
  method: "https-origin",
  signer: wallet,
});

const result = await verifyRecord({
  name: "alice.eth",
  record: { type: "text", key: "url" },
});
```

Verifier results should include:

- status;
- kind for positive results;
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
- show `none` records plainly;
- cache positive results only until the earliest expiry boundary;
- avoid showing the same badge for bidirectional proof and third-party safety
  review;
- treat unsupported methods as `none/unsupported_method`, not as
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

Profile apps need discovery. The current architecture gives deterministic
per-record descriptor keys such as `verification[text][url]` and
`verification[addr][60]`. A future optional manifest can help enumerate
available verifications, but discovery is not the trust root; each method still
validates its native evidence.

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

| Record Class             | Suggested Max Validity                                        |
| ------------------------ | ------------------------------------------------------------- |
| Web/DNS proofs           | 90 days                                                       |
| Social account proofs    | 30 to 90 days, depending on handle-recycle risk               |
| Address signatures       | 90 to 365 days, depending on wallet UX and risk               |
| Delegations              | 30 to 180 days, scoped by method and record class             |
| Third-party attestations | Issuer-defined, but clients need expiry and revocation checks |

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

1. Finalize the base ENSIP around resolver-class verification keys, compact
   descriptors, raw live-value hashing, current-authority rules, common claim
   fields, and `verified`/`none` results.
2. Keep `https-origin` and `dns-txt` as text-record method profiles, not as the
   general architecture.
3. Add `account-signature` for EIP-712, ERC-1271, BIP-322, Solana Ed25519, and
   future chain-family address proofs.
4. Use `service-account` for public provider proof surfaces and
   `issuer-attestation` for provider-mediated or private claims.
5. Keep `email-domain` separate from `email-attestation`.
6. Use `content-manifest` only when the manifest is inside the content root.
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
