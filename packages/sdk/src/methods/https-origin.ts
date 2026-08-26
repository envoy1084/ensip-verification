import { Effect } from "effect";

import type { Hex } from "viem";

import { HTTP_TOTAL_TIMEOUT_MS } from "../data/http.js";
import { PROOF_ENVELOPE_MAX_BYTES } from "../data/limits.js";
import {
  HTTPS_ORIGIN_MAX_LIFETIME_SECONDS,
  HTTPS_ORIGIN_METHOD_ID,
  HTTPS_ORIGIN_PROOF_PATH,
} from "../data/methods.js";
import { HttpService } from "../http/service.js";
import { deriveProofKey } from "../protocol/claims.js";
import { deriveRecordMetadata } from "../protocol/records.js";
import {
  validateEmptyMethodProof,
  verifyCommonProof,
} from "../protocol/verification.js";
import { VerificationError } from "../schema/errors.js";
import type {
  HttpsOriginVerificationData,
  MethodVerificationInput,
  VerificationMethod,
} from "../schema/methods.js";

export const httpsOriginDescriptorPolicy = Object.freeze({
  proofUri: "forbidden",
} as const);

export const deriveHttpsOriginTarget = Effect.fn("deriveHttpsOriginTarget")(
  function* (value: string) {
    if (
      value.length === 0 ||
      Array.from(value).some((character) => character.charCodeAt(0) <= 0x20)
    ) {
      return yield* new VerificationError({
        code: "INVALID_METHOD_TARGET",
        message:
          "HTTPS origin value must be nonempty and contain no ASCII whitespace or controls",
      });
    }

    const url = yield* Effect.try({
      try: () => new URL(value),
      catch: () =>
        new VerificationError({
          code: "INVALID_METHOD_TARGET",
          message: "HTTPS origin value is not an absolute WHATWG URL",
        }),
    });

    if (
      url.protocol !== "https:" ||
      url.host === "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.hostname.endsWith(".") ||
      url.origin === "null"
    ) {
      return yield* new VerificationError({
        code: "INVALID_METHOD_TARGET",
        message: "HTTPS origin value does not satisfy the method URL policy",
      });
    }

    return url.origin;
  },
);

export const deriveHttpsOriginProofUrl = (target: string, proofKey: Hex): URL =>
  new URL(`${HTTPS_ORIGIN_PROOF_PATH}${proofKey.slice(2)}`, target);

export const verifyHttpsOrigin = Effect.fn("verifyHttpsOrigin")(function* (
  input: MethodVerificationInput,
) {
  if (
    input.descriptor.method !== HTTPS_ORIGIN_METHOD_ID ||
    input.descriptor.proofUri !== undefined ||
    input.selector.type !== "text" ||
    input.value.type !== "text"
  ) {
    return yield* new VerificationError({
      code: "METHOD_NOT_APPLICABLE",
      message: "https-origin.v1 requires a text record and no descriptor URI",
    });
  }

  const target = yield* deriveHttpsOriginTarget(input.value.value);
  const { recordKey, recordType } = deriveRecordMetadata(input.selector);
  const proofKey = deriveProofKey({
    authorityVersion: input.descriptor.authorityVersion,
    authority: input.authority.authority,
    node: input.name.node as Hex,
    recordType,
    recordKey,
    method: HTTPS_ORIGIN_METHOD_ID,
  });
  const proofUrl = deriveHttpsOriginProofUrl(target, proofKey);
  const http = yield* HttpService;
  const response = yield* http.get({
    url: proofUrl,
    maximumBodyBytes: PROOF_ENVELOPE_MAX_BYTES,
    timeoutMs: HTTP_TOTAL_TIMEOUT_MS,
  });
  const common = yield* verifyCommonProof({
    publicClient: input.publicClient,
    name: input.name,
    selector: input.selector,
    value: input.value,
    descriptor: input.descriptor,
    authority: input.authority,
    target,
    envelopeBytes: response.body,
    snapshot: input.snapshot,
    checkedAt: input.checkedAt,
    methodMaxLifetime: HTTPS_ORIGIN_MAX_LIFETIME_SECONDS,
    validateProof: validateEmptyMethodProof,
  });

  return {
    method: HTTPS_ORIGIN_METHOD_ID,
    target,
    common,
    data: { proofUrl: proofUrl.href },
  };
});

export const httpsOriginMethod = Object.freeze({
  id: HTTPS_ORIGIN_METHOD_ID,
  descriptor: httpsOriginDescriptorPolicy,
  verify: verifyHttpsOrigin,
} satisfies VerificationMethod<
  typeof HTTPS_ORIGIN_METHOD_ID,
  HttpsOriginVerificationData,
  HttpService
>);
