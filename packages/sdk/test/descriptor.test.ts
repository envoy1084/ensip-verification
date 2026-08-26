import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { parseDescriptor, serializeDescriptor } from "../src/index.js";

describe("verification descriptors", () => {
  it.effect("parses canonical descriptors", () =>
    Effect.gen(function* () {
      const descriptor = yield* parseDescriptor("ensrv1 a=1 m=https-origin.v1");
      assert.strictEqual(descriptor.authorityVersion, 1n);
      assert.strictEqual(descriptor.method, "https-origin.v1");
      assert.strictEqual(descriptor.proofUri, undefined);

      const account = yield* parseDescriptor(
        "ensrv1 a=1 m=account-signature.eip155.v1 u=https://proof.example/a.json?x=a=b",
      );
      assert.strictEqual(
        account.proofUri,
        "https://proof.example/a.json?x=a=b",
      );
    }),
  );

  it.effect("accepts reordered fields and serializes canonical order", () =>
    Effect.gen(function* () {
      const descriptor = yield* parseDescriptor(
        "ensrv1 u=https://proof.example/proof m=account-signature.eip155.v1 a=1",
      );
      assert.strictEqual(
        serializeDescriptor(descriptor),
        "ensrv1 a=1 m=account-signature.eip155.v1 u=https://proof.example/proof",
      );
    }),
  );

  it.effect.each([
    ["ensrv1  a=1 m=https-origin.v1", "invalid_structure"],
    [" ensrv1 a=1 m=https-origin.v1", "invalid_structure"],
    ["ensrv1 a=1 m=https-origin.v1 ", "invalid_structure"],
    ["ensrv1\ta=1 m=https-origin.v1", "invalid_structure"],
    ["ensrv1 a=1", "invalid_structure"],
    ["ensrv1 a=1 m=https-origin.v1 x=no", "invalid_field"],
    ["ensrv1 a=1 a=1 m=https-origin.v1", "duplicate_field"],
    ["ensrv1 a=01 m=https-origin.v1", "invalid_field"],
    ["ensrv1 a=4294967296 m=https-origin.v1", "invalid_field"],
    ["ensrv1 a=2 m=https-origin.v1", "unsupported_authority"],
    ["ensrv1 a=1 m=unknown.v1", "unsupported_method"],
  ] as const)("rejects malformed descriptor %#", ([input, reason]) =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(parseDescriptor(input));
      assert.strictEqual(error.reason, reason);
    }),
  );

  it.effect.each([
    ["ensrv1 a=1 m=https-origin.v1 u=https://proof.example", "uri_policy"],
    ["ensrv1 a=1 m=dns-txt.v1 u=https://proof.example", "uri_policy"],
    ["ensrv1 a=1 m=account-signature.eip155.v1", "uri_policy"],
    [
      "ensrv1 a=1 m=account-signature.eip155.v1 u=http://proof.example",
      "uri_policy",
    ],
    ["ensrv1 a=1 m=account-signature.eip155.v1 u=/relative", "invalid_uri"],
    [
      "ensrv1 a=1 m=account-signature.eip155.v1 u=https://user@proof.example",
      "invalid_uri",
    ],
    [
      "ensrv1 a=1 m=account-signature.eip155.v1 u=https://proof.example/#fragment",
      "invalid_uri",
    ],
    [
      "ensrv1 a=1 m=account-signature.eip155.v1 u=https://proof.example/%zz",
      "invalid_uri",
    ],
  ] as const)("enforces proof-URI rules %#", ([input, reason]) =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(parseDescriptor(input));
      assert.strictEqual(error.reason, reason);
    }),
  );

  it.effect("enforces descriptor, method, and URI length limits", () =>
    Effect.gen(function* () {
      const oversizedDescriptor = `ensrv1 a=1 m=https-origin.v1 ${"x".repeat(2_049)}`;
      assert.strictEqual(
        (yield* Effect.flip(parseDescriptor(oversizedDescriptor))).reason,
        "invalid_encoding",
      );

      const longMethod = `${"a".repeat(62)}.v1`;
      assert.strictEqual(
        (yield* Effect.flip(parseDescriptor(`ensrv1 a=1 m=${longMethod}`)))
          .reason,
        "invalid_field",
      );

      const longUri = `https:${"a".repeat(1_019)}`;
      assert.strictEqual(
        (yield* Effect.flip(
          parseDescriptor(
            `ensrv1 a=1 m=account-signature.eip155.v1 u=${longUri}`,
          ),
        )).reason,
        "invalid_uri",
      );
    }),
  );
});
