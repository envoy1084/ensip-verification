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
  EnsAuthorityError,
  EnsReadError,
  EnsRecordSnapshot,
  ReadRecordInput,
  ReadRecordSnapshotInput,
  ResolveEnsAuthorityV1Input,
  ResolvedEnsRecord,
} from "../schema/ens.js";

export class EnsService extends Context.Service<
  EnsService,
  {
    readonly readRecord: (
      input: ReadRecordInput,
    ) => Effect.Effect<ResolvedEnsRecord, EnsReadError>;
    readonly readRecordSnapshot: (
      input: ReadRecordSnapshotInput,
    ) => Effect.Effect<EnsRecordSnapshot, EnsReadError>;
    readonly resolveAuthorityV1: (
      input: ResolveEnsAuthorityV1Input,
    ) => Effect.Effect<EnsAuthority, EnsAuthorityError>;
  }
>()("@ens-record-verification/sdk/EnsService") {
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
