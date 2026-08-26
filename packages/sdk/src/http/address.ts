import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { Effect } from "effect";

import ipaddr from "ipaddr.js";

import { RpcError, VerificationError } from "../schema/errors.js";

export interface ResolvedHttpAddress {
  readonly address: string;
  readonly family: 4 | 6;
}

const isGloballyReachable = (address: string): boolean =>
  ipaddr.process(address).range() === "unicast";

export const resolveHttpAddress = Effect.fn("resolveHttpAddress")(function* (
  hostname: string,
) {
  const unbracketedHostname =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  const literalFamily = isIP(unbracketedHostname);

  if (literalFamily !== 0) {
    if (!isGloballyReachable(unbracketedHostname)) {
      return yield* new VerificationError({
        code: "HTTP_ADDRESS_BLOCKED",
        message: "HTTP destination is not globally reachable",
      });
    }

    return {
      address: unbracketedHostname,
      family: literalFamily === 4 ? 4 : 6,
    } satisfies ResolvedHttpAddress;
  }

  const addresses = yield* Effect.tryPromise({
    try: () => lookup(unbracketedHostname, { all: true, verbatim: true }),
    catch: () =>
      new RpcError({
        code: "HTTP_DNS_FAILED",
        message: "unable to resolve the HTTP destination",
      }),
  });

  const selected = addresses[0];
  if (selected === undefined) {
    return yield* new RpcError({
      code: "HTTP_DNS_FAILED",
      message: "HTTP destination did not resolve to an address",
    });
  }

  if (addresses.some(({ address }) => !isGloballyReachable(address))) {
    return yield* new VerificationError({
      code: "HTTP_ADDRESS_BLOCKED",
      message: "HTTP destination resolved to a non-global address",
    });
  }

  return {
    address: selected.address,
    family: selected.family === 4 ? 4 : 6,
  } satisfies ResolvedHttpAddress;
});
