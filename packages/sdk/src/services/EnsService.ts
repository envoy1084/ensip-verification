import { Context, Layer, type Effect } from "effect";

import { Ensforge } from "@ensforge/sdk";
import type { PublicClient } from "viem";

import { resolveRegisteredAuthority } from "../authority/registry.js";
import { validateAuthoritySignature } from "../authority/v1/signature.js";
import {
  ensureEnsSnapshotCanonical,
  readEnsRecordSnapshot,
} from "../runtime/ensforge-operations.js";
import type { ValidateAuthoritySignatureInput } from "../schema/claims.js";
import type {
  EnsAuthority,
  EnsRecordSnapshot,
  EnsSnapshot,
  ReadRecordSnapshotInput,
  ResolveEnsAuthorityV1Input,
} from "../schema/ens.js";
import type { RecordVerificationError } from "../schema/errors.js";

export interface EnsServiceLayerOptions {
  readonly publicClient: PublicClient;
}

export class EnsService extends Context.Service<
  EnsService,
  {
    readonly readRecordSnapshot: (
      input: ReadRecordSnapshotInput,
    ) => Effect.Effect<EnsRecordSnapshot, RecordVerificationError>;
    readonly resolveAuthority: (
      authorityVersion: bigint,
      input: ResolveEnsAuthorityV1Input,
    ) => Effect.Effect<EnsAuthority, RecordVerificationError>;
    readonly validateAuthoritySignature: (
      input: ValidateAuthoritySignatureInput,
    ) => Effect.Effect<void, RecordVerificationError>;
    readonly ensureSnapshotCanonical: (
      snapshot: EnsSnapshot,
    ) => Effect.Effect<void, RecordVerificationError>;
  }
>()("@thenamespace/record-verification/EnsService") {
  static readonly layer = ({ publicClient }: EnsServiceLayerOptions) => {
    const ensforge = new Ensforge({ network: "mainnet", publicClient });

    return Layer.succeed(
      EnsService,
      EnsService.of({
        readRecordSnapshot: (input) =>
          readEnsRecordSnapshot(ensforge, publicClient, input),
        resolveAuthority: (authorityVersion, input) =>
          resolveRegisteredAuthority(ensforge, authorityVersion, input),
        validateAuthoritySignature: (input) =>
          validateAuthoritySignature(publicClient, input),
        ensureSnapshotCanonical: (snapshot) =>
          ensureEnsSnapshotCanonical(publicClient, snapshot),
      }),
    );
  };

  static readonly layerBrowser = this.layer;
}
