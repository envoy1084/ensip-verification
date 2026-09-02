import { Effect } from "effect";

import { analyzeName } from "@ensforge/core";
import type { Ensforge } from "@ensforge/sdk";
import { isAddressEqual, zeroAddress } from "viem";

import {
  type EnsAuthority,
  type ResolveEnsAuthorityV1Input,
} from "../../schema/ens.js";
import { RecordVerificationError } from "../../schema/errors.js";

export const resolveEnsAuthorityV1: (
  ensforge: Ensforge,
  input: ResolveEnsAuthorityV1Input,
) => Effect.Effect<EnsAuthority, RecordVerificationError> = Effect.fn(
  "resolveEnsAuthorityV1",
)(function* (
  ensforge: Ensforge,
  { name, snapshot }: ResolveEnsAuthorityV1Input,
) {
  const analysis = analyzeName(name.normalizedName);
  if (analysis.tld === "reverse") {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "reverse names do not have a supported verification authority",
    });
  }

  const owner = yield* ensforge.name.getOwner
    .effect({
      name: name.normalizedName,
      blockNumber: snapshot.blockNumber,
    })
    .pipe(
      Effect.mapError(
        () =>
          new RecordVerificationError({
            code: "ENS_READ_FAILED",
            reason: "unable to read ENS ownership state",
          }),
      ),
    );

  if (owner === null) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "ENS name has no owner",
    });
  }
  if (owner.protocol !== "v1") {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "authority version 1 does not support ENS v2 names",
    });
  }
  const wrapped = yield* ensforge.name.isWrapped
    .effect({
      name: name.normalizedName,
      blockNumber: snapshot.blockNumber,
    })
    .pipe(
      Effect.mapError(
        () =>
          new RecordVerificationError({
            code: "ENS_READ_FAILED",
            reason: "unable to read ENS wrapping state",
          }),
      ),
    );
  if (wrapped !== (owner.ownershipLevel === "nameWrapper")) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "ENS ownership and wrapping state are inconsistent",
    });
  }

  if (analysis.isSecondLevelEth) {
    const expiry = yield* ensforge.name.getExpiry
      .effect({
        name: name.normalizedName,
        blockNumber: snapshot.blockNumber,
      })
      .pipe(
        Effect.mapError(
          () =>
            new RecordVerificationError({
              code: "ENS_READ_FAILED",
              reason: "unable to read .eth registration expiry",
            }),
        ),
      );
    if (
      expiry === null ||
      expiry.protocol !== "v1" ||
      expiry.source !== "baseRegistrar"
    ) {
      return yield* new RecordVerificationError({
        code: "AUTHORITY_INVALID",
        reason: ".eth registration state is incomplete",
      });
    }
    if (snapshot.blockTimestamp >= expiry.expiry) {
      return yield* new RecordVerificationError({
        code: "AUTHORITY_INVALID",
        reason: ".eth registration is expired at the ENS snapshot",
      });
    }

    if (wrapped) {
      if (owner.owner === null || isAddressEqual(owner.owner, zeroAddress)) {
        return yield* new RecordVerificationError({
          code: "AUTHORITY_INVALID",
          reason: "wrapped .eth name has no owner",
        });
      }
      return {
        authority: owner.owner,
        authorityValidUntil: expiry.expiry,
      };
    }
    if (
      owner.registrant === null ||
      isAddressEqual(owner.registrant, zeroAddress)
    ) {
      return yield* new RecordVerificationError({
        code: "AUTHORITY_INVALID",
        reason: ".eth registration has no registrant",
      });
    }
    return {
      authority: owner.registrant,
      authorityValidUntil: expiry.expiry,
    };
  }

  if (owner.owner === null || isAddressEqual(owner.owner, zeroAddress)) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "ENS name has no owner",
    });
  }
  if (!wrapped) {
    return { authority: owner.owner };
  }

  const fuses = yield* ensforge.wrapping.getFuses
    .effect({
      name: name.normalizedName,
      blockNumber: snapshot.blockNumber,
    })
    .pipe(
      Effect.mapError(
        () =>
          new RecordVerificationError({
            code: "ENS_READ_FAILED",
            reason: "unable to read Name Wrapper fuses",
          }),
      ),
    );
  if (fuses.protocol !== "v1" || !fuses.supported || !fuses.wrapped) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "wrapped ENS ownership state is inconsistent",
    });
  }
  if (!fuses.active.includes("parentCannotControl")) {
    return { authority: owner.owner };
  }

  const wrapperExpiry = yield* ensforge.wrapping.getWrapperExpiry
    .effect({
      name: name.normalizedName,
      blockNumber: snapshot.blockNumber,
    })
    .pipe(
      Effect.mapError(
        () =>
          new RecordVerificationError({
            code: "ENS_READ_FAILED",
            reason: "unable to read Name Wrapper expiry",
          }),
      ),
    );
  if (
    wrapperExpiry.protocol !== "v1" ||
    !wrapperExpiry.supported ||
    !wrapperExpiry.wrapped ||
    wrapperExpiry.expiry === null
  ) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "wrapped ENS expiry state is incomplete",
    });
  }
  if (snapshot.blockTimestamp >= wrapperExpiry.expiry) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "wrapped ENS name is expired at the ENS snapshot",
    });
  }

  return {
    authority: owner.owner,
    authorityValidUntil: wrapperExpiry.expiry,
  };
});
