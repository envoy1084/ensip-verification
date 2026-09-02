import type { Effect } from "effect";

import type { Descriptor, DescriptorMethodPolicy } from "./descriptor.js";
import type { EnsAuthority, EnsSnapshot } from "./ens.js";
import type { RecordVerificationError } from "./errors.js";
import type { EnsNameIdentity } from "./name.js";
import type { LogicalResolverValue, RecordSelector } from "./records.js";
import type { CommonVerification } from "./verification.js";

export interface MethodVerificationInput {
  readonly name: EnsNameIdentity;
  readonly selector: RecordSelector;
  readonly value: LogicalResolverValue;
  readonly descriptor: Descriptor;
  readonly authority: EnsAuthority;
  readonly snapshot: EnsSnapshot;
  readonly checkedAt: bigint;
}

export interface MethodVerificationResult<Id extends string, Data> {
  readonly method: Id;
  readonly target: string;
  readonly common: CommonVerification;
  readonly data: Data;
}

export interface VerificationMethod<
  Id extends string,
  Data,
  Requirements = never,
> {
  readonly id: Id;
  readonly descriptor: DescriptorMethodPolicy;
  readonly verify: (
    input: MethodVerificationInput,
  ) => Effect.Effect<
    MethodVerificationResult<Id, Data>,
    RecordVerificationError,
    Requirements
  >;
}

export interface HttpsOriginVerificationData {
  readonly proofUrl: string;
}

export interface DnsTxtVerificationData {
  readonly proofOwner: string;
}

export type HttpsOriginVerificationResult = MethodVerificationResult<
  "https-origin.v1",
  HttpsOriginVerificationData
>;

export type DnsTxtVerificationResult = MethodVerificationResult<
  "dns-txt.v1",
  DnsTxtVerificationData
>;
