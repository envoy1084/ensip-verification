import { Schema } from "effect";

import { normalize } from "viem/ens";

export const NormalizedEnsName = Schema.String.check(
  Schema.makeFilter((value) => {
    try {
      return normalize(value) === value || "ENS name is not normalized";
    } catch {
      return "ENS name is invalid under ENSIP-15";
    }
  }),
);

export type NormalizedEnsName = typeof NormalizedEnsName.Type;

export const EnsNode = Schema.String.check(
  Schema.isPattern(/^0x[0-9a-f]{64}$/, {
    expected: "a lowercase 32-byte ENS node",
  }),
);

export type EnsNode = typeof EnsNode.Type;

export const EnsNameIdentity = Schema.Struct({
  normalizedName: NormalizedEnsName,
  node: EnsNode,
});

export type EnsNameIdentity = typeof EnsNameIdentity.Type;
