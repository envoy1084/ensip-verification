import { Effect, Schema } from "effect";

import {
  bytesToHex,
  decodeFunctionResult,
  encodeFunctionData,
  hexToBytes,
  type Hex,
  type PublicClient,
} from "viem";

import {
  resolverAddressAbi,
  resolverContenthashAbi,
  resolverDataAbi,
  resolverTextAbi,
  universalResolverResolveAbi,
} from "../data/abi.js";
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  MAINNET_UNIVERSAL_RESOLVER_ADDRESS,
} from "../data/contracts.js";
import {
  type EnsRecordSnapshot,
  EnsSnapshot,
  type ReadRecordInput,
  type ReadRecordSnapshotInput,
  type ResolvedEnsRecord,
} from "../schema/ens.js";
import { RpcError } from "../schema/errors.js";
import type { EnsNameIdentity } from "../schema/name.js";
import {
  LogicalResolverValueSchema,
  type RecordSelector,
  RecordSelectorSchema,
} from "../schema/records.js";
import { deriveDiscoveryKey } from "./discovery.js";

const encodeRecordCall = (
  name: EnsNameIdentity,
  selector: RecordSelector,
): Hex => {
  const node = name.node as Hex;

  switch (selector.type) {
    case "text":
      return encodeFunctionData({
        abi: resolverTextAbi,
        functionName: "text",
        args: [node, selector.key],
      });
    case "addr":
      return encodeFunctionData({
        abi: resolverAddressAbi,
        functionName: "addr",
        args: [node, BigInt(selector.key)],
      });
    case "contenthash":
      return encodeFunctionData({
        abi: resolverContenthashAbi,
        functionName: "contenthash",
        args: [node],
      });
    case "data":
      return encodeFunctionData({
        abi: resolverDataAbi,
        functionName: "data",
        args: [node, selector.key],
      });
  }
};

const decodeRecordValue = Effect.fn("decodeRecordValue")(function* (
  selector: RecordSelector,
  response: Hex,
) {
  if (response === "0x") return null;

  const decoded = yield* Effect.try({
    try: () => {
      switch (selector.type) {
        case "text":
          return {
            type: "text" as const,
            value: decodeFunctionResult({
              abi: resolverTextAbi,
              functionName: "text",
              data: response,
            }),
          };
        case "addr":
          return {
            type: "addr" as const,
            value: hexToBytes(
              decodeFunctionResult({
                abi: resolverAddressAbi,
                functionName: "addr",
                data: response,
              }),
            ),
          };
        case "contenthash":
          return {
            type: "contenthash" as const,
            value: hexToBytes(
              decodeFunctionResult({
                abi: resolverContenthashAbi,
                functionName: "contenthash",
                data: response,
              }),
            ),
          };
        case "data":
          return {
            type: "data" as const,
            value: hexToBytes(
              decodeFunctionResult({
                abi: resolverDataAbi,
                functionName: "data",
                data: response,
              }),
            ),
          };
      }
    },
    catch: () =>
      new RpcError({
        code: "MALFORMED_RESPONSE",
        message: "resolver returned malformed record data",
      }),
  });

  if (decoded.value.length === 0) return null;

  return yield* Schema.decodeUnknownEffect(LogicalResolverValueSchema)(
    decoded,
  ).pipe(
    Effect.mapError(
      () =>
        new RpcError({
          code: "MALFORMED_RESPONSE",
          message: "resolver returned an invalid logical value",
        }),
    ),
  );
});

const readEnsSnapshot = Effect.fn("readEnsSnapshot")(function* (
  publicClient: PublicClient,
  blockNumber: bigint,
) {
  const block = yield* Effect.tryPromise({
    try: () => publicClient.getBlock({ blockNumber }),
    catch: () =>
      new RpcError({
        code: "BLOCK_UNAVAILABLE",
        message: `unable to read Ethereum block ${blockNumber}`,
      }),
  });

  return yield* Schema.decodeUnknownEffect(EnsSnapshot)({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    blockNumber: block.number,
    blockHash: block.hash,
    blockTimestamp: block.timestamp,
  }).pipe(
    Effect.mapError(
      () =>
        new RpcError({
          code: "MALFORMED_RESPONSE",
          message: "Ethereum block response is malformed",
        }),
    ),
  );
});

export const validateEnsPublicClient: (
  publicClient: PublicClient,
) => Effect.Effect<void, RpcError> = Effect.fn("validateEnsPublicClient")(
  function* (publicClient: PublicClient) {
    const chainId = publicClient.chain?.id;
    if (chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
      return yield* new RpcError({
        code: "UNSUPPORTED_ENS_CHAIN",
        message:
          chainId === undefined
            ? "PublicClient must be configured for Ethereum mainnet"
            : `PublicClient chain ${chainId} is not Ethereum mainnet`,
      });
    }
  },
);

export const readEnsRecord: (
  publicClient: PublicClient,
  input: ReadRecordInput,
) => Effect.Effect<ResolvedEnsRecord, RpcError> = Effect.fn("readEnsRecord")(
  function* (
    publicClient: PublicClient,
    { name, selector, blockNumber }: ReadRecordInput,
  ) {
    const recordCall = encodeRecordCall(name, selector);
    const [response, resolver] = yield* Effect.tryPromise({
      try: () =>
        publicClient.readContract({
          address: MAINNET_UNIVERSAL_RESOLVER_ADDRESS,
          abi: universalResolverResolveAbi,
          functionName: "resolve",
          args: [bytesToHex(name.dnsEncodedName), recordCall],
          blockNumber,
        }),
      catch: () =>
        new RpcError({
          code: "RESOLUTION_FAILED",
          message: `unable to resolve ${name.normalizedName}`,
        }),
    });

    const value = yield* decodeRecordValue(selector, response);
    return { selector, resolver, value } satisfies ResolvedEnsRecord;
  },
);

export const readEnsRecordSnapshot: (
  publicClient: PublicClient,
  input: ReadRecordSnapshotInput,
) => Effect.Effect<EnsRecordSnapshot, RpcError> = Effect.fn(
  "readEnsRecordSnapshot",
)(function* (
  publicClient: PublicClient,
  { name, selector, blockNumber }: ReadRecordSnapshotInput,
) {
  const snapshot = yield* readEnsSnapshot(publicClient, blockNumber);
  const record = yield* readEnsRecord(publicClient, {
    name,
    selector,
    blockNumber: snapshot.blockNumber,
  });
  const discoveryKey = yield* deriveDiscoveryKey(selector).pipe(
    Effect.mapError(
      () =>
        new RpcError({
          code: "MALFORMED_RESPONSE",
          message: "unable to derive the discovery key",
        }),
    ),
  );
  const discoverySelector = yield* Schema.decodeUnknownEffect(
    RecordSelectorSchema,
  )({ type: "text", key: discoveryKey.key }).pipe(
    Effect.mapError(
      () =>
        new RpcError({
          code: "MALFORMED_RESPONSE",
          message: "derived discovery selector is invalid",
        }),
    ),
  );
  const discovery = yield* readEnsRecord(publicClient, {
    name,
    selector: discoverySelector,
    blockNumber: snapshot.blockNumber,
  });

  return { snapshot, record, discovery } satisfies EnsRecordSnapshot;
});
