# Contenthash Verification

Contenthash verification applies to `contenthash(bytes32)` and content
references in records that use the same content-addressed semantics. ENS
contenthashes commonly point to IPFS, Swarm, Arweave, IPNS, DNSLink-backed
namespaces, or future multicodec targets.

Content addressing proves byte integrity. It does not prove publisher identity,
current ENS endorsement, safety, or mutable namespace control. Those properties
require a method-specific proof.

## Methods

| Method | Verification | Target |
| --- | --- | --- |
| `contenthash-manifest@1` | `control` | Publisher key that signs a content manifest |
| `contenthash-arweave@1` | `control` | Arweave transaction or data-item owner |
| `contenthash-dnslink@1` | `control` | DNS host for a mutable content namespace |
| `contenthash-attestation@1` | `attestation` | Issuer claim about content or publisher |

There is no standalone ENS-only contenthash verification. A live contenthash
record already expresses current ENS resolution state. Positive verification
requires a target proof or a trusted attestation.

## Claim Fields

```text
recordRef = keccak256("contenthash")
valueHash = keccak256(contenthashBytes)
targetRef = method-defined target authority hash
```

`contenthashBytes` are the raw bytes returned by the resolver. Gateway URLs,
rendered `ipfs://` strings, and HTTP mirrors MUST NOT be signed as content
identity.

Method target references:

| Method | `targetRef` |
| --- | --- |
| `contenthash-manifest@1` | Hash of publisher public key or DID |
| `contenthash-arweave@1` | Hash of Arweave owner address or public key |
| `contenthash-dnslink@1` | Hash of canonical DNS name |
| `contenthash-attestation@1` | Hash of issuer and attestation subject |

## Generic Manifest

`contenthash-manifest@1` is the general proof for IPFS, Swarm, Arweave, and
future content-addressed systems.

Manifest:

```json
{
  "v": "ENSVERIFY1",
  "claim": {
    "contextId": "0x...",
    "nameId": "0x...",
    "recordRef": "0x...",
    "valueHash": "0x...",
    "targetRef": "0x...",
    "method": "contenthash-manifest@1",
    "expiresAt": 1790812800,
    "nonce": "0x..."
  },
  "publisher": "did:key:z...",
  "publisherSignature": "...",
  "ensSignature": "0x..."
}
```

Rules:

- `publisherSignature` MUST cover the claim hash and verify against the
  publisher key in `targetRef`.
- `ensSignature` MUST cover the same claim hash and verify against current ENS
  authority or a current verification delegate.
- A current ENS authority MAY delegate the publisher key onchain or through a
  signed delegation instead of signing each manifest.
- The manifest MUST bind raw contenthash bytes through `valueHash`.

Manifest locations:

- inside a directory root, such as `/.well-known/ens-content-verification.json`;
- content-addressed URI referenced by the ENS sidecar;
- onchain proof reference;
- protocol-native metadata defined by a method profile.

For existing immutable content that cannot be changed, publish the manifest as a
separate content-addressed object, onchain proof, or sidecar-referenced object.
Because the claim binds `contenthashBytes`, the manifest does not need to be
inside the original content root.

## Arweave

`contenthash-arweave@1` applies when the contenthash points to an Arweave
transaction or data item with a verifiable owner.

A verifier MUST:

1. Decode the Arweave target from `contenthashBytes`.
2. Fetch the transaction or data item.
3. Verify the Arweave signature and owner address or public key.
4. Check that transaction tags or adjacent Arweave proof data bind the claim
   hash.
5. Verify current ENS authority signature or delegation.

If the original Arweave transaction cannot carry the claim, an adjacent Arweave
data item, ENS sidecar, or onchain proof MAY bind the same contenthash bytes.

## DNSLink and Mutable Namespaces

`contenthash-dnslink@1` applies when the content target depends on DNSLink or a
DNS-controlled mutable namespace.

A verifier MUST:

1. Canonicalize the DNS name.
2. Fetch the DNSLink TXT record and proof record defined by the method profile.
3. Verify the DNS proof binds the claim hash and current content target.
4. Apply DNS TTL and DNSSEC policy.
5. Verify current ENS authority signature or delegation.

DNSSEC support is evidence in the method result, not a separate verification
status.

## Attestations

`contenthash-attestation@1` is for issuer claims such as publisher verification,
malware review, build provenance, or moderation. A verifier MUST check issuer
trust policy, subject, expiry, and revocation before returning
`verified/attestation`.

## Verification

A verifier MUST:

1. Resolve live `contenthash()` bytes.
2. Compute `valueHash` from the raw bytes.
3. Decode the protocol only to select supported method profiles.
4. Build the claim from live ENS state and current authority state.
5. Fetch the manifest, Arweave proof, DNS proof, or attestation.
6. Verify target evidence and ENS authority or issuer policy.
7. Return `verified` only for the property proven by the method.

## Security Notes

- IPFS CIDs do not have account owners by default; use a manifest, delegation,
  DNSLink proof, or attestation.
- Gateway URLs are transports and can be stale or malicious.
- Mutable namespaces such as IPNS and DNSLink require their own authority
  checks.
- Verification does not imply content safety.
- Publisher identity is only as strong as the publisher key and trust model.
