import { Effect } from "effect";

import type { Hex } from "viem";

import { deriveProofKey } from "../../core/claims.js";
import { deriveRecordMetadata } from "../../core/records.js";
import {
  validateEmptyMethodProof,
  verifyCommonProof,
} from "../../core/verification.js";
import { HTTP_TOTAL_TIMEOUT_MS } from "../../http/policy.js";
import { RecordVerificationError } from "../../schema/errors.js";
import type {
  HttpsOriginVerificationData,
  MethodVerificationInput,
  VerificationMethod,
} from "../../schema/methods.js";
import type { EnsService } from "../../services/EnsService.js";
import { HttpService } from "../../services/HttpService.js";
import { PROOF_ENVELOPE_MAX_BYTES } from "../../spec/limits.js";
import {
  HTTPS_ORIGIN_MAX_LIFETIME_SECONDS,
  HTTPS_ORIGIN_METHOD_ID,
  HTTPS_ORIGIN_PROOF_PATH,
  httpsOriginDescriptorPolicy,
} from "./definition.js";
import { parseHttpsRecordUrl } from "./target.js";

export const deriveHttpsOriginTarget = Effect.fn("deriveHttpsOriginTarget")(
  function* (value: string) {
    const url = yield* parseHttpsRecordUrl(value);
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
    return yield* new RecordVerificationError({
      code: "METHOD_NOT_APPLICABLE",
      reason: "https-origin.v1 requires a text record and no descriptor URI",
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
  EnsService | HttpService
>);
