import type { PublicClient } from "viem";

import type { SdkErrorCode } from "../data/errors.js";
import type { RecordSelector } from "./records.js";

export interface RecordVerificationOptions {
  readonly publicClient: PublicClient;
}

type RecordQuery = RecordSelector & { readonly name: string };

type VerificationOption<Verify extends boolean> = Verify extends true
  ? { readonly verify: true }
  : { readonly verify?: false };

export type GetRecordInput<Verify extends boolean = false> = RecordQuery &
  VerificationOption<Verify>;

export type VerificationResult =
  | { readonly verified: true; readonly verificationType: "control" }
  | { readonly verified: false };

export interface GetRecordData<Verify extends boolean = false> {
  readonly value: string | null;
  readonly verification: Verify extends true ? VerificationResult : null;
}

export interface RecordVerificationError {
  readonly code: SdkErrorCode;
  readonly message: string;
}

export type GetRecordResult<Verify extends boolean = false> =
  | {
      readonly success: true;
      readonly data: GetRecordData<Verify>;
    }
  | {
      readonly success: false;
      readonly error: RecordVerificationError;
    };
