# Addr Record Verification

Addr verification applies to ENSIP-9 address records:

```text
addr(node)
addr(node, coinType)
```

The verification record is:

```text
text(node, "verification[addr][<coinType>]")
```

For `addr(node)`, `<coinType>` is `60`.

## Verification Record

Examples:

```text
verification[addr][60] = v=ENS-VERIFY-1;method=account-signature;uri=ipfs://...
verification[addr][0] = v=ENS-VERIFY-1;method=issuer-attestation;uri=eas:...
verification[addr][60] = v=ENS-VERIFY-1;method=none
```

## Canonical Claim

```text
record = "addr:<coinType>"
valueHash = keccak256(nativeAddressBytes)
target = method-defined account identifier
```

For EVM addresses, `nativeAddressBytes` are the 20 raw address bytes. Display
checksum is not signed.

## Initial Addr Methods

| Method | Verification |
| --- | --- |
| `none` | No proof advertised. |
| `account-signature` | Current owner signature plus target account signature. |
| `issuer-attestation` | Trusted issuer attestation. |

## 0-to-1 Flow

```mermaid
sequenceDiagram
    participant Owner
    participant App
    participant OwnerWallet
    participant TargetWallet
    participant ENS

    Owner->>App: Select addr record and coinType
    App->>ENS: Resolve live addr and owner
    ENS-->>App: address bytes, owner
    App->>App: Build ENSRecordVerification
    App->>OwnerWallet: Sign owner claim
    OwnerWallet-->>App: ownerSignature
    App->>TargetWallet: Sign same claim
    TargetWallet-->>App: targetSignature
    App->>ENS: Set addr record
    App->>ENS: Set verification[addr][coinType]
```

## Proof Object

```json
{
  "v": "ENS-VERIFY-1",
  "expiry": 1790812800,
  "nonce": "0x...",
  "ownerSignature": "0x...",
  "targetSignature": "0x..."
}
```

Both signatures cover the same `ENSRecordVerification` digest. For contract
owners or contract target accounts, the verifier calls ERC-1271.

## Verification Flow

```mermaid
sequenceDiagram
    participant SDK
    participant ENS
    participant TargetAccount
    participant OwnerContract

    SDK->>ENS: Resolve addr(node, coinType)
    ENS-->>SDK: native address bytes
    SDK->>ENS: Resolve verification[addr][coinType]
    ENS-->>SDK: method and proof reference
    SDK->>ENS: Resolve owner and expiry
    ENS-->>SDK: owner, ownerContract, nameExpiry
    SDK->>SDK: Build ENSRecordVerification
    alt Owner is contract
        SDK->>OwnerContract: isValidSignature(digest, ownerSignature)
    else Owner is EOA
        SDK->>SDK: Recover owner signature
    end
    alt Target is contract
        SDK->>TargetAccount: isValidSignature(digest, targetSignature)
    else Target is EOA
        SDK->>SDK: Recover target signature
    end
    SDK->>SDK: Check target equals live address
```

## Attestation Flow

```mermaid
sequenceDiagram
    participant User
    participant Issuer
    participant SDK
    participant ENS

    User->>Issuer: Complete issuer account check
    Issuer-->>User: Signed or onchain attestation
    User->>ENS: Publish verification[addr][coinType]
    SDK->>ENS: Resolve live address and proof reference
    SDK->>Issuer: Check attestation and revocation
    SDK->>SDK: Apply local issuer trust policy
```

## SDK Checklist

- Use ENSIP-9 binary address bytes for `valueHash`.
- Include `coinType` in the signed `record`.
- Require owner signature for `account-signature`.
- Require target signature for `account-signature`.
- Use ERC-1271 for contract owners and contract target accounts.
- Revalidate before high-value transfers.

## Failure Mapping

| Case | Error |
| --- | --- |
| Empty address | `record_missing` |
| Verification record missing | none |
| `method=none` | none |
| Unsupported coin type | `unsupported_method` |
| Owner signature fails | `signature_invalid` |
| Target signature fails | `target_signature_invalid` |
| Attestation issuer untrusted | `issuer_untrusted` |
