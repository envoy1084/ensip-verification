# Social Account Verification

Social verification applies to ENS service keys and protocol identity records,
for example:

- `text("com.github")`
- `text("com.twitter")`
- `text("org.telegram")`
- `text("xyz.farcaster")`
- service-owned keys for Nostr, AT Protocol, Farcaster, or future systems

It verifies that the ENS name and the social target are bound by a public proof
or by a trusted issuer attestation. It does not prove account safety, legal
identity, or that a recycled handle will continue to identify the same account.

## Methods

| Method | Verification | Target |
| --- | --- | --- |
| `social-public-proof@1` | `control` | Public account surface or protocol proof |
| `social-protocol-proof@1` | `control` | Protocol-native signed identity proof |
| `social-attestation@1` | `attestation` | Issuer claim, such as OAuth/OIDC verifier output |

OAuth tokens and private API responses MUST NOT be published in ENS. If the
public cannot independently refetch the target proof, the result is an
attestation, not control.

## Service Adapters

Each service adapter MUST define:

- ENS text key;
- canonical handle or record value;
- stable account ID format, if the service provides one;
- target proof location and bytes;
- target proof freshness rules;
- handle recycling behavior;
- whether public verification or only attestation is possible.

Stable account IDs SHOULD be used over display handles. If a service exposes no
stable account ID, the adapter MAY use the canonical handle as `targetRef`, but
clients SHOULD display weaker confidence.

## Claim Fields

For a service text record:

```text
recordRef = keccak256(bytes("text:" || serviceKey))
valueHash = keccak256(bytes(canonicalLiveRecordValue))
targetRef = keccak256(bytes(serviceKey || "\x00" || canonicalStableAccountId))
```

If no stable account ID exists:

```text
targetRef = keccak256(bytes(serviceKey || "\x00" || canonicalHandle))
```

The signed claim MUST use the kernel `ENSRecordClaim` fields. The display handle
and proof URL may appear as unsigned helpers but MUST be recomputed or checked
by the service adapter.

## Public Proof Payload

Control methods require two pieces of evidence:

- current ENS authority signature or delegation over the claim;
- target account proof that the service adapter validates against the claim
  hash.

These pieces MAY be published in the same proof object or in separate method
defined proof locations. Public target proofs MUST contain or resolve to the
claim hash. The exact target envelope is service-defined. Examples include:

- profile field containing `ens-verify:<claimHash>`;
- public post containing `ens-verify:<claimHash>`;
- protocol message signed by the target account key;
- website or protocol document that maps the account ID to the claim hash.

If a service only allows a public handle string and no stable account ID, the
proof MUST bind the canonical handle and the verifier MUST treat handle
recycling as a normal invalidation risk.

## Attestation Payload

For `social-attestation@1`, an issuer signs or publishes an onchain attestation
over the same claim:

```json
{
  "v": "ENSVERIFY1",
  "claimHash": "0x...",
  "issuer": "0x...",
  "subject": {
    "serviceKey": "com.github",
    "stableAccountId": "123456",
    "handle": "alice"
  },
  "expiresAt": 1790812800,
  "revocation": "eip155:1/..."
}
```

The public proof does not need to reveal OAuth tokens or provider secrets.
Verifiers MUST apply issuer trust policy and revocation checks before returning
`verified/attestation`.

## Verification

For public or protocol proofs, a verifier MUST:

1. Resolve the live ENS social record.
2. Canonicalize the value using the service adapter.
3. Build the claim from live ENS state and current authority state.
4. Fetch the public proof or protocol message.
5. Check the proof binds the claim hash and current target account.
6. Verify ENS authority signature or current owner delegation.
7. Return `verified/control` only if the ENS side and target side validate the
   same claim.

For attestations, a verifier MUST:

1. Resolve the live ENS social record.
2. Build the claim.
3. Verify issuer signature or onchain attestation.
4. Check issuer trust policy, expiry, and revocation.
5. Check the attested account ID and handle match the live ENS record.
6. Return `verified/attestation`.

## Security Notes

- Prefer stable account IDs over usernames.
- Public proofs can be deleted or edited; SDKs must revalidate.
- API-gated proofs should become attestations, not hidden control checks.
- A verified social account is not proof that the account is safe or official.
- Service adapters must document handle recycling and account suspension cases.
