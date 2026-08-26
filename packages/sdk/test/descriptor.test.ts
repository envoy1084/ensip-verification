import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import {
  parseDescriptor,
  serializeDescriptor,
} from "../src/protocol/descriptor.js";

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
    ["ensrv1  a=1 m=https-origin.v1", "INVALID_STRUCTURE"],
    [" ensrv1 a=1 m=https-origin.v1", "INVALID_STRUCTURE"],
    ["ensrv1 a=1 m=https-origin.v1 ", "INVALID_STRUCTURE"],
    ["ensrv1\ta=1 m=https-origin.v1", "INVALID_STRUCTURE"],
    ["ensrv1 a=1", "INVALID_STRUCTURE"],
    ["ensrv1 a=1 m=https-origin.v1 x=no", "INVALID_FIELD"],
    ["ensrv1 a=1 a=1 m=https-origin.v1", "DUPLICATE_FIELD"],
    ["ensrv1 a=01 m=https-origin.v1", "INVALID_FIELD"],
    ["ensrv1 a=4294967296 m=https-origin.v1", "INVALID_FIELD"],
    ["ensrv1 a=2 m=https-origin.v1", "UNSUPPORTED_AUTHORITY"],
    ["ensrv1 a=1 m=unknown.v1", "UNSUPPORTED_METHOD"],
  ] as const)("rejects malformed descriptor %#", ([input, code]) =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(parseDescriptor(input));
      assert.strictEqual(error.code, code);
    }),
  );

  it.effect.each([
    ["ensrv1 a=1 m=https-origin.v1 u=https://proof.example", "URI_POLICY"],
    ["ensrv1 a=1 m=dns-txt.v1 u=https://proof.example", "URI_POLICY"],
    ["ensrv1 a=1 m=account-signature.eip155.v1", "URI_POLICY"],
    [
      "ensrv1 a=1 m=account-signature.eip155.v1 u=http://proof.example",
      "URI_POLICY",
    ],
    ["ensrv1 a=1 m=account-signature.eip155.v1 u=/relative", "INVALID_URI"],
    [
      "ensrv1 a=1 m=account-signature.eip155.v1 u=https://user@proof.example",
      "INVALID_URI",
    ],
    [
      "ensrv1 a=1 m=account-signature.eip155.v1 u=https://proof.example/#fragment",
      "INVALID_URI",
    ],
    [
      "ensrv1 a=1 m=account-signature.eip155.v1 u=https://proof.example/%zz",
      "INVALID_URI",
    ],
  ] as const)("enforces proof-URI rules %#", ([input, code]) =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(parseDescriptor(input));
      assert.strictEqual(error.code, code);
    }),
  );

  it.effect("enforces descriptor, method, and URI length limits", () =>
    Effect.gen(function* () {
      const oversizedDescriptor = `ensrv1 a=1 m=https-origin.v1 ${"x".repeat(2_049)}`;
      assert.strictEqual(
        (yield* Effect.flip(parseDescriptor(oversizedDescriptor))).code,
        "INVALID_ENCODING",
      );

      const longMethod = `${"a".repeat(62)}.v1`;
      assert.strictEqual(
        (yield* Effect.flip(parseDescriptor(`ensrv1 a=1 m=${longMethod}`)))
          .code,
        "INVALID_FIELD",
      );

      const longUri = `https:${"a".repeat(1_019)}`;
      assert.strictEqual(
        (yield* Effect.flip(
          parseDescriptor(
            `ensrv1 a=1 m=account-signature.eip155.v1 u=${longUri}`,
          ),
        )).code,
        "INVALID_URI",
      );
    }),
  );
});
