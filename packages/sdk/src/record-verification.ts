import { Clock, Effect, Schema } from "effect";

import { Ensforge } from "@ensforge/sdk";
import { bytesToHex } from "viem";

import { NodeDnsServiceLayer } from "./dns/node.js";
import { NodeHttpServiceLayer } from "./http/node.js";
import { verifyRegisteredMethod } from "./methods/registry.js";
import { resolveEnsAuthorityV1 } from "./protocol/authority.js";
import { parseDescriptor } from "./protocol/descriptor.js";
import {
  ensureEnsSnapshotCanonical,
  readEnsRecord,
  readEnsRecordSnapshot,
} from "./protocol/ens.js";
import { prepareEnsName } from "./protocol/name.js";
import { ValidationError, VerificationError } from "./schema/errors.js";
import {
  type LogicalResolverValue,
  type RecordSelector,
  RecordSelectorSchema,
} from "./schema/records.js";
import {
  type GetRecordInput,
  type GetRecordResult,
  type RecordVerificationOptions,
} from "./schema/sdk.js";

const decodeRecordSelector = Effect.fn("decodeRecordSelector")(function* (
  input: GetRecordInput<boolean>,
) {
  return yield* Schema.decodeUnknownEffect(RecordSelectorSchema)(input).pipe(
    Effect.mapError(
      () =>
        new ValidationError({
          code: "INVALID_RECORD_INPUT",
          message:
            input.type === "addr"
              ? "addr key must be a canonical uint256 decimal"
              : "record selector is invalid",
        }),
    ),
  );
});

const toPublicRecordValue = (
  value: LogicalResolverValue | null,
): string | null => {
  if (value === null) return null;
  return value.type === "text" ? value.value : bytesToHex(value.value);
};

export class RecordVerification {
  readonly #publicClient: RecordVerificationOptions["publicClient"];
  readonly #ensforge: Ensforge;

  constructor({ publicClient }: RecordVerificationOptions) {
    this.#publicClient = publicClient;
    this.#ensforge = new Ensforge({ network: "mainnet", publicClient });
  }

  getRecord(input: GetRecordInput<true>): Promise<GetRecordResult<true>>;
  getRecord(input: GetRecordInput<false>): Promise<GetRecordResult<false>>;
  getRecord(input: GetRecordInput<boolean>): Promise<GetRecordResult<boolean>>;
  getRecord(input: GetRecordInput<boolean>): Promise<GetRecordResult<boolean>> {
    const publicClient = this.#publicClient;
    const ensforge = this.#ensforge;
    const program = Effect.gen(function* () {
      const name = yield* prepareEnsName(input.name);
      const selector: RecordSelector = yield* decodeRecordSelector(input);

      if (input.verify !== true) {
        const record = yield* readEnsRecord(ensforge, name, selector);
        return {
          value: toPublicRecordValue(record.value),
          verification: null,
        };
      }

      const checkedAt = BigInt(
        Math.floor((yield* Clock.currentTimeMillis) / 1_000),
      );
      const resolved = yield* readEnsRecordSnapshot(ensforge, publicClient, {
        name,
        selector,
      });
      if (resolved.record.value === null) {
        return yield* new VerificationError({
          code: "METHOD_NOT_APPLICABLE",
          message: "the target ENS record is empty",
        });
      }
      if (
        resolved.discovery.value === null ||
        resolved.discovery.value.type !== "text" ||
        resolved.discovery.value.value.length === 0
      ) {
        return yield* new VerificationError({
          code: "METHOD_NOT_APPLICABLE",
          message: "the verification descriptor is not configured",
        });
      }

      const descriptor = yield* parseDescriptor(resolved.discovery.value.value);
      const authority = yield* resolveEnsAuthorityV1(ensforge, {
        name,
        snapshot: resolved.snapshot,
      });
      yield* verifyRegisteredMethod({
        publicClient,
        name,
        selector,
        value: resolved.record.value,
        descriptor,
        authority,
        snapshot: resolved.snapshot,
        checkedAt,
      });
      yield* ensureEnsSnapshotCanonical(publicClient, resolved.snapshot);

      return {
        value: toPublicRecordValue(resolved.record.value),
        verification: {
          verified: true as const,
          verificationType: "control" as const,
        },
      };
    });

    return Effect.runPromise(
      program.pipe(
        Effect.provide(NodeHttpServiceLayer),
        Effect.provide(NodeDnsServiceLayer),
        Effect.match({
          onFailure: (error) => ({
            success: false as const,
            error: { code: error.code, message: error.message },
          }),
          onSuccess: (data) => ({ success: true as const, data }),
        }),
      ),
    );
  }
}
