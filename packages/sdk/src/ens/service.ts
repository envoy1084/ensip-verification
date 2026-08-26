import { Context, Effect, Layer, Schema } from "effect";

import {
  bytesToHex,
  decodeFunctionResult,
  encodeFunctionData,
  hexToBytes,
  type Hex,
  type PublicClient,
} from "viem";

import { deriveDiscoveryKey } from "../protocol/discovery.js";
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  MAINNET_UNIVERSAL_RESOLVER_ADDRESS,
  resolverAddressAbi,
  resolverContenthashAbi,
  resolverDataAbi,
  resolverTextAbi,
  universalResolverResolveAbi,
} from "../protocol/ens.js";
import {
  EnsReadError,
  type EnsRecordSnapshot,
  EnsSnapshot,
  type ResolvedEnsRecord,
  UnsupportedEnsChainError,
} from "../schema/ens.js";
import type { EnsNameIdentity } from "../schema/name.js";
import {
  LogicalResolverValue,
  RecordSelector,
  type RecordSelector as RecordSelectorType,
} from "../schema/records.js";

export interface ReadRecordInput {
  readonly name: EnsNameIdentity;
  readonly selector: RecordSelectorType;
  readonly snapshot: EnsSnapshot;
}

export interface ReadRecordSnapshotInput {
  readonly name: EnsNameIdentity;
  readonly selector: RecordSelectorType;
  readonly blockNumber: bigint;
}

const ensReadError = (
  reason: EnsReadError["reason"],
  message: string,
  cause?: unknown,
) =>
  new EnsReadError({
    reason,
    message,
    ...(cause === undefined ? {} : { cause }),
  });

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

const decodeRecordValue = Effect.fn("EnsService.decodeRecordValue")(function* (
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
      ensReadError(
        "malformed_response",
        "resolver returned malformed record data",
        cause,
      ),
  });

  if (decoded.value.length === 0) return null;

  return yield* Schema.decodeUnknownEffect(LogicalResolverValue)(decoded).pipe(
    Effect.mapError((cause) =>
      ensReadError(
        "malformed_response",
        "resolver returned an invalid logical value",
        cause,
      ),
    ),
  );
});

const makeEnsService = Effect.fn("EnsService.make")(function* (
  publicClient: PublicClient,
) {
  const chainId = publicClient.chain?.id;
  if (chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
    return yield* new UnsupportedEnsChainError({
      ...(chainId === undefined ? {} : { chainId }),
      message: "EnsService requires an Ethereum mainnet PublicClient",
    });
  }

  const readSnapshot = Effect.fn("EnsService.readSnapshot")(function* (
    blockNumber: bigint,
  ) {
    const block = yield* Effect.tryPromise({
      try: () => publicClient.getBlock({ blockNumber }),
      catch: (cause) =>
        ensReadError(
          "block_unavailable",
          `unable to read Ethereum block ${blockNumber}`,
          cause,
        ),
    });

    return yield* Schema.decodeUnknownEffect(EnsSnapshot)({
      chainId: ETHEREUM_MAINNET_CHAIN_ID,
      blockNumber: block.number,
      blockHash: block.hash,
      blockTimestamp: block.timestamp,
    }).pipe(
      Effect.mapError((cause) =>
        ensReadError(
          "malformed_response",
          "Ethereum block response is malformed",
          cause,
        ),
      ),
    );
  });

  const readRecord = Effect.fn("EnsService.readRecord")(function* ({
    name,
    selector,
    snapshot,
  }: ReadRecordInput) {
    const recordCall = encodeRecordCall(name, selector);
    const [response, resolver] = yield* Effect.tryPromise({
      try: () =>
        publicClient.readContract({
          address: MAINNET_UNIVERSAL_RESOLVER_ADDRESS,
          abi: universalResolverResolveAbi,
          functionName: "resolve",
          args: [bytesToHex(name.dnsEncodedName), recordCall],
          blockNumber: snapshot.blockNumber,
        }),
      catch: (cause) =>
        ensReadError(
          "resolution_failed",
          `unable to resolve ${name.normalizedName}`,
          cause,
        ),
    });

    const value = yield* decodeRecordValue(selector, response);
    return {
      selector,
      resolver,
      value,
    } satisfies ResolvedEnsRecord;
  });

  const readRecordSnapshot = Effect.fn("EnsService.readRecordSnapshot")(
    function* ({ name, selector, blockNumber }: ReadRecordSnapshotInput) {
      const snapshot = yield* readSnapshot(blockNumber);
      const record = yield* readRecord({ name, selector, snapshot });
      const discoveryKey = yield* deriveDiscoveryKey(selector).pipe(
        Effect.mapError((cause) =>
          ensReadError(
            "malformed_response",
            "unable to derive the discovery key",
            cause,
          ),
        ),
      );
      const discoverySelector = yield* Schema.decodeUnknownEffect(
        RecordSelector,
      )({
        _tag: "Text",
        key: discoveryKey.key,
      }).pipe(
        Effect.mapError((cause) =>
          ensReadError(
            "malformed_response",
            "derived discovery selector is invalid",
            cause,
          ),
        ),
      );
      const discovery = yield* readRecord({
        name,
        selector: discoverySelector,
        snapshot,
      });

      return { snapshot, record, discovery } satisfies EnsRecordSnapshot;
    },
  );

  return EnsService.of({ readRecord, readRecordSnapshot });
});

export class EnsService extends Context.Service<
  EnsService,
  {
    readonly readRecord: (
      input: ReadRecordInput,
    ) => Effect.Effect<ResolvedEnsRecord, EnsReadError>;
    readonly readRecordSnapshot: (
      input: ReadRecordSnapshotInput,
    ) => Effect.Effect<EnsRecordSnapshot, EnsReadError>;
  }
>()("@ens-record-verification/sdk/EnsService") {
  static readonly layer = (publicClient: PublicClient) =>
    Layer.effect(EnsService, makeEnsService(publicClient));
}
