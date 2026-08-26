import { Schema } from "effect";

import type { Hex } from "viem";

import {
  AuthorityVersion,
  MethodIdentifier,
  ProtocolVersion,
} from "./descriptor.js";
import {
  Bytes32Hex,
  LowercaseEthereumAddress,
  LowercaseHex,
  Uint64,
  UnicodeScalarString,
} from "./encoding.js";
import type { EnsAuthority } from "./ens.js";
import type { EnsNameIdentity } from "./name.js";
import {
  type LogicalResolverValue,
  RecordType,
  type RecordSelector,
} from "./records.js";

export const CommonClaim = Schema.Struct({
  name: UnicodeScalarString,
  node: Bytes32Hex,
  recordType: RecordType,
  recordKey: UnicodeScalarString,
  valueHash: Bytes32Hex,
  authorityVersion: AuthorityVersion,
  authority: LowercaseEthereumAddress,
  method: MethodIdentifier,
  target: UnicodeScalarString,
  issuedAt: Uint64,
  validUntil: Uint64,
});

export type CommonClaim = typeof CommonClaim.Type;

export const ProofEnvelope = Schema.Struct({
  v: ProtocolVersion,
  claim: CommonClaim,
  authoritySignature: LowercaseHex,
  proof: Schema.Record(Schema.String, Schema.Json),
});

export type ProofEnvelope = typeof ProofEnvelope.Type;

export interface DeriveCommonClaimInput {
  readonly name: EnsNameIdentity;
  readonly selector: RecordSelector;
  readonly value: LogicalResolverValue;
  readonly authorityVersion: bigint;
  readonly authority: EnsAuthority;
  readonly method: string;
  readonly target: string;
  readonly issuedAt: bigint;
  readonly validUntil: bigint;
}

export interface ProofKeyInput {
  readonly authorityVersion: bigint;
  readonly authority: string;
  readonly node: Hex;
  readonly recordType: string;
  readonly recordKey: string;
  readonly method: string;
}

export interface ValidateAuthoritySignatureInput {
  readonly authority: string;
  readonly signature: string;
  readonly digest: Hex;
  readonly blockNumber: bigint;
}

export class ClaimError extends Schema.TaggedError<ClaimError>()("ClaimError", {
  code: Schema.Literals([
    "INVALID_CLAIM",
    "CLAIM_MISMATCH",
    "INVALID_ENVELOPE",
    "ENVELOPE_TOO_LARGE",
    "INVALID_JSON",
    "DUPLICATE_JSON_MEMBER",
    "INVALID_AUTHORITY_SIGNATURE",
    "AUTHORITY_SIGNATURE_READ_FAILED",
  ]),
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Defect()),
}) {}
