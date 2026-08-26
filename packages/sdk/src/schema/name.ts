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

export const DnsEncodedEnsName = Schema.Uint8Array;

export type DnsEncodedEnsName = typeof DnsEncodedEnsName.Type;

export const EnsNameIdentity = Schema.Struct({
  normalizedName: NormalizedEnsName,
  node: EnsNode,
  dnsEncodedName: DnsEncodedEnsName,
});

export type EnsNameIdentity = typeof EnsNameIdentity.Type;

export class InvalidEnsNameError extends Schema.TaggedError<InvalidEnsNameError>()(
  "InvalidEnsNameError",
  {
    code: Schema.Literal("INVALID_ENS_NAME"),
    message: Schema.String,
  },
) {}
