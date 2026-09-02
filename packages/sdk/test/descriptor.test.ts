import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { parseDescriptor } from "../src/core/descriptor.js";
import { validateRegisteredMethodDescriptor } from "../src/methods/registry.js";

describe("descriptor", () => {
  it.effect("parses a registered v1 descriptor", () =>
    Effect.gen(function* () {
      const descriptor = yield* parseDescriptor("ensrv1 a=1 m=https-origin.v1");
      yield* validateRegisteredMethodDescriptor(descriptor);

      assert.deepStrictEqual(descriptor, {
        protocolVersion: "ensrv1",
        authorityVersion: 1n,
        method: "https-origin.v1",
      });
    }),
  );

  it.effect("rejects ambiguous descriptor fields", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        parseDescriptor("ensrv1 a=1 a=1 m=https-origin.v1"),
      );

      assert.strictEqual(error.code, "INVALID_DESCRIPTOR");
    }),
  );

  it.effect("separates grammar parsing from method registration", () =>
    Effect.gen(function* () {
      const descriptor = yield* parseDescriptor(
        "ensrv1 a=1 m=future-method.v1",
      );
      const error = yield* Effect.flip(
        validateRegisteredMethodDescriptor(descriptor),
      );

      assert.strictEqual(error.code, "UNSUPPORTED_METHOD");
    }),
  );
});
