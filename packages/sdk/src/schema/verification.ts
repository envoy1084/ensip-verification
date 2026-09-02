import { type Effect, Schema } from "effect";

import type { ProofEnvelope } from "./claims.js";
import type { Descriptor } from "./descriptor.js";
import type { EnsAuthority, EnsSnapshot } from "./ens.js";
import type { RecordVerificationError } from "./errors.js";
import type { EnsNameIdentity } from "./name.js";
import type { LogicalResolverValue, RecordSelector } from "./records.js";

export interface ClaimLifecycleInput {
  readonly issuedAt: bigint;
  readonly validUntil: bigint;
  readonly checkedAt: bigint;
  readonly methodMaxLifetime: bigint;
  readonly authorityValidUntil?: bigint;
  readonly methodEvidenceValidUntil?: bigint;
  readonly methodEvidenceCacheUntil?: bigint;
}

export const VerificationLifetime = Schema.Struct({
  effectiveValidUntil: Schema.BigInt,
  cacheUntil: Schema.BigInt,
});

export type VerificationLifetime = typeof VerificationLifetime.Type;

export type MethodProofValidator = (
  proof: ProofEnvelope["proof"],
) => Effect.Effect<void, RecordVerificationError>;

export interface VerifyCommonProofInput {
  readonly name: EnsNameIdentity;
  readonly selector: RecordSelector;
  readonly value: LogicalResolverValue;
  readonly descriptor: Descriptor;
  readonly authority: EnsAuthority;
  readonly target: string;
  readonly envelopeBytes: Uint8Array;
  readonly snapshot: EnsSnapshot;
  readonly checkedAt: bigint;
  readonly methodMaxLifetime: bigint;
  readonly validateProof: MethodProofValidator;
  readonly methodEvidenceValidUntil?: bigint;
  readonly methodEvidenceCacheUntil?: bigint;
}

export interface CommonVerification {
  readonly envelope: ProofEnvelope;
  readonly digest: `0x${string}`;
  readonly effectiveValidUntil: bigint;
  readonly cacheUntil: bigint;
}
