import { Effect } from "effect";

import { RecordVerificationError } from "../schema/errors.js";
import type {
  CommonVerification,
  VerifyCommonProofInput,
} from "../schema/verification.js";
import { EnsService } from "../services/EnsService.js";
import {
  compareCommonClaim,
  deriveCommonClaim,
  hashCommonClaim,
} from "./claims.js";
import { parseProofEnvelope } from "./envelope.js";
import { validateClaimLifecycle } from "./lifecycle.js";

export const validateEmptyMethodProof = Effect.fn("validateEmptyMethodProof")(
  function* (proof: Record<string, unknown>) {
    if (Object.keys(proof).length !== 0) {
      return yield* new RecordVerificationError({
        code: "INVALID_PROOF",
        reason: "selected method requires an empty proof object",
      });
    }
  },
);

export const verifyCommonProof = Effect.fn("verifyCommonProof")(function* (
  input: VerifyCommonProofInput,
): Effect.fn.Return<CommonVerification, RecordVerificationError, EnsService> {
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
  const ens = yield* EnsService;
  yield* ens.validateAuthoritySignature({
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
