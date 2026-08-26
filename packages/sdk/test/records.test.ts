import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { deriveDiscoveryKey } from "../src/protocol/discovery.js";
import {
  deriveLogicalResolverValueBytes,
  deriveRecordMetadata,
} from "../src/protocol/records.js";
import {
  LogicalResolverValueSchema,
  RecordSelectorSchema,
} from "../src/schema/records.js";

describe("record selectors and discovery", () => {
  it.effect("derives exact record metadata", () =>
    Effect.gen(function* () {
      const text = yield* Schema.decodeUnknownEffect(RecordSelectorSchema)({
        type: "text",
        key: "avatar",
      });
      const address = yield* Schema.decodeUnknownEffect(RecordSelectorSchema)({
        type: "addr",
        key: "60",
      });
      const contenthash = yield* Schema.decodeUnknownEffect(
        RecordSelectorSchema,
      )({
        type: "contenthash",
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
          { type: "text", key: "agent-endpoint[mcp]" },
          "verification[text][agent-endpoint[mcp]]",
        ],
        [{ type: "addr", key: "60" }, "verification[addr][60]"],
        [{ type: "contenthash" }, "verification[contenthash]"],
        [{ type: "data", key: "0x1234" }, "verification[data][0x1234]"],
      ] as const;

      for (const [input, expected] of cases) {
        const selector =
          yield* Schema.decodeUnknownEffect(RecordSelectorSchema)(input);
        assert.strictEqual((yield* deriveDiscoveryKey(selector)).key, expected);
      }
    }),
  );

  it.effect("supports an explicit interim discovery-key byte limit", () =>
    Effect.gen(function* () {
      const selector = yield* Schema.decodeUnknownEffect(RecordSelectorSchema)({
        type: "text",
        key: "💫",
      });
      assert.strictEqual((yield* deriveDiscoveryKey(selector)).utf8Bytes, 24);
      const error = yield* Effect.flip(
        deriveDiscoveryKey(selector, { maximumBytes: 23 }),
      );
      assert.strictEqual(error.code, "BYTE_LIMIT_EXCEEDED");
    }),
  );

  it.effect(
    "rejects alternate coin-type encodings and invalid scalar keys",
    () =>
      Effect.gen(function* () {
        yield* Effect.flip(
          Schema.decodeUnknownEffect(RecordSelectorSchema)({
            type: "addr",
            key: "060",
          }),
        );
        yield* Effect.flip(
          Schema.decodeUnknownEffect(RecordSelectorSchema)({
            type: "text",
            key: "\udfff",
          }),
        );
      }),
  );

  it.effect("derives strict UTF-8 bytes for text resolver values", () =>
    Effect.gen(function* () {
      const resolverValue = yield* Schema.decodeUnknownEffect(
        LogicalResolverValueSchema,
      )({ type: "text", value: "hello 💫" });

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
        for (const type of ["addr", "contenthash", "data"] as const) {
          const input = new Uint8Array([0, 1, 255]);
          const resolverValue = yield* Schema.decodeUnknownEffect(
            LogicalResolverValueSchema,
          )({ type, value: input });
          const bytes = yield* deriveLogicalResolverValueBytes(resolverValue);

          assert.deepStrictEqual([...bytes], [0, 1, 255]);
          assert.notStrictEqual(bytes, input);
        }
      }),
  );

  it.effect("rejects invalid text and non-byte binary resolver values", () =>
    Effect.gen(function* () {
      yield* Effect.flip(
        Schema.decodeUnknownEffect(LogicalResolverValueSchema)({
          type: "text",
          value: "\ud800",
        }),
      );
      yield* Effect.flip(
        Schema.decodeUnknownEffect(LogicalResolverValueSchema)({
          type: "addr",
          value: "0x1234",
        }),
      );
    }),
  );
});
