import { Effect } from "effect";

import {
  CLAIM_FUTURE_SKEW_SECONDS,
  POSITIVE_CACHE_MAX_SECONDS,
} from "../data/limits.js";
import { VerificationError } from "../schema/errors.js";
import type {
  ClaimLifecycleInput,
  VerificationLifetime,
} from "../schema/verification.js";

export const validateClaimLifecycle = Effect.fn("validateClaimLifecycle")(
  function* (input: ClaimLifecycleInput) {
    if (input.issuedAt > input.checkedAt + CLAIM_FUTURE_SKEW_SECONDS) {
      return yield* new VerificationError({
        code: "INVALID_CLAIM_TIME",
        message: "claim issuance exceeds the permitted future skew",
      });
    }
    if (input.issuedAt >= input.validUntil) {
      return yield* new VerificationError({
        code: "INVALID_CLAIM_TIME",
        message: "claim issuance must precede claim expiry",
      });
    }
    if (input.checkedAt >= input.validUntil) {
      return yield* new VerificationError({
        code: "CLAIM_EXPIRED",
        message: "claim is expired at the verification time",
      });
    }
    if (input.validUntil - input.issuedAt > input.methodMaxLifetime) {
      return yield* new VerificationError({
        code: "CLAIM_LIFETIME_EXCEEDED",
        message: "claim exceeds the selected method maximum lifetime",
      });
    }

    const hardBounds = [
      input.validUntil,
      input.authorityValidUntil,
      input.methodEvidenceValidUntil,
    ].filter((value): value is bigint => value !== undefined);
    const effectiveValidUntil = hardBounds.reduce((minimum, value) =>
      value < minimum ? value : minimum,
    );
    if (input.checkedAt >= effectiveValidUntil) {
      return yield* new VerificationError({
        code: "EFFECTIVE_VALIDITY_EXPIRED",
        message: "authority or method evidence is expired",
      });
    }

    const cacheBounds = [
      input.checkedAt + POSITIVE_CACHE_MAX_SECONDS,
      effectiveValidUntil,
      input.methodEvidenceCacheUntil,
    ].filter((value): value is bigint => value !== undefined);
    const cacheUntil = cacheBounds.reduce((minimum, value) =>
      value < minimum ? value : minimum,
    );

    return {
      effectiveValidUntil,
      cacheUntil,
    } satisfies VerificationLifetime;
  },
);
