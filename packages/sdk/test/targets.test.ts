import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import {
  deriveDnsProofOwner,
  deriveDnsTxtTarget,
} from "../src/methods/dns-txt-v1/target.js";
import { deriveHttpsOriginTarget } from "../src/methods/https-origin-v1/verify.js";

describe("method targets", () => {
  it.effect("canonicalizes an HTTPS origin", () =>
    Effect.gen(function* () {
      const target = yield* deriveHttpsOriginTarget(
        "https://EXAMPLE.com:443/path?query#fragment",
      );

      assert.strictEqual(target, "https://example.com");
    }),
  );

  it.effect("derives an absolute DNS proof owner", () =>
    Effect.gen(function* () {
      const target = yield* deriveDnsTxtTarget("https://example.com/path");
      const owner = yield* deriveDnsProofOwner(target, `0x${"00".repeat(32)}`);

      assert.strictEqual(target, "example.com");
      assert.strictEqual(
        owner,
        `${"a".repeat(52)}._ens-record-verification.example.com.`,
      );
    }),
  );

  it.effect("rejects IP address DNS targets", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        deriveDnsTxtTarget("https://127.0.0.1/path"),
      );

      assert.strictEqual(error.code, "METHOD_NOT_APPLICABLE");
    }),
  );
});
