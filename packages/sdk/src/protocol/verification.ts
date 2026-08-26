import { Effect } from "effect";

import { ClaimError } from "../schema/claims.js";
import type {
  CommonVerification,
  VerifyCommonProofInput,
} from "../schema/verification.js";
import {
  compareCommonClaim,
  deriveCommonClaim,
  hashCommonClaim,
} from "./claims.js";
import { parseProofEnvelope } from "./json.js";
import { validateClaimLifecycle } from "./lifecycle.js";
import { validateAuthoritySignature } from "./signatures.js";

export const validateEmptyMethodProof = Effect.fn("validateEmptyMethodProof")(
  function* (proof: Record<string, unknown>) {
    if (Object.keys(proof).length !== 0) {
      return yield* new ClaimError({
        code: "INVALID_METHOD_PROOF",
        message: "selected method requires an empty proof object",
      });
    }
  },
);

export const verifyCommonProof = Effect.fn("verifyCommonProof")(function* (
  input: VerifyCommonProofInput,
): Effect.fn.Return<CommonVerification, ClaimError> {
  const envelope = yield* parseProofEnvelope(input.envelopeBytes);
  yield* input.validateProof(envelope.proof);

  const expectedClaim = yield* deriveCommonClaim({
    name: input.name,
    selector: input.selector,
    value: input.value,
    authorityVersion: input.descriptor.authorityVersion,
    authority: input.authority,
    method: input.descriptor.method,
    target: input.target,
    issuedAt: envelope.claim.issuedAt,
    validUntil: envelope.claim.validUntil,
  });
  yield* compareCommonClaim(envelope.claim, expectedClaim);

  const lifetime = yield* validateClaimLifecycle({
    issuedAt: envelope.claim.issuedAt,
    validUntil: envelope.claim.validUntil,
    checkedAt: input.checkedAt,
    methodMaxLifetime: input.methodMaxLifetime,
    ...(input.authority.authorityValidUntil === undefined
      ? {}
      : { authorityValidUntil: input.authority.authorityValidUntil }),
    ...(input.methodEvidenceValidUntil === undefined
      ? {}
      : { methodEvidenceValidUntil: input.methodEvidenceValidUntil }),
    ...(input.methodEvidenceCacheUntil === undefined
      ? {}
      : { methodEvidenceCacheUntil: input.methodEvidenceCacheUntil }),
  });

  const digest = hashCommonClaim(envelope.claim);
  yield* validateAuthoritySignature(input.publicClient, {
    authority: envelope.claim.authority,
    signature: envelope.authoritySignature,
    digest,
    blockNumber: input.snapshot.blockNumber,
  });

  return {
    envelope,
    digest,
    effectiveValidUntil: lifetime.effectiveValidUntil,
    cacheUntil: lifetime.cacheUntil,
  };
});
