import { Schema } from "effect";

import { LogicalResolverValue, RecordSelector } from "./records.js";

const EthereumMainnetChainId = Schema.Literal(1);

export const EthereumAddress = Schema.String.check(
  Schema.isPattern(/^0x[0-9A-Fa-f]{40}$/, {
    expected: "a 20-byte Ethereum address",
  }),
);

export type EthereumAddress = typeof EthereumAddress.Type;

const EnsBlockNumber = Schema.BigInt.check(
  Schema.isGreaterThanOrEqualToBigInt(0n),
);

const EnsBlockHash = Schema.String.check(
  Schema.isPattern(/^0x[0-9a-f]{64}$/, {
    expected: "a lowercase 32-byte Ethereum block hash",
  }),
);

const EnsBlockTimestamp = Schema.BigInt.check(
  Schema.isGreaterThanOrEqualToBigInt(0n),
);

export const EnsSnapshot = Schema.Struct({
  chainId: EthereumMainnetChainId,
  blockNumber: EnsBlockNumber,
  blockHash: EnsBlockHash,
  blockTimestamp: EnsBlockTimestamp,
});

export type EnsSnapshot = typeof EnsSnapshot.Type;

export const ResolvedEnsRecord = Schema.Struct({
  selector: RecordSelector,
  resolver: EthereumAddress,
  value: Schema.NullOr(LogicalResolverValue),
});

export type ResolvedEnsRecord = typeof ResolvedEnsRecord.Type;

export const EnsRecordSnapshot = Schema.Struct({
  snapshot: EnsSnapshot,
  record: ResolvedEnsRecord,
  discovery: ResolvedEnsRecord,
});

export type EnsRecordSnapshot = typeof EnsRecordSnapshot.Type;

export class UnsupportedEnsChainError extends Schema.TaggedError<UnsupportedEnsChainError>()(
  "UnsupportedEnsChainError",
  {
    chainId: Schema.optionalKey(Schema.Number),
    message: Schema.String,
  },
) {}

export class EnsReadError extends Schema.TaggedError<EnsReadError>()(
  "EnsReadError",
  {
    reason: Schema.Literals([
      "block_unavailable",
      "resolution_failed",
      "malformed_response",
    ]),
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}
