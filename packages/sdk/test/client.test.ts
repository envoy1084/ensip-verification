import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";

import { namehash, normalizeName } from "@ensforge/core";

import { RecordVerificationClient } from "../src/client/RecordVerification.js";
import { deriveCommonClaim } from "../src/core/claims.js";
import { ProofEnvelope } from "../src/schema/claims.js";
import { DnsService } from "../src/services/DnsService.js";
import { EnsService } from "../src/services/EnsService.js";
import { HttpService } from "../src/services/HttpService.js";

const unusedDnsLayer = Layer.succeed(
  DnsService,
  DnsService.of({ resolveSecureTxt: () => Effect.die("unused") }),
);

describe("RecordVerification client", () => {
  it("returns the public success result for a valid proof", async () => {
    const checkedAt = BigInt(Math.floor(Date.now() / 1_000));
    const normalizedName = normalizeName("example.eth");
    const name = {
      normalizedName,
      node: namehash(normalizedName),
    };
    const selector = { type: "text" as const, key: "url" };
    const value = {
      type: "text" as const,
      value: "https://example.com/path",
    };
    const authority = {
      authority: "0x1111111111111111111111111111111111111111",
    };
    const claim = await Effect.runPromise(
      deriveCommonClaim({
        name,
        selector,
        value,
        authorityVersion: 1n,
        authority,
        method: "https-origin.v1",
        target: "https://example.com",
        issuedAt: checkedAt - 60n,
        validUntil: checkedAt + 3_600n,
      }),
    );
    const encoded = Schema.encodeSync(ProofEnvelope)({
      v: "ensrv1",
      claim,
      authoritySignature: "0x00",
      proof: {},
    });
    const body = new TextEncoder().encode(JSON.stringify(encoded));
    const snapshot = {
      chainId: 1 as const,
      blockNumber: 20_000_000n,
      blockHash: `0x${"33".repeat(32)}`,
      blockTimestamp: checkedAt,
    };
    const ensLayer = Layer.succeed(
      EnsService,
      EnsService.of({
        readRecordSnapshot: () =>
          Effect.succeed({
            snapshot,
            record: { selector, value },
            discovery: {
              selector: { type: "text", key: "_ens-record-verification.url" },
              value: {
                type: "text",
                value: "ensrv1 a=1 m=https-origin.v1",
              },
            },
          }),
        resolveAuthority: () => Effect.succeed(authority),
        validateAuthoritySignature: () => Effect.void,
        ensureSnapshotCanonical: () => Effect.void,
      }),
    );
    const httpLayer = Layer.succeed(
      HttpService,
      HttpService.of({ get: () => Effect.succeed({ body, headers: {} }) }),
    );
    const client = new RecordVerificationClient(
      Layer.mergeAll(ensLayer, httpLayer, unusedDnsLayer),
    );

    try {
      const result = await client.verifyRecord({
        name: "example.eth",
        type: "text",
        key: "url",
      });

      assert.isTrue(result.success);
      if (result.success) {
        assert.strictEqual(result.data.value, value.value);
        assert.strictEqual(result.data.verification.method, "https-origin.v1");
      }
    } finally {
      await client.close();
    }
  });

  it("maps expected Effect failures to the public error result", async () => {
    const unavailableLayer = Layer.succeed(
      EnsService,
      EnsService.of({
        readRecordSnapshot: () => Effect.die("unused"),
        resolveAuthority: () => Effect.die("unused"),
        validateAuthoritySignature: () => Effect.die("unused"),
        ensureSnapshotCanonical: () => Effect.die("unused"),
      }),
    );
    const unusedHttpLayer = Layer.succeed(
      HttpService,
      HttpService.of({ get: () => Effect.die("unused") }),
    );
    const client = new RecordVerificationClient(
      Layer.mergeAll(unavailableLayer, unusedHttpLayer, unusedDnsLayer),
    );

    try {
      const result = await client.verifyRecord({
        name: "not a valid name",
        type: "text",
        key: "url",
      });

      assert.isFalse(result.success);
      if (!result.success) {
        assert.strictEqual(result.error.code, "INVALID_INPUT");
        assert.isNotEmpty(result.error.reason);
      }
    } finally {
      await client.close();
    }
  });
});
