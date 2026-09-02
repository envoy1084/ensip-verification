import { Effect, Schema } from "effect";

import {
  AbsoluteProofUri,
  type Descriptor,
  MethodIdentifier,
  AuthorityVersion,
} from "../schema/descriptor.js";
import { RecordVerificationError } from "../schema/errors.js";
import { DESCRIPTOR_MAX_BYTES } from "../spec/limits.js";

export const parseDescriptor = Effect.fn("parseDescriptor")(function* (
  input: string,
): Effect.fn.Return<Descriptor, RecordVerificationError> {
  if (
    input.length === 0 ||
    input.length > DESCRIPTOR_MAX_BYTES ||
    Array.from(input).some((character) => character.charCodeAt(0) > 0x7f)
  ) {
    return yield* new RecordVerificationError({
      code: "INVALID_DESCRIPTOR",
      reason: "descriptor must contain 1-2048 ASCII bytes",
    });
  }

  const tokens = input.split(" ");
  if (
    tokens.some((token) => token.length === 0) ||
    tokens.length < 3 ||
    tokens.length > 4
  ) {
    return yield* new RecordVerificationError({
      code: "INVALID_DESCRIPTOR",
      reason:
        "descriptor must contain a version and two or three single-space fields",
    });
  }
  if (tokens[0] !== "ensrv1") {
    return yield* new RecordVerificationError({
      code: "INVALID_DESCRIPTOR",
      reason: "unsupported common protocol version",
    });
  }

  const fields = new Map<string, string>();
  for (const token of tokens.slice(1)) {
    const separator = token.indexOf("=");
    if (separator <= 0 || separator === token.length - 1) {
      return yield* new RecordVerificationError({
        code: "INVALID_DESCRIPTOR",
        reason: "descriptor field must have a non-empty name and value",
      });
    }
    const name = token.slice(0, separator);
    if (name !== "a" && name !== "m" && name !== "u") {
      return yield* new RecordVerificationError({
        code: "INVALID_DESCRIPTOR",
        reason: `unknown descriptor field: ${name}`,
      });
    }
    if (fields.has(name)) {
      return yield* new RecordVerificationError({
        code: "INVALID_DESCRIPTOR",
        reason: `duplicate descriptor field: ${name}`,
      });
    }
    fields.set(name, token.slice(separator + 1));
  }

  const authorityInput = fields.get("a");
  const methodInput = fields.get("m");
  if (authorityInput === undefined || methodInput === undefined) {
    return yield* new RecordVerificationError({
      code: "INVALID_DESCRIPTOR",
      reason: "descriptor requires exactly one a field and one m field",
    });
  }

  const authorityVersion = yield* Schema.decodeUnknownEffect(AuthorityVersion)(
    authorityInput,
  ).pipe(
    Effect.mapError(
      () =>
        new RecordVerificationError({
          code: "INVALID_DESCRIPTOR",
          reason: "invalid authority version",
        }),
    ),
  );
  const method = yield* Schema.decodeUnknownEffect(MethodIdentifier)(
    methodInput,
  ).pipe(
    Effect.mapError(
      () =>
        new RecordVerificationError({
          code: "INVALID_DESCRIPTOR",
          reason: "invalid method identifier",
        }),
    ),
  );

  const uriInput = fields.get("u");
  let proofUri: Descriptor["proofUri"];
  if (uriInput !== undefined) {
    proofUri = yield* Schema.decodeUnknownEffect(AbsoluteProofUri)(
      uriInput,
    ).pipe(
      Effect.mapError(
        () =>
          new RecordVerificationError({
            code: "INVALID_DESCRIPTOR",
            reason: "invalid absolute proof URI",
          }),
      ),
    );
  }

  return {
    protocolVersion: "ensrv1",
    authorityVersion,
    method,
    ...(proofUri === undefined ? {} : { proofUri }),
  };
});
