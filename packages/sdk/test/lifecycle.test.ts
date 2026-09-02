import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { validateClaimLifecycle } from "../src/core/lifecycle.js";

describe("claim lifecycle", () => {
  it.effect("applies the shortest validity and cache bounds", () =>
    Effect.gen(function* () {
      const lifetime = yield* validateClaimLifecycle({
        issuedAt: 900n,
        validUntil: 2_000n,
        checkedAt: 1_000n,
        methodMaxLifetime: 10_000n,
        authorityValidUntil: 1_500n,
        methodEvidenceCacheUntil: 1_100n,
      });

      assert.deepStrictEqual(lifetime, {
        effectiveValidUntil: 1_500n,
        cacheUntil: 1_100n,
      });
    }),
  );

  it.effect("rejects an expired proof", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        validateClaimLifecycle({
          issuedAt: 900n,
          validUntil: 1_000n,
          checkedAt: 1_000n,
          methodMaxLifetime: 10_000n,
        }),
      );

      assert.strictEqual(error.code, "PROOF_EXPIRED");
    }),
  );
});
