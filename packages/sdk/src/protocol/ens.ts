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
  EnsReadError,
  type EnsRecordSnapshot,
  EnsSnapshot,
  type ReadRecordInput,
  type ReadRecordSnapshotInput,
  type ResolvedEnsRecord,
  UnsupportedEnsChainError,
} from "../schema/ens.js";
import type { EnsNameIdentity } from "../schema/name.js";
import {
  LogicalResolverValue,
  RecordSelector,
  type RecordSelector as RecordSelectorType,
} from "../schema/records.js";
import {
  resolverAddressAbi,
  resolverContenthashAbi,
  resolverDataAbi,
  resolverTextAbi,
  universalResolverResolveAbi,
} from "./abi.js";
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  MAINNET_UNIVERSAL_RESOLVER_ADDRESS,
} from "./contracts.js";
import { deriveDiscoveryKey } from "./discovery.js";

const encodeRecordCall = (
  name: EnsNameIdentity,
  selector: RecordSelectorType,
): Hex => {
  const node = name.node as Hex;

  switch (selector["_tag"]) {
    case "Text":
      return encodeFunctionData({
        abi: resolverTextAbi,
        functionName: "text",
        args: [node, selector.key],
      });
    case "Address":
      return encodeFunctionData({
        abi: resolverAddressAbi,
        functionName: "addr",
        args: [node, selector.coinType],
      });
    case "Contenthash":
      return encodeFunctionData({
        abi: resolverContenthashAbi,
        functionName: "contenthash",
        args: [node],
      });
    case "Data":
      return encodeFunctionData({
        abi: resolverDataAbi,
        functionName: "data",
        args: [node, selector.key],
      });
  }
};

const decodeRecordValue = Effect.fn("decodeRecordValue")(function* (
  selector: RecordSelectorType,
  response: Hex,
) {
  if (response === "0x") return null;

  const decoded = yield* Effect.try({
    try: () => {
      switch (selector["_tag"]) {
        case "Text":
          return {
            _tag: "Text" as const,
            value: decodeFunctionResult({
              abi: resolverTextAbi,
              functionName: "text",
              data: response,
            }),
          };
        case "Address":
          return {
            _tag: "Address" as const,
            value: hexToBytes(
              decodeFunctionResult({
                abi: resolverAddressAbi,
                functionName: "addr",
                data: response,
              }),
            ),
          };
        case "Contenthash":
          return {
            _tag: "Contenthash" as const,
            value: hexToBytes(
              decodeFunctionResult({
                abi: resolverContenthashAbi,
                functionName: "contenthash",
                data: response,
              }),
            ),
          };
        case "Data":
          return {
            _tag: "Data" as const,
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
    catch: (cause) =>
      new EnsReadError({
        code: "MALFORMED_RESPONSE",
        message: "resolver returned malformed record data",
        cause,
      }),
  });

  if (decoded.value.length === 0) return null;

  return yield* Schema.decodeUnknownEffect(LogicalResolverValue)(decoded).pipe(
    Effect.mapError(
      (cause) =>
        new EnsReadError({
          code: "MALFORMED_RESPONSE",
          message: "resolver returned an invalid logical value",
          cause,
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
    catch: (cause) =>
      new EnsReadError({
        code: "BLOCK_UNAVAILABLE",
        message: `unable to read Ethereum block ${blockNumber}`,
        cause,
      }),
  });

  return yield* Schema.decodeUnknownEffect(EnsSnapshot)({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    blockNumber: block.number,
    blockHash: block.hash,
    blockTimestamp: block.timestamp,
  }).pipe(
    Effect.mapError(
      (cause) =>
        new EnsReadError({
          code: "MALFORMED_RESPONSE",
          message: "Ethereum block response is malformed",
          cause,
        }),
    ),
  );
});

export const validateEnsPublicClient: (
  publicClient: PublicClient,
) => Effect.Effect<void, UnsupportedEnsChainError> = Effect.fn(
  "validateEnsPublicClient",
)(function* (publicClient: PublicClient) {
  const chainId = publicClient.chain?.id;
  if (chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
    return yield* new UnsupportedEnsChainError({
      code: "UNSUPPORTED_ENS_CHAIN",
      ...(chainId === undefined ? {} : { chainId }),
      message: "EnsService requires an Ethereum mainnet PublicClient",
    });
  }
});

export const readEnsRecord: (
  publicClient: PublicClient,
  input: ReadRecordInput,
) => Effect.Effect<ResolvedEnsRecord, EnsReadError> = Effect.fn(
  "readEnsRecord",
)(function* (
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
    catch: (cause) =>
      new EnsReadError({
        code: "RESOLUTION_FAILED",
        message: `unable to resolve ${name.normalizedName}`,
        cause,
      }),
  });

  const value = yield* decodeRecordValue(selector, response);
  return { selector, resolver, value } satisfies ResolvedEnsRecord;
});

export const readEnsRecordSnapshot: (
  publicClient: PublicClient,
  input: ReadRecordSnapshotInput,
) => Effect.Effect<EnsRecordSnapshot, EnsReadError> = Effect.fn(
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
      (cause) =>
        new EnsReadError({
          code: "MALFORMED_RESPONSE",
          message: "unable to derive the discovery key",
          cause,
        }),
    ),
  );
  const discoverySelector = yield* Schema.decodeUnknownEffect(RecordSelector)({
    _tag: "Text",
    key: discoveryKey.key,
  }).pipe(
    Effect.mapError(
      (cause) =>
        new EnsReadError({
          code: "MALFORMED_RESPONSE",
          message: "derived discovery selector is invalid",
          cause,
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
