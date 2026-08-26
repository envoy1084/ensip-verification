import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  EnsSnapshot,
  EthereumAddress,
  MAINNET_UNIVERSAL_RESOLVER_ADDRESS,
} from "../src/index.js";

describe("ENS schemas", () => {
  it.effect("accepts a mainnet block snapshot", () =>
    Effect.gen(function* () {
      const snapshot = yield* Schema.decodeUnknownEffect(EnsSnapshot)({
        chainId: 1,
        blockNumber: 23_085_558n,
        blockHash: `0x${"ab".repeat(32)}`,
        blockTimestamp: 1_756_000_000n,
      });

      assert.strictEqual(snapshot.chainId, 1);
      assert.strictEqual(snapshot.blockNumber, 23_085_558n);
    }),
  );

  it.effect("rejects another chain and malformed block metadata", () =>
    Effect.gen(function* () {
      yield* Effect.flip(
        Schema.decodeUnknownEffect(EnsSnapshot)({
          chainId: 11155111,
          blockNumber: -1n,
          blockHash: "0x1234",
          blockTimestamp: -1n,
        }),
      );
    }),
  );

  it.effect("accepts ordinary Ethereum address strings", () =>
    Effect.gen(function* () {
      assert.strictEqual(
        yield* Schema.decodeUnknownEffect(EthereumAddress)(
          MAINNET_UNIVERSAL_RESOLVER_ADDRESS,
        ),
        MAINNET_UNIVERSAL_RESOLVER_ADDRESS,
      );

      yield* Effect.flip(Schema.decodeUnknownEffect(EthereumAddress)("0x1234"));
    }),
  );
});
