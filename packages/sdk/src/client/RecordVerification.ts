import { Clock, Effect, ManagedRuntime, Schema, type Layer } from "effect";

import { bytesToHex } from "viem";

import { parseDescriptor } from "../core/descriptor.js";
import { prepareEnsName } from "../core/name.js";
import {
  createDnsTxtRecord,
  prepareDnsTxtVerification,
} from "../methods/dns-txt-v1/setup.js";
import {
  validateRegisteredMethodDescriptor,
  verifyRegisteredMethod,
} from "../methods/registry.js";
import { RecordVerificationError } from "../schema/errors.js";
import {
  type LogicalResolverValue,
  type RecordSelector,
  RecordSelectorSchema,
} from "../schema/records.js";
import type {
  CreateDnsTxtRecordInput,
  CreateDnsTxtRecordResult,
  PrepareDnsTxtVerificationInput,
  PrepareDnsTxtVerificationResult,
  RecordVerificationResult,
  VerifyRecordInput,
  VerifyRecordResult,
} from "../schema/sdk.js";
import type { DnsService } from "../services/DnsService.js";
import { EnsService } from "../services/EnsService.js";
import type { HttpService } from "../services/HttpService.js";
type RuntimeServices = DnsService | EnsService | HttpService;

const decodeRecordSelector = Effect.fn("decodeRecordSelector")(function* (
  input: VerifyRecordInput,
) {
  return yield* Schema.decodeUnknownEffect(RecordSelectorSchema)(input).pipe(
    Effect.mapError(
      () =>
        new RecordVerificationError({
          code: "INVALID_INPUT",
          reason:
            input.type === "addr"
              ? "addr key must be a canonical uint256 decimal"
              : "record selector is invalid",
        }),
    ),
  );
});

const toPublicRecordValue = (value: LogicalResolverValue): string =>
  value.type === "text" ? value.value : bytesToHex(value.value);

export class RecordVerificationClient {
  readonly #runtime: ManagedRuntime.ManagedRuntime<RuntimeServices, never>;

  constructor(runtimeLayer: Layer.Layer<RuntimeServices>) {
    this.#runtime = ManagedRuntime.make(runtimeLayer);
  }

  #run<Data>(
    program: Effect.Effect<Data, RecordVerificationError, RuntimeServices>,
  ): Promise<RecordVerificationResult<Data>> {
    return this.#runtime.runPromise(
      program.pipe(
        Effect.match({
          onFailure: (error) => ({
            success: false as const,
            error: { code: error.code, reason: error.reason },
          }),
          onSuccess: (data) => ({ success: true as const, data }),
        }),
      ),
    );
  }

  verifyRecord(input: VerifyRecordInput): Promise<VerifyRecordResult> {
    return this.#run(
      Effect.gen(function* () {
        const ens = yield* EnsService;
        const name = yield* prepareEnsName(input.name);
        const selector: RecordSelector = yield* decodeRecordSelector(input);
        const checkedAt = BigInt(
          Math.floor((yield* Clock.currentTimeMillis) / 1_000),
        );
        const resolved = yield* ens.readRecordSnapshot({
          name,
          selector,
        });

        if (resolved.record.value === null) {
          return yield* new RecordVerificationError({
            code: "RECORD_NOT_FOUND",
            reason: "the requested ENS record is empty",
          });
        }
        if (
          resolved.discovery.value === null ||
          resolved.discovery.value.type !== "text" ||
          resolved.discovery.value.value.length === 0
        ) {
          return yield* new RecordVerificationError({
            code: "VERIFICATION_NOT_CONFIGURED",
            reason: "the verification descriptor is not configured",
          });
        }

        const descriptor = yield* parseDescriptor(
          resolved.discovery.value.value,
        );
        yield* validateRegisteredMethodDescriptor(descriptor);
        const authority = yield* ens.resolveAuthority(
          descriptor.authorityVersion,
          {
            name,
            snapshot: resolved.snapshot,
          },
        );
        const verification = yield* verifyRegisteredMethod({
          name,
          selector,
          value: resolved.record.value,
          descriptor,
          authority,
          snapshot: resolved.snapshot,
          checkedAt,
        });
        yield* ens.ensureSnapshotCanonical(resolved.snapshot);

        return {
          value: toPublicRecordValue(resolved.record.value),
          verification: {
            verified: true as const,
            type: "control" as const,
            method: verification.method,
            target: verification.target,
            validUntil: verification.common.effectiveValidUntil,
            cacheUntil: verification.common.cacheUntil,
          },
        };
      }),
    );
  }

  prepareDnsTxtVerification(
    input: PrepareDnsTxtVerificationInput,
  ): Promise<PrepareDnsTxtVerificationResult> {
    return this.#run(prepareDnsTxtVerification(input));
  }

  createDnsTxtRecord(
    input: CreateDnsTxtRecordInput,
  ): Promise<CreateDnsTxtRecordResult> {
    return this.#run(createDnsTxtRecord(input));
  }

  close(): Promise<void> {
    return this.#runtime.dispose();
  }
}
