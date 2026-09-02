import { Effect } from "effect";

import type { Hex } from "viem";

import { deriveProofKey } from "../../core/claims.js";
import { deriveRecordMetadata } from "../../core/records.js";
import {
  validateEmptyMethodProof,
  verifyCommonProof,
} from "../../core/verification.js";
import { RecordVerificationError } from "../../schema/errors.js";
import type {
  DnsTxtVerificationData,
  MethodVerificationInput,
  VerificationMethod,
} from "../../schema/methods.js";
import { DnsService } from "../../services/DnsService.js";
import type { EnsService } from "../../services/EnsService.js";
import {
  DNS_TXT_MAX_LIFETIME_SECONDS,
  DNS_TXT_METHOD_ID,
  dnsTxtDescriptorPolicy,
} from "./definition.js";
import { deriveDnsProofOwner, deriveDnsTxtTarget } from "./target.js";

export const verifyDnsTxt = Effect.fn("verifyDnsTxt")(function* (
  input: MethodVerificationInput,
) {
  if (
    input.descriptor.method !== DNS_TXT_METHOD_ID ||
    input.descriptor.proofUri !== undefined ||
    input.selector.type !== "text" ||
    input.value.type !== "text"
  ) {
    return yield* new RecordVerificationError({
      code: "METHOD_NOT_APPLICABLE",
      reason: "dns-txt.v1 requires a text record and no descriptor URI",
    });
  }

  const target = yield* deriveDnsTxtTarget(input.value.value);
  const { recordKey, recordType } = deriveRecordMetadata(input.selector);
  const proofKey = deriveProofKey({
    authorityVersion: input.descriptor.authorityVersion,
    authority: input.authority.authority,
    node: input.name.node as Hex,
    recordType,
    recordKey,
    method: DNS_TXT_METHOD_ID,
  });
  const proofOwner = yield* deriveDnsProofOwner(target, proofKey);
  const dns = yield* DnsService;
  const response = yield* dns.resolveSecureTxt({
    owner: proofOwner,
    checkedAt: input.checkedAt,
  });
  const common = yield* verifyCommonProof({
    name: input.name,
    selector: input.selector,
    value: input.value,
    descriptor: input.descriptor,
    authority: input.authority,
    target,
    envelopeBytes: response.bytes,
    snapshot: input.snapshot,
    checkedAt: input.checkedAt,
    methodMaxLifetime: DNS_TXT_MAX_LIFETIME_SECONDS,
    methodEvidenceCacheUntil: response.cacheUntil,
    validateProof: validateEmptyMethodProof,
  });

  return {
    method: DNS_TXT_METHOD_ID,
    target,
    common,
    data: { proofOwner },
  };
});

export const dnsTxtMethod = Object.freeze({
  id: DNS_TXT_METHOD_ID,
  descriptor: dnsTxtDescriptorPolicy,
  verify: verifyDnsTxt,
} satisfies VerificationMethod<
  typeof DNS_TXT_METHOD_ID,
  DnsTxtVerificationData,
  DnsService | EnsService
>);
