import { Context, Effect, Layer } from "effect";

import type { PublicClient } from "viem";

import { resolveEnsAuthorityV1 } from "../protocol/authority.js";
import {
  readEnsRecord,
  readEnsRecordSnapshot,
  validateEnsPublicClient,
} from "../protocol/ens.js";
import type {
  EnsAuthority,
  EnsRecordSnapshot,
  ReadRecordInput,
  ReadRecordSnapshotInput,
  ResolveEnsAuthorityV1Input,
  ResolvedEnsRecord,
} from "../schema/ens.js";
import type { RpcError, VerificationError } from "../schema/errors.js";

export class EnsService extends Context.Service<
  EnsService,
  {
    readonly readRecord: (
      input: ReadRecordInput,
    ) => Effect.Effect<ResolvedEnsRecord, RpcError>;
    readonly readRecordSnapshot: (
      input: ReadRecordSnapshotInput,
    ) => Effect.Effect<EnsRecordSnapshot, RpcError>;
    readonly resolveAuthorityV1: (
      input: ResolveEnsAuthorityV1Input,
    ) => Effect.Effect<EnsAuthority, RpcError | VerificationError>;
  }
>()("@thenamespace/record-verification/EnsService") {
  static readonly layer = (publicClient: PublicClient) =>
    Layer.effect(
      EnsService,
      validateEnsPublicClient(publicClient).pipe(
        Effect.as(
          EnsService.of({
            readRecord: (input) => readEnsRecord(publicClient, input),
            readRecordSnapshot: (input) =>
              readEnsRecordSnapshot(publicClient, input),
            resolveAuthorityV1: (input) =>
              resolveEnsAuthorityV1(publicClient, input),
          }),
        ),
      ),
    );
}
