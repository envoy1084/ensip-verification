import { Effect, Predicate } from "effect";

import { namehash, normalizeName } from "@ensforge/core";

import { RecordVerificationError } from "../schema/errors.js";
import type { EnsNameIdentity } from "../schema/name.js";

export const prepareEnsName = Effect.fn("prepareEnsName")(function* (
  input: string,
): Effect.fn.Return<EnsNameIdentity, RecordVerificationError> {
  const normalized = yield* normalizeName.effect(input).pipe(
    Effect.mapError(
      (cause) =>
        new RecordVerificationError({
          code: "INVALID_INPUT",
          reason: Predicate.isError(cause) ? cause.message : "invalid ENS name",
        }),
    ),
  );

  return {
    normalizedName: normalized,
    node: namehash(normalized),
  };
});
