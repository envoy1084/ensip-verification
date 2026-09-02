import { Effect } from "effect";

import type { Hex } from "viem";

import {
  DNS_TXT_MAX_LIFETIME_SECONDS,
  DNS_TXT_METHOD_ID,
} from "../data/methods.js";
import { DnsService } from "../dns/service.js";
import { deriveProofKey } from "../protocol/claims.js";
import { deriveDnsProofOwner, deriveDnsTxtTarget } from "../protocol/dns.js";
import { deriveRecordMetadata } from "../protocol/records.js";
import {
  validateEmptyMethodProof,
  verifyCommonProof,
} from "../protocol/verification.js";
import { VerificationError } from "../schema/errors.js";
import type {
  DnsTxtVerificationData,
  MethodVerificationInput,
  VerificationMethod,
} from "../schema/methods.js";

export const dnsTxtDescriptorPolicy = Object.freeze({
  proofUri: "forbidden",
} as const);

export const verifyDnsTxt = Effect.fn("verifyDnsTxt")(function* (
  input: MethodVerificationInput,
) {
  if (
    input.descriptor.method !== DNS_TXT_METHOD_ID ||
    input.descriptor.proofUri !== undefined ||
    input.selector.type !== "text" ||
    input.value.type !== "text"
  ) {
    return yield* new VerificationError({
      code: "METHOD_NOT_APPLICABLE",
      message: "dns-txt.v1 requires a text record and no descriptor URI",
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
    publicClient: input.publicClient,
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
  DnsService
>);
