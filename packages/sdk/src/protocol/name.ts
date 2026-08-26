import { Effect, Predicate } from "effect";

import { namehash, normalize, packetToBytes } from "viem/ens";

import {
  DnsEncodedEnsName,
  EnsNode,
  type EnsNameIdentity,
  InvalidEnsNameError,
  NormalizedEnsName,
} from "../schema/name.js";

export const prepareEnsName = Effect.fn("prepareEnsName")(function* (
  input: string,
): Effect.fn.Return<EnsNameIdentity, InvalidEnsNameError> {
  const normalized = yield* Effect.try({
    try: () => normalize(input),
    catch: (cause) =>
      new InvalidEnsNameError({
        message: Predicate.isError(cause) ? cause.message : "invalid ENS name",
      }),
  });

  const normalizedName = NormalizedEnsName.make(normalized);
  return {
    normalizedName,
    node: EnsNode.make(namehash(normalizedName)),
    dnsEncodedName: DnsEncodedEnsName.make(packetToBytes(normalizedName)),
  };
});
