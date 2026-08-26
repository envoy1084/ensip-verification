import { Effect, Schema } from "effect";

import { bytesToHex } from "viem";

import { readEnsRecord, validateEnsPublicClient } from "./protocol/ens.js";
import { prepareEnsName } from "./protocol/name.js";
import { Uint256 } from "./schema/encoding.js";
import {
  RpcError,
  ValidationError,
  VerificationError,
} from "./schema/errors.js";
import {
  type LogicalResolverValue,
  RecordSelector,
  type RecordSelector as RecordSelectorType,
} from "./schema/records.js";
import {
  type GetRecordInput,
  type GetRecordResult,
  type RecordVerificationOptions,
} from "./schema/sdk.js";

const decodeRecordSelector = Effect.fn("decodeRecordSelector")(function* (
  input: GetRecordInput<boolean>,
) {
  let selector: unknown;

  switch (input.type) {
    case "text":
      selector = { _tag: "Text", key: input.key };
      break;
    case "addr": {
      const coinType = yield* Schema.decodeUnknownEffect(Uint256)(
        input.key,
      ).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              code: "INVALID_RECORD_INPUT",
              message: "addr key must be a canonical uint256 decimal",
            }),
        ),
      );
      selector = { _tag: "Address", coinType };
      break;
    }
    case "contenthash":
      selector = { _tag: "Contenthash" };
      break;
    case "data":
      selector = { _tag: "Data", key: input.key };
      break;
    default:
      return yield* new ValidationError({
        code: "INVALID_RECORD_INPUT",
        message: "unsupported ENS record type",
      });
  }

  return yield* Schema.decodeUnknownEffect(RecordSelector)(selector).pipe(
    Effect.mapError(
      () =>
        new ValidationError({
          code: "INVALID_RECORD_INPUT",
          message: "record key is invalid",
        }),
    ),
  );
});

const toPublicRecordValue = (
  value: LogicalResolverValue | null,
): string | null => {
  if (value === null) return null;
  return value["_tag"] === "Text" ? value.value : bytesToHex(value.value);
};

export class RecordVerification {
  readonly #publicClient: RecordVerificationOptions["publicClient"];

  constructor({ publicClient }: RecordVerificationOptions) {
    this.#publicClient = publicClient;
  }

  getRecord(input: GetRecordInput<true>): Promise<GetRecordResult<true>>;
  getRecord(input: GetRecordInput<false>): Promise<GetRecordResult<false>>;
  getRecord(input: GetRecordInput<boolean>): Promise<GetRecordResult<boolean>>;
  getRecord(input: GetRecordInput<boolean>): Promise<GetRecordResult<boolean>> {
    const publicClient = this.#publicClient;
    const program = Effect.gen(function* () {
      yield* validateEnsPublicClient(publicClient);
      const name = yield* prepareEnsName(input.name);
      const selector: RecordSelectorType = yield* decodeRecordSelector(input);

      if (input.verify === true) {
        return yield* new VerificationError({
          code: "VERIFICATION_NOT_IMPLEMENTED",
          message: "record verification is not implemented yet",
        });
      }

      const blockNumber = yield* Effect.tryPromise({
        try: () => publicClient.getBlockNumber(),
        catch: () =>
          new RpcError({
            code: "BLOCK_UNAVAILABLE",
            message: "unable to select an Ethereum block",
          }),
      });
      const record = yield* readEnsRecord(publicClient, {
        name,
        selector,
        blockNumber,
      });

      return {
        value: toPublicRecordValue(record.value),
        verification: null,
      };
    });

    return Effect.runPromise(
      program.pipe(
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
