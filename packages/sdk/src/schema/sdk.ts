import { Schema } from "effect";

import type { PublicClient } from "viem";

export interface RecordVerificationOptions {
  readonly publicClient: PublicClient;
}

interface TextRecordQuery {
  readonly name: string;
  readonly type: "text";
  readonly key: string;
}

interface AddressRecordQuery {
  readonly name: string;
  readonly type: "addr";
  readonly key: string;
}

interface ContenthashRecordQuery {
  readonly name: string;
  readonly type: "contenthash";
  readonly key?: never;
}

interface DataRecordQuery {
  readonly name: string;
  readonly type: "data";
  readonly key: string;
}

type RecordQuery =
  | TextRecordQuery
  | AddressRecordQuery
  | ContenthashRecordQuery
  | DataRecordQuery;

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
  readonly code:
    | "INVALID_RECORD_INPUT"
    | "INVALID_ENS_NAME"
    | "UNSUPPORTED_ENS_CHAIN"
    | "BLOCK_UNAVAILABLE"
    | "RESOLUTION_FAILED"
    | "MALFORMED_RESPONSE"
    | "VERIFICATION_NOT_IMPLEMENTED";
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

export class InvalidRecordInputError extends Schema.TaggedError<InvalidRecordInputError>()(
  "InvalidRecordInputError",
  {
    code: Schema.Literal("INVALID_RECORD_INPUT"),
    message: Schema.String,
  },
) {}

export class VerificationNotImplementedError extends Schema.TaggedError<VerificationNotImplementedError>()(
  "VerificationNotImplementedError",
  {
    code: Schema.Literal("VERIFICATION_NOT_IMPLEMENTED"),
    message: Schema.String,
  },
) {}
