# Proposed Singleton Verification Model

This is a research recommendation, not final ENSIP language. The goal is to
define one verification system that can support `url`, social text records,
addresses, contenthashes, avatars, and future resolver records through a shared
claim envelope and method registry.

## Name

Working name: ENS Record Verification Protocol, version 1 (`ENSVERIFY1`).

## Core Principle

The singleton is the verification envelope, not the evidence method.

Every verified claim should answer the same base questions:

1. What exact ENS record value is being verified?
2. Does live ENS resolution still return that value?
3. Did the current ENS verification authority authorize the claim?
4. What target authority, if any, confirms the same claim?
5. Which method was used, and what are its limits?
6. Has the proof expired or been superseded?

## Canonical Claim

A claim should be encoded canonically before hashing or signing.

```json
{
  "type": "ENSRecordClaim",
  "version": 1,
  "chainId": 1,
  "registry": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
  "name": "alice.eth",
  "node": "0x...",
  "record": {
    "kind": "text",
    "key": "url",
    "value": "https://example.com/",
    "canonicalValue": "https://example.com",
    "valueHash": "0x..."
  }
}
```

For other records:

- `addr`: include coin type, canonical address bytes or canonical account ID.
- `contenthash`: include decoded protocol and canonical contenthash bytes.
- `avatar`: include the raw text value and method-specific normalized target.
- future records: include resolver interface ID, function selector, arguments,
  canonical return bytes, and a method profile.

The `claimHash` should be:

```text
keccak256(canonical-encoded ENSRecordClaim)
```

The encoding must be specified tightly. JSON is readable for examples, but the
standard should use a deterministic encoding or EIP-712 struct definitions for
signatures.

## ENS Sidecar Record

Use a deterministic text record key:

```text
verification[<claimHash>]
```

Value:

```text
v=ENSVERIFY1;digest=<proofDigest>;methods=<method-list>;exp=<unix-time>
```

Optional future fields:

```text
auth=<authority-mode>;profile=<method-profile>;rev=<revocation-id>
```

Rules:

- field names are case-sensitive;
- duplicate fields invalidate the record;
- `digest` binds the ENS side to the proof envelope;
- `exp` caps positive cache lifetime;
- `methods` lists acceptable evidence methods for this claim;
- clients must still resolve the underlying record and compare it to the claim.

This mirrors the URL-specific draft but generalizes the scope from origin hash
to claim hash.

## Optional Manifest

Add an optional index record:

```text
text("verifications") = v=ENSVERIFY1;uri=<content-addressed-manifest>;root=<hash>;exp=<unix-time>
```

The manifest can list claim hashes and sidecar keys for UI discovery. It should
not replace independent validation. Every listed claim must still pass live ENS
and target checks.

Why optional:

- profile apps need discovery;
- low-level clients often verify one known record;
- manifests can be large;
- sidecars remain deterministic without enumeration.

## Proof Envelope

Example:

```json
{
  "type": "ENSRecordVerification",
  "version": 1,
  "claim": {
    "type": "ENSRecordClaim",
    "version": 1,
    "chainId": 1,
    "registry": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    "name": "alice.eth",
    "node": "0x...",
    "record": {
      "kind": "text",
      "key": "url",
      "value": "https://example.com/",
      "canonicalValue": "https://example.com",
      "valueHash": "0x..."
    }
  },
  "ensAuthority": "0x1111111111111111111111111111111111111111",
  "method": "https-well-known",
  "target": {
    "type": "web-origin",
    "id": "https://example.com"
  },
  "evidence": {
    "url": "https://example.com/.well-known/ens-record-verification"
  },
  "issuedAt": 1783123200,
  "expiresAt": 1790812800,
  "nonce": "0x2222222222222222222222222222222222222222222222222222222222222222",
  "signature": "0x..."
}
```

The proof digest is the EIP-712 digest for the envelope or for a typed subset of
the envelope. The signed fields must include the claim hash, method, target,
issued time, expiry, and nonce.

## Verification Authority

Default authority:

- unwrapped name: registry owner of the node;
- wrapped name: Name Wrapper owner of the node;
- subname systems: current owner according to the applicable registry and
  wrapper state.

Recommended extension:

- `verification-delegate[<delegate>]` or a signed delegation proof that grants a
  delegate authority for a limited set of claim types, methods, and expiry.

Why not default to resolver writer:

- resolver write permission can be broad and operational;
- users may delegate profile editing without intending identity verification;
- resolver authorization varies across resolver implementations;
- owner or explicit delegation is easier for clients to audit.

Counterargument:

- owners may not want to sign every profile change;
- profile managers need operational workflows.

Resolution:

- owner or wrapped owner is the base signer;
- scoped delegates solve UX without silently expanding trust.

## Target Evidence Methods

Method identifiers should be versioned. Initial candidates:

| Method | Records | Target Check |
| --- | --- | --- |
| `https-well-known@1` | `url`, web-hosted avatar, web identity | Fetch exact-origin JSON proof. |
| `dns-txt@1` | `url`, domain, email domain | Fetch TXT proof; DNSSEC upgrades result strength. |
| `atproto-handle@1` | AT Protocol social text records | Resolve handle through DNS or HTTPS to DID. |
| `nostr-nip05@1` | Nostr social text records | Fetch `.well-known/nostr.json` and match public key. |
| `rel-me@1` | web profile links | Check reciprocal `rel="me"` link. |
| `evm-eip712@1` | EVM addresses | Recover EOA signature over claim digest. |
| `evm-erc1271@1` | EVM contract accounts | Call `isValidSignature` for claim digest. |
| `bitcoin-bip322@1` | Bitcoin addresses | Verify BIP-322 message for claim digest. |
| `vc@1` | legal or private attributes | Verify issuer credential and revocation status. |
| `eas@1` | third-party attestations | Verify schema, issuer, subject, and revocation. |

The base ENSIP should define the envelope and a small number of mandatory or
recommended methods. More methods can be separate ENSIPs or registry entries.

## Generic Verification Flow

1. Normalize the ENS name and compute the node.
2. Resolve the target ENS record using its normal resolver interface.
3. Canonicalize the resolved value according to the record profile.
4. Build the canonical claim and compute `claimHash`.
5. Resolve `text("verification[<claimHash>]")`.
6. Parse the sidecar and reject malformed, expired, or unsupported records.
7. Fetch or resolve proof evidence for the listed methods.
8. Compute the proof digest and compare it to the ENS sidecar digest.
9. Determine the current ENS verification authority.
10. Verify the ENS authority signature or scoped delegation.
11. Run the method adapter for target-side evidence.
12. Return a structured result.

Example result:

```json
{
  "status": "verified",
  "level": "bidirectional",
  "claimHash": "0x...",
  "record": "text:url",
  "method": "https-well-known@1",
  "ensAuthority": "0x...",
  "target": "https://example.com",
  "expiresAt": 1790812800
}
```

## Result Semantics

Recommended statuses:

| Status | Meaning |
| --- | --- |
| `unverified` | No valid proof was found. |
| `ens-authorized` | Current ENS authority signed the record, but no target confirmation exists or is needed. |
| `target-controlled` | Target proof exists but ENS-side binding is missing or not current. |
| `bidirectional` | ENS and target both validate the same claim. |
| `attested` | A third-party issuer attested to the claim. |
| `expired` | A previously valid proof is past its expiry. |
| `unsupported-method` | The client cannot evaluate the advertised method. |
| `invalid` | A proof exists but fails validation. |

UI should map these carefully. Only `bidirectional` should get a base
record-control verified indicator.

## Revocation

Revocation can happen through:

- deleting or changing the ENS sidecar;
- changing the underlying ENS record value;
- changing ENS ownership or wrapper ownership;
- expiry;
- target proof removal;
- method-specific revocation, such as credential or attestation revocation;
- delegate expiry or revocation.

Clients and indexers must not cache positive results beyond the earliest known
revocation boundary.

## Why This Model Is Better Than the URL-Only Draft

The URL-only draft has a strong bidirectional shape, but its record key,
message type, proof path, and authority language are specific to web origins.
Generalizing to `verification[<claimHash>]` keeps the good parts:

- live ENS record check;
- sidecar digest;
- target proof;
- current authority signature;
- bounded expiry.

It adds the missing parts:

- canonical claims for all record types;
- method registry;
- optional manifest for discovery;
- explicit delegation;
- structured result semantics;
- support for attestations without making them mandatory.

## Sources

- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-1271: Standard signature validation method for contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [ENS Name Wrapper documentation](https://docs.ens.domains/wrapper/)
- [ENS records](https://docs.ens.domains/web/records/)
- [AT Protocol handle specification](https://atproto.com/specs/handle)
- [Nostr NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [BIP-322: Generic signed message format](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
- [Ethereum Attestation Service documentation](https://docs.attest.org/docs/welcome)

