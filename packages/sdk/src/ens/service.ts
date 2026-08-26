import { Context, Effect, Layer } from "effect";

import type { PublicClient } from "viem";

import {
  readEnsRecord,
  readEnsRecordSnapshot,
  validateEnsPublicClient,
} from "../protocol/ens.js";
import type {
  EnsReadError,
  EnsRecordSnapshot,
  ReadRecordInput,
  ReadRecordSnapshotInput,
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
          }),
        ),
      ),
    );
}
