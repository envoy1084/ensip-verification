# Address Verification

Address verification applies to ENS address records:

- `addr(bytes32)` for Ethereum mainnet compatibility;
- `addr(bytes32,uint256 coinType)` for ENSIP-9 multicoin records;
- ENSIP-11 EVM chain-derived coin types.

It verifies control of the ENS name and control of the target account. It does
not prove willingness to receive funds, legal ownership, sanctions status, or
safety.

## Methods

| Method | Verification | Target |
| --- | --- | --- |
| `addr-evm-eip712@1` | `control` | EVM EOA |
| `addr-evm-erc1271@1` | `control` | EVM contract account |
| `addr-chain-signature@1` | `control` | Non-EVM account with a profile-defined signing standard |
| `addr-attestation@1` | `attestation` | Issuer claim about an account |

Clients SHOULD return `none` with `unsupported_method` for chains whose signing
standard is not implemented.

## Claim Fields

```text
recordRef = keccak256(bytes("addr:" || decimalCoinType))
valueHash = keccak256(canonicalAddressBytes)
targetRef = keccak256(canonicalTargetAccountBytes)
```

For ordinary address records, `canonicalTargetAccountBytes` equals
`canonicalAddressBytes`. A method profile MAY define a different target account
reference for account systems with distinct public keys, script encodings, or
account IDs.

EVM canonicalization:

- `coinType = 60` is Ethereum mainnet.
- ENSIP-11 EVM coin types derive from `0x80000000 | chainId`.
- Canonical EVM address bytes are the 20 raw address bytes.
- Display values SHOULD use EIP-55 checksum, but display case is not signed.

Non-EVM canonicalization MUST be defined by the method profile.

## Proof Payload

Address verification normally needs a sidecar, onchain proof, or caller-supplied
proof reference because an address record has no natural offchain publication
location.

```json
{
  "v": "ENSVERIFY1",
  "claim": {
    "contextId": "0x...",
    "nameId": "0x...",
    "recordRef": "0x...",
    "valueHash": "0x...",
    "targetRef": "0x...",
    "method": "addr-evm-eip712@1",
    "expiresAt": 1790812800,
    "nonce": "0x..."
  },
  "ensSignature": "0x...",
  "targetSignature": "0x..."
}
```

`ensSignature` MUST cover the claim hash and MUST be produced by the current ENS
authority or valid verification delegate.

`targetSignature` MUST cover the same claim hash and MUST be produced by the
target account. For EVM contract accounts, the verifier MUST call:

```solidity
isValidSignature(bytes32 hash, bytes signature) returns (bytes4)
```

and require `0x1626ba7e`.

If the ENS authority and target account are the same account, one signature MAY
be reused for both roles if it verifies against both roles under the method
profile.

Maximum validity: 90 days.

## ENS Sidecar

Recommended key:

```text
verification[<recordRef>][<valueHash>]
```

Recommended value:

```text
v=ENSVERIFY1;method=addr-evm-eip712@1;claim=<claimHash>;exp=<unix-time>;uri=<proof-ref>
```

`uri` may point to an HTTPS object, content-addressed object, onchain verifier,
or resolver-native proof defined by the method profile.

## Verification

For `addr-evm-eip712@1`, a verifier MUST:

1. Resolve the live address record.
2. Compute `recordRef`, `valueHash`, and `targetRef`.
3. Read current ENS authority state.
4. Build the claim.
5. Verify `ensSignature` against current ENS authority or delegate.
6. Recover `targetSignature` and require the recovered address to equal the
   canonical target account.
7. Check expiry and revocation.
8. Return `verified/control` only if both signatures validate the same claim.

For `addr-evm-erc1271@1`, replace step 6 with ERC-1271 validation against the
target contract account.

For `addr-attestation@1`, verify issuer signature, subject, expiry, and
revocation. Return `verified/attestation` only if the issuer is trusted by
verifier policy.

## Security Notes

- Address verification can reveal wallet linkage.
- Custodial or deposit addresses may be unable to sign.
- Contract-account validity can change with contract state.
- A verified account is not necessarily suitable for every payment or chain.
- SDKs should revalidate before high-value transfers.
