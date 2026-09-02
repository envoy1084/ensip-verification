import { Effect } from "effect";

import type { Ensforge } from "@ensforge/sdk";

import type {
  EnsAuthority,
  ResolveEnsAuthorityV1Input,
} from "../schema/ens.js";
import { RecordVerificationError } from "../schema/errors.js";
import { resolveEnsAuthorityV1 } from "./v1/resolve.js";

export const resolveRegisteredAuthority = Effect.fn(
  "resolveRegisteredAuthority",
)(function* (
  ensforge: Ensforge,
  authorityVersion: bigint,
  input: ResolveEnsAuthorityV1Input,
): Effect.fn.Return<EnsAuthority, RecordVerificationError> {
  if (authorityVersion !== 1n) {
    return yield* new RecordVerificationError({
      code: "UNSUPPORTED_AUTHORITY",
      reason: `unsupported authority version: ${authorityVersion}`,
    });
  }

  return yield* resolveEnsAuthorityV1(ensforge, input);
});
