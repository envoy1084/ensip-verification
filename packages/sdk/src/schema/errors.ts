import { Schema } from "effect";

import {
  RPC_ERROR_CODES,
  VALIDATION_ERROR_CODES,
  VERIFICATION_ERROR_CODES,
} from "../data/errors.js";

export class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    code: Schema.Literals(VALIDATION_ERROR_CODES),
    message: Schema.String,
  },
) {}

export class VerificationError extends Schema.TaggedError<VerificationError>()(
  "VerificationError",
  {
    code: Schema.Literals(VERIFICATION_ERROR_CODES),
    message: Schema.String,
  },
) {}

export class RpcError extends Schema.TaggedError<RpcError>()("RpcError", {
  code: Schema.Literals(RPC_ERROR_CODES),
  message: Schema.String,
}) {}
