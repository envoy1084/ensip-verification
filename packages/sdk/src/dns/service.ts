import { Context, type Effect } from "effect";

import type { RpcError, VerificationError } from "../schema/errors.js";

export interface SecureTxtQuery {
  readonly owner: string;
  readonly checkedAt: bigint;
}

export interface SecureTxtResult {
  readonly bytes: Uint8Array;
  readonly cacheUntil: bigint;
}

export class DnsService extends Context.Service<
  DnsService,
  {
    readonly resolveSecureTxt: (
      query: SecureTxtQuery,
    ) => Effect.Effect<SecureTxtResult, RpcError | VerificationError>;
  }
>()("@thenamespace/record-verification/DnsService") {}
