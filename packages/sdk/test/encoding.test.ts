import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  AuthorityVersion,
  CoinType,
  decodeStrictUtf8,
  encodeUtf8,
  HexBytes,
  Uint64,
  utf8ByteLength,
} from "../src/index.js";

describe("protocol encodings", () => {
  it.effect("decodes canonical decimal values without precision loss", () =>
    Effect.gen(function* () {
      assert.strictEqual(
        yield* Schema.decodeUnknownEffect(AuthorityVersion)("4294967295"),
        4_294_967_295n,
      );
      assert.strictEqual(
        yield* Schema.decodeUnknownEffect(Uint64)("18446744073709551615"),
        18_446_744_073_709_551_615n,
      );
      assert.strictEqual(
        yield* Schema.decodeUnknownEffect(CoinType)("60"),
        60n,
      );
    }),
  );

  it.effect.each(["", "00", "01", "+1", "-1", "1.0", "1e3", " 1"])(
    "rejects non-canonical decimal input %#",
    (input) =>
      Effect.asVoid(Effect.flip(Schema.decodeUnknownEffect(Uint64)(input))),
  );

  it.effect("enforces numeric boundaries", () =>
    Effect.gen(function* () {
      yield* Effect.flip(Schema.decodeUnknownEffect(AuthorityVersion)("0"));
      yield* Effect.flip(
        Schema.decodeUnknownEffect(AuthorityVersion)("4294967296"),
      );
      yield* Effect.flip(
        Schema.decodeUnknownEffect(Uint64)("18446744073709551616"),
      );
    }),
  );

  it.effect("round-trips lowercase hexadecimal bytes", () =>
    Effect.gen(function* () {
      const bytes = yield* Schema.decodeUnknownEffect(HexBytes)("0x0001ff");
      assert.deepStrictEqual([...bytes], [0, 1, 255]);
      assert.strictEqual(
        yield* Schema.encodeUnknownEffect(HexBytes)(bytes),
        "0x0001ff",
      );
      assert.deepStrictEqual(
        [...(yield* Schema.decodeUnknownEffect(HexBytes)("0x"))],
        [],
      );
    }),
  );

  it.effect.each(["00", "0x0", "0x0A", "0xgg", "0xabc"])(
    "rejects non-canonical hexadecimal input %#",
    (input) =>
      Effect.asVoid(Effect.flip(Schema.decodeUnknownEffect(HexBytes)(input))),
  );

  it.effect("measures UTF-8 bytes and rejects invalid scalar sequences", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* utf8ByteLength("a💫"), 5);
      assert.deepStrictEqual([...(yield* encodeUtf8("é"))], [0xc3, 0xa9]);
      const error = yield* Effect.flip(encodeUtf8("\ud800"));
      assert.strictEqual(error.reason, "invalid_unicode_scalar");
    }),
  );

  it.effect("strictly rejects malformed UTF-8", () =>
    Effect.gen(function* () {
      assert.strictEqual(
        yield* decodeStrictUtf8(new Uint8Array([0xf0, 0x9f, 0x92, 0xab])),
        "💫",
      );
      const error = yield* Effect.flip(
        decodeStrictUtf8(new Uint8Array([0xc0, 0xaf])),
      );
      assert.strictEqual(error.reason, "invalid_utf8");
    }),
  );
});
