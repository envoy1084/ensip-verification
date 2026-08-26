import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  deriveDiscoveryKey,
  deriveLogicalResolverValueBytes,
  deriveRecordMetadata,
  LogicalResolverValue,
  RecordSelector,
} from "../src/index.js";

describe("record selectors and discovery", () => {
  it.effect("derives exact record metadata", () =>
    Effect.gen(function* () {
      const text = yield* Schema.decodeUnknownEffect(RecordSelector)({
        _tag: "Text",
        key: "avatar",
      });
      const address = yield* Schema.decodeUnknownEffect(RecordSelector)({
        _tag: "Address",
        coinType: "60",
      });
      const contenthash = yield* Schema.decodeUnknownEffect(RecordSelector)({
        _tag: "Contenthash",
      });

      assert.deepStrictEqual(deriveRecordMetadata(text), {
        recordType: "text",
        recordKey: "avatar",
      });
      assert.deepStrictEqual(deriveRecordMetadata(address), {
        recordType: "addr",
        recordKey: "60",
      });
      assert.deepStrictEqual(deriveRecordMetadata(contenthash), {
        recordType: "contenthash",
        recordKey: "",
      });
    }),
  );

  it.effect("derives every discovery-key shape without rewriting keys", () =>
    Effect.gen(function* () {
      const cases = [
        [
          { _tag: "Text", key: "agent-endpoint[mcp]" },
          "verification[text][agent-endpoint[mcp]]",
        ],
        [{ _tag: "Address", coinType: "60" }, "verification[addr][60]"],
        [{ _tag: "Contenthash" }, "verification[contenthash]"],
        [{ _tag: "Data", key: "0x1234" }, "verification[data][0x1234]"],
      ] as const;

      for (const [input, expected] of cases) {
        const selector =
          yield* Schema.decodeUnknownEffect(RecordSelector)(input);
        assert.strictEqual((yield* deriveDiscoveryKey(selector)).key, expected);
      }
    }),
  );

  it.effect("supports an explicit interim discovery-key byte limit", () =>
    Effect.gen(function* () {
      const selector = yield* Schema.decodeUnknownEffect(RecordSelector)({
        _tag: "Text",
        key: "💫",
      });
      assert.strictEqual((yield* deriveDiscoveryKey(selector)).utf8Bytes, 24);
      const error = yield* Effect.flip(
        deriveDiscoveryKey(selector, { maximumBytes: 23 }),
      );
      assert.strictEqual(error.reason, "byte_limit_exceeded");
    }),
  );

  it.effect(
    "rejects alternate coin-type encodings and invalid scalar keys",
    () =>
      Effect.gen(function* () {
        yield* Effect.flip(
          Schema.decodeUnknownEffect(RecordSelector)({
            _tag: "Address",
            coinType: "060",
          }),
        );
        yield* Effect.flip(
          Schema.decodeUnknownEffect(RecordSelector)({
            _tag: "Text",
            key: "\udfff",
          }),
        );
      }),
  );

  it.effect("derives strict UTF-8 bytes for text resolver values", () =>
    Effect.gen(function* () {
      const resolverValue = yield* Schema.decodeUnknownEffect(
        LogicalResolverValue,
      )({ _tag: "Text", value: "hello 💫" });

      assert.deepStrictEqual(
        [...(yield* deriveLogicalResolverValueBytes(resolverValue))],
        [104, 101, 108, 108, 111, 32, 240, 159, 146, 171],
      );
    }),
  );

  it.effect(
    "preserves exact binary resolver bytes for every binary record",
    () =>
      Effect.gen(function* () {
        for (const tag of ["Address", "Contenthash", "Data"] as const) {
          const input = new Uint8Array([0, 1, 255]);
          const resolverValue = yield* Schema.decodeUnknownEffect(
            LogicalResolverValue,
          )({ _tag: tag, value: input });
          const bytes = yield* deriveLogicalResolverValueBytes(resolverValue);

          assert.deepStrictEqual([...bytes], [0, 1, 255]);
          assert.notStrictEqual(bytes, input);
        }
      }),
  );

  it.effect("rejects invalid text and non-byte binary resolver values", () =>
    Effect.gen(function* () {
      yield* Effect.flip(
        Schema.decodeUnknownEffect(LogicalResolverValue)({
          _tag: "Text",
          value: "\ud800",
        }),
      );
      yield* Effect.flip(
        Schema.decodeUnknownEffect(LogicalResolverValue)({
          _tag: "Address",
          value: "0x1234",
        }),
      );
    }),
  );
});
