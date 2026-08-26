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
).pipe(Schema.brand("NormalizedEnsName"));

export type NormalizedEnsName = typeof NormalizedEnsName.Type;

export const EnsNode = Schema.String.check(
  Schema.isPattern(/^0x[0-9a-f]{64}$/, {
    expected: "a lowercase 32-byte ENS node",
  }),
).pipe(Schema.brand("EnsNode"));

export type EnsNode = typeof EnsNode.Type;

export const DnsEncodedEnsName = Schema.Uint8Array.pipe(
  Schema.brand("DnsEncodedEnsName"),
);

export type DnsEncodedEnsName = typeof DnsEncodedEnsName.Type;

export const EnsNameIdentity = Schema.Struct({
  normalizedName: NormalizedEnsName,
  node: EnsNode,
  dnsEncodedName: DnsEncodedEnsName,
});

export type EnsNameIdentity = typeof EnsNameIdentity.Type;

export class InvalidEnsNameError extends Schema.TaggedError<InvalidEnsNameError>()(
  "InvalidEnsNameError",
  { message: Schema.String },
) {}
