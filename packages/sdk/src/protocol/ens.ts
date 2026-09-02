import { Effect, Schema } from "effect";

import type { Ensforge } from "@ensforge/sdk";
import { hexToBytes, type Hex, type PublicClient } from "viem";

import {
  type EnsRecordSnapshot,
  EnsSnapshot,
  type ReadRecordSnapshotInput,
  type ResolvedEnsRecord,
} from "../schema/ens.js";
import { RpcError, VerificationError } from "../schema/errors.js";
import type { RecordSelector } from "../schema/records.js";
import { deriveDiscoveryKey } from "./discovery.js";

const readSelectedRecord = (
  selector: RecordSelector,
  result: {
    readonly texts?: ReadonlyArray<{
      readonly key: string;
      readonly value: string | null;
    }>;
    readonly addresses?: ReadonlyArray<{ readonly raw: string | null }>;
    readonly contentHash?: { readonly raw: string | null };
    readonly data?: ReadonlyArray<{
      readonly key: string;
      readonly value: string | null;
    }>;
  },
): ResolvedEnsRecord => {
  switch (selector.type) {
    case "text": {
      const value =
        result.texts?.find((record) => record.key === selector.key)?.value ??
        null;
      return {
        selector,
        value: value === null ? null : { type: "text", value },
      };
    }
    case "addr": {
      const raw = result.addresses?.[0]?.raw ?? null;
      return {
        selector,
        value:
          raw === null ? null : { type: "addr", value: hexToBytes(raw as Hex) },
      };
    }
    case "contenthash": {
      const raw = result.contentHash?.raw ?? null;
      return {
        selector,
        value:
          raw === null
            ? null
            : { type: "contenthash", value: hexToBytes(raw as Hex) },
      };
    }
    case "data": {
      const raw =
        result.data?.find((record) => record.key === selector.key)?.value ??
        null;
      return {
        selector,
        value:
          raw === null ? null : { type: "data", value: hexToBytes(raw as Hex) },
      };
    }
  }
};

export const readEnsRecord = Effect.fn("readEnsRecord")(function* (
  ensforge: Ensforge,
  name: ReadRecordSnapshotInput["name"],
  selector: RecordSelector,
) {
  const records = {
    ...(selector.type === "text" ? { texts: [selector.key] } : {}),
    ...(selector.type === "addr" ? { addresses: [BigInt(selector.key)] } : {}),
    ...(selector.type === "contenthash" ? { contentHash: true as const } : {}),
    ...(selector.type === "data" ? { data: [selector.key] } : {}),
  };
  const result = yield* ensforge.records.getRecords
    .effect({ name: name.normalizedName, records })
    .pipe(
      Effect.mapError(
        () =>
          new RpcError({
            code: "RESOLUTION_FAILED",
            message: `unable to resolve ${name.normalizedName}`,
          }),
      ),
    );
  return readSelectedRecord(selector, result);
});

const readEnsSnapshot = Effect.fn("readEnsSnapshot")(function* (
  publicClient: PublicClient,
) {
  const block = yield* Effect.tryPromise({
    try: () => publicClient.getBlock({ blockTag: "latest" }),
    catch: () =>
      new RpcError({
        code: "BLOCK_UNAVAILABLE",
        message: "unable to select an Ethereum block",
      }),
  });

  return yield* Schema.decodeUnknownEffect(EnsSnapshot)({
    chainId: 1,
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

export const readEnsRecordSnapshot: (
  ensforge: Ensforge,
  publicClient: PublicClient,
  input: ReadRecordSnapshotInput,
) => Effect.Effect<EnsRecordSnapshot, RpcError> = Effect.fn(
  "readEnsRecordSnapshot",
)(function* (
  ensforge: Ensforge,
  publicClient: PublicClient,
  { name, selector }: ReadRecordSnapshotInput,
) {
  const snapshot = yield* readEnsSnapshot(publicClient);
  const discoveryKey = yield* deriveDiscoveryKey(selector).pipe(
    Effect.mapError(
      () =>
        new RpcError({
          code: "MALFORMED_RESPONSE",
          message: "unable to derive the discovery key",
        }),
    ),
  );
  const records = {
    texts:
      selector.type === "text"
        ? [selector.key, discoveryKey.key]
        : [discoveryKey.key],
    ...(selector.type === "addr" ? { addresses: [BigInt(selector.key)] } : {}),
    ...(selector.type === "contenthash" ? { contentHash: true as const } : {}),
    ...(selector.type === "data" ? { data: [selector.key] } : {}),
  };
  const result = yield* ensforge.records.getRecords
    .effect({
      name: name.normalizedName,
      records,
      blockNumber: snapshot.blockNumber,
    })
    .pipe(
      Effect.mapError(
        () =>
          new RpcError({
            code: "RESOLUTION_FAILED",
            message: `unable to resolve ${name.normalizedName}`,
          }),
      ),
    );
  const record = readSelectedRecord(selector, result);
  const discoverySelector = { type: "text" as const, key: discoveryKey.key };
  const discoveryValue =
    result.texts?.find((entry) => entry.key === discoveryKey.key)?.value ??
    null;
  const discovery: ResolvedEnsRecord = {
    selector: discoverySelector,
    value:
      discoveryValue === null ? null : { type: "text", value: discoveryValue },
  };

  return { snapshot, record, discovery } satisfies EnsRecordSnapshot;
});

export const ensureEnsSnapshotCanonical: (
  publicClient: PublicClient,
  snapshot: EnsRecordSnapshot["snapshot"],
) => Effect.Effect<void, RpcError | VerificationError> = Effect.fn(
  "ensureEnsSnapshotCanonical",
)(function* (
  publicClient: PublicClient,
  snapshot: EnsRecordSnapshot["snapshot"],
) {
  const block = yield* Effect.tryPromise({
    try: () => publicClient.getBlock({ blockNumber: snapshot.blockNumber }),
    catch: () =>
      new RpcError({
        code: "BLOCK_UNAVAILABLE",
        message: "unable to recheck the Ethereum snapshot",
      }),
  });
  if (block.hash?.toLowerCase() !== snapshot.blockHash) {
    return yield* new VerificationError({
      code: "ENS_SNAPSHOT_CHANGED",
      message: "the ENS evaluation block is no longer canonical",
    });
  }
});
