import { Effect, Predicate } from "effect";

import { namehash, normalize } from "viem/ens";

import { ValidationError } from "../schema/errors.js";
import type { EnsNameIdentity } from "../schema/name.js";

export const prepareEnsName = Effect.fn("prepareEnsName")(function* (
  input: string,
): Effect.fn.Return<EnsNameIdentity, ValidationError> {
  const normalized = yield* Effect.try({
    try: () => normalize(input),
    catch: (cause) =>
      new ValidationError({
        code: "INVALID_ENS_NAME",
        message: Predicate.isError(cause) ? cause.message : "invalid ENS name",
      }),
  });

  return {
    normalizedName: normalized,
    node: namehash(normalized),
  };
});
