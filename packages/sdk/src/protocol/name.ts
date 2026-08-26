import { Effect, Predicate } from "effect";

import { namehash, normalize, packetToBytes } from "viem/ens";

import { type EnsNameIdentity, InvalidEnsNameError } from "../schema/name.js";

export const prepareEnsName = Effect.fn("prepareEnsName")(function* (
  input: string,
): Effect.fn.Return<EnsNameIdentity, InvalidEnsNameError> {
  const normalized = yield* Effect.try({
    try: () => normalize(input),
    catch: (cause) =>
      new InvalidEnsNameError({
        code: "INVALID_ENS_NAME",
        message: Predicate.isError(cause) ? cause.message : "invalid ENS name",
      }),
  });

  return {
    normalizedName: normalized,
    node: namehash(normalized),
    dnsEncodedName: packetToBytes(normalized),
  };
});
