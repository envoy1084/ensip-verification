import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { encodeFunctionResult, type Hex, type PublicClient } from "viem";

import { resolverTextAbi } from "../src/data/abi.js";
import { EnsService } from "../src/ens/service.js";
import { prepareEnsName } from "../src/protocol/name.js";
import { RecordSelectorSchema } from "../src/schema/records.js";

const resolverAddress = "0x0000000000000000000000000000000000000123";
const blockHash = `0x${"ab".repeat(32)}` as Hex;

describe("EnsService", () => {
  it.effect("reads the record and discovery value at one block", () => {
    const contractReads: Array<{ readonly blockNumber?: bigint }> = [];
    const resolverValues = [
      "https://example.com/profile",
      "ensrv1 a=1 m=https-origin.v1",
    ];
    const publicClient = {
      chain: { id: 1 },
      getBlock: async ({ blockNumber }: { blockNumber: bigint }) => ({
        number: blockNumber,
        hash: blockHash,
        timestamp: 1_756_000_000n,
      }),
      readContract: async (parameters: { blockNumber?: bigint }) => {
        contractReads.push(parameters);
        const value = resolverValues.shift();
        if (value === undefined) throw new Error("unexpected resolver read");
        return [
          encodeFunctionResult({
            abi: resolverTextAbi,
            functionName: "text",
            result: value,
          }),
          resolverAddress,
        ] as const;
      },
    } as unknown as PublicClient;

    return Effect.gen(function* () {
      const service = yield* EnsService;
      const name = yield* prepareEnsName("example.eth");
      const selector = yield* Schema.decodeUnknownEffect(RecordSelectorSchema)({
        type: "text",
        key: "url",
      });
      const result = yield* service.readRecordSnapshot({
        name,
        selector,
        blockNumber: 23_085_558n,
      });

      assert.strictEqual(result.snapshot.blockHash, blockHash);
      assert.strictEqual(result.record.value?.type, "text");
      assert.strictEqual(
        String(result.record.value?.value),
        "https://example.com/profile",
      );
      assert.strictEqual(result.discovery.value?.type, "text");
      assert.strictEqual(
        String(result.discovery.value?.value),
        "ensrv1 a=1 m=https-origin.v1",
      );
      assert.deepStrictEqual(
        contractReads.map((read) => read.blockNumber),
        [23_085_558n, 23_085_558n],
      );
    }).pipe(Effect.provide(EnsService.layer(publicClient)));
  });

  it.effect("rejects a PublicClient configured for another chain", () => {
    const publicClient = {
      chain: { id: 11155111 },
    } as unknown as PublicClient;

    return Effect.gen(function* () {
      const error = yield* Effect.flip(
        Effect.gen(function* () {
          yield* EnsService;
        }).pipe(Effect.provide(EnsService.layer(publicClient))),
      );

      assert.strictEqual(error["_tag"], "RpcError");
      assert.strictEqual(error.code, "UNSUPPORTED_ENS_CHAIN");
    });
  });
});
