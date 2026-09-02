import { isIP } from "node:net";

import { Effect } from "effect";

import { base32nopad } from "@scure/base";
import { hexToBytes, type Hex } from "viem";

import { DNS_TXT_PROOF_LABEL } from "../data/methods.js";
import { VerificationError } from "../schema/errors.js";
import { parseHttpsRecordUrl } from "./url.js";

export const deriveDnsTxtTarget = Effect.fn("deriveDnsTxtTarget")(function* (
  value: string,
) {
  const url = yield* parseHttpsRecordUrl(value);
  const hostname = url.hostname;
  const unbracketedHostname =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;

  if (isIP(unbracketedHostname) !== 0) {
    return yield* new VerificationError({
      code: "INVALID_METHOD_TARGET",
      message: "dns-txt.v1 requires a domain hostname, not an IP address",
    });
  }

  return hostname;
});

export const encodeDnsProofKey = (proofKey: Hex): string =>
  base32nopad.encode(hexToBytes(proofKey)).toLowerCase();

export const deriveDnsProofOwner = Effect.fn("deriveDnsProofOwner")(function* (
  target: string,
  proofKey: Hex,
) {
  const encodedProofKey = encodeDnsProofKey(proofKey);
  const owner = `${encodedProofKey}.${DNS_TXT_PROOF_LABEL}.${target}.`;
  const labels = owner.slice(0, -1).split(".");
  const labelByteLengths = labels.map(
    (label) => new TextEncoder().encode(label).byteLength,
  );

  if (labelByteLengths.some((length) => length === 0 || length > 63)) {
    return yield* new VerificationError({
      code: "INVALID_METHOD_TARGET",
      message: "derived DNS proof owner contains an invalid label length",
    });
  }

  const wireLength =
    1 + labelByteLengths.reduce((length, label) => length + 1 + label, 0);
  if (wireLength > 255) {
    return yield* new VerificationError({
      code: "INVALID_METHOD_TARGET",
      message: "derived DNS proof owner exceeds the DNS wire-name limit",
    });
  }

  return owner;
});
