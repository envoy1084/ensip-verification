import { Schema } from "effect";

export const RECORD_VERIFICATION_ERROR_CODES = [
  "INVALID_INPUT",
  "RECORD_NOT_FOUND",
  "VERIFICATION_NOT_CONFIGURED",
  "INVALID_DESCRIPTOR",
  "METHOD_NOT_APPLICABLE",
  "UNSUPPORTED_AUTHORITY",
  "UNSUPPORTED_METHOD",
  "ENS_READ_FAILED",
  "PROOF_READ_FAILED",
  "INVALID_PROOF",
  "PROOF_EXPIRED",
  "AUTHORITY_INVALID",
  "STATE_CHANGED",
] as const;

export type RecordVerificationErrorCode =
  (typeof RECORD_VERIFICATION_ERROR_CODES)[number];

export class RecordVerificationError extends Schema.TaggedError<RecordVerificationError>()(
  "RecordVerificationError",
  {
    code: Schema.Literals(RECORD_VERIFICATION_ERROR_CODES),
    reason: Schema.String,
  },
) {}
