import { Schema } from "effect";

import { LogicalResolverValue, RecordSelector } from "./records.js";

export const EthereumMainnetChainId = Schema.Literal(1);

export type EthereumMainnetChainId = typeof EthereumMainnetChainId.Type;

export const EthereumAddress = Schema.String.check(
  Schema.isPattern(/^0x[0-9A-Fa-f]{40}$/, {
    expected: "a 20-byte Ethereum address",
  }),
).pipe(Schema.brand("EthereumAddress"));

export type EthereumAddress = typeof EthereumAddress.Type;

export const EnsBlockNumber = Schema.BigInt.check(
  Schema.isGreaterThanOrEqualToBigInt(0n),
).pipe(Schema.brand("EnsBlockNumber"));

export type EnsBlockNumber = typeof EnsBlockNumber.Type;

export const EnsBlockHash = Schema.String.check(
  Schema.isPattern(/^0x[0-9a-f]{64}$/, {
    expected: "a lowercase 32-byte Ethereum block hash",
  }),
).pipe(Schema.brand("EnsBlockHash"));

export type EnsBlockHash = typeof EnsBlockHash.Type;

export const EnsBlockTimestamp = Schema.BigInt.check(
  Schema.isGreaterThanOrEqualToBigInt(0n),
).pipe(Schema.brand("EnsBlockTimestamp"));

export type EnsBlockTimestamp = typeof EnsBlockTimestamp.Type;

export const EnsSnapshot = Schema.Struct({
  chainId: EthereumMainnetChainId,
  blockNumber: EnsBlockNumber,
  blockHash: EnsBlockHash,
  blockTimestamp: EnsBlockTimestamp,
});

export type EnsSnapshot = typeof EnsSnapshot.Type;

export const UniversalResolverResponse = Schema.Struct({
  resolver: EthereumAddress,
  data: Schema.String.check(
    Schema.isPattern(/^0x(?:[0-9a-f]{2})*$/, {
      expected: "0x-prefixed, even-length lowercase hexadecimal",
    }),
  ),
});

export type UniversalResolverResponse = typeof UniversalResolverResponse.Type;

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
    chainId: Schema.Number,
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
