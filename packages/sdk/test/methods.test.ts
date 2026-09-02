import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";

import { namehash, normalizeName } from "@ensforge/core";

import { deriveCommonClaim } from "../src/core/claims.js";
import { verifyRegisteredMethod } from "../src/methods/registry.js";
import { ProofEnvelope } from "../src/schema/claims.js";
import type { MethodVerificationInput } from "../src/schema/methods.js";
import { DnsService } from "../src/services/DnsService.js";
import { EnsService } from "../src/services/EnsService.js";
import { HttpService } from "../src/services/HttpService.js";

const checkedAt = 1_800_000_000n;
const authority = {
  authority: "0x1111111111111111111111111111111111111111",
};
const normalizedName = normalizeName("example.eth");
const name = {
  normalizedName,
  node: namehash(normalizedName),
};
const selector = { type: "text" as const, key: "url" };
const value = { type: "text" as const, value: "https://example.com/path" };
const snapshot = {
  chainId: 1 as const,
  blockNumber: 20_000_000n,
  blockHash: `0x${"33".repeat(32)}`,
  blockTimestamp: checkedAt,
};

const makeEnvelope = Effect.fn("makeEnvelope")(function* (
  method: "https-origin.v1" | "dns-txt.v1",
  target: string,
) {
  const claim = yield* deriveCommonClaim({
    name,
    selector,
    value,
    authorityVersion: 1n,
    authority,
    method,
    target,
    issuedAt: checkedAt - 60n,
    validUntil: checkedAt + 3_600n,
  });
  const encoded = Schema.encodeSync(ProofEnvelope)({
    v: "ensrv1",
    claim,
    authoritySignature: "0x00",
    proof: {},
  });
  return new TextEncoder().encode(JSON.stringify(encoded));
});

const ensLayer = Layer.succeed(
  EnsService,
  EnsService.of({
    readRecordSnapshot: () => Effect.die("unused"),
    resolveAuthority: () => Effect.die("unused"),
    validateAuthoritySignature: () => Effect.void,
    ensureSnapshotCanonical: () => Effect.void,
  }),
);

const input = (method: "https-origin.v1" | "dns-txt.v1") =>
  ({
    name,
    selector,
    value,
    descriptor: {
      protocolVersion: "ensrv1",
      authorityVersion: 1n,
      method,
    },
    authority,
    snapshot,
    checkedAt,
  }) satisfies MethodVerificationInput;

describe("method registry", () => {
  it.effect("verifies https-origin.v1 through HttpService", () =>
    Effect.gen(function* () {
      const body = yield* makeEnvelope(
        "https-origin.v1",
        "https://example.com",
      );
      const httpLayer = Layer.succeed(
        HttpService,
        HttpService.of({
          get: () => Effect.succeed({ body, headers: {} }),
        }),
      );
      const dnsLayer = Layer.succeed(
        DnsService,
        DnsService.of({ resolveSecureTxt: () => Effect.die("unused") }),
      );

      const result = yield* verifyRegisteredMethod(
        input("https-origin.v1"),
      ).pipe(Effect.provide(Layer.mergeAll(ensLayer, httpLayer, dnsLayer)));

      assert.strictEqual(result.method, "https-origin.v1");
      assert.strictEqual(result.target, "https://example.com");
      assert.strictEqual(result.common.effectiveValidUntil, checkedAt + 3_600n);
    }),
  );

  it.effect("verifies dns-txt.v1 through DnsService", () =>
    Effect.gen(function* () {
      const body = yield* makeEnvelope("dns-txt.v1", "example.com");
      const dnsLayer = Layer.succeed(
        DnsService,
        DnsService.of({
          resolveSecureTxt: () =>
            Effect.succeed({ bytes: body, cacheUntil: checkedAt }),
        }),
      );
      const httpLayer = Layer.succeed(
        HttpService,
        HttpService.of({ get: () => Effect.die("unused") }),
      );

      const result = yield* verifyRegisteredMethod(input("dns-txt.v1")).pipe(
        Effect.provide(Layer.mergeAll(ensLayer, httpLayer, dnsLayer)),
      );

      assert.strictEqual(result.method, "dns-txt.v1");
      assert.strictEqual(result.target, "example.com");
      assert.isTrue("proofOwner" in result.data);
    }),
  );
});
