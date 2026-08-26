import { Schema } from "effect";

import { EthereumAddress } from "./encoding.js";
import type { EnsNameIdentity } from "./name.js";
import { LogicalResolverValue, RecordSelector } from "./records.js";
import type { RecordSelector as RecordSelectorType } from "./records.js";

const EthereumMainnetChainId = Schema.Literal(1);

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

export interface ReadRecordInput {
  readonly name: EnsNameIdentity;
  readonly selector: RecordSelectorType;
  readonly snapshot: EnsSnapshot;
}

export interface ReadRecordSnapshotInput {
  readonly name: EnsNameIdentity;
  readonly selector: RecordSelectorType;
  readonly blockNumber: bigint;
}

export const EnsAuthority = Schema.Struct({
  authority: EthereumAddress,
  authorityValidUntil: Schema.optionalKey(EnsBlockTimestamp),
});

export type EnsAuthority = typeof EnsAuthority.Type;

export interface ResolveEnsAuthorityV1Input {
  readonly name: EnsNameIdentity;
  readonly snapshot: EnsSnapshot;
}

export class UnsupportedEnsChainError extends Schema.TaggedError<UnsupportedEnsChainError>()(
  "UnsupportedEnsChainError",
  {
    code: Schema.Literal("UNSUPPORTED_ENS_CHAIN"),
    chainId: Schema.optionalKey(Schema.Number),
    message: Schema.String,
  },
) {}

export class EnsReadError extends Schema.TaggedError<EnsReadError>()(
  "EnsReadError",
  {
    code: Schema.Literals([
      "BLOCK_UNAVAILABLE",
      "RESOLUTION_FAILED",
      "MALFORMED_RESPONSE",
    ]),
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

export class EnsAuthorityError extends Schema.TaggedError<EnsAuthorityError>()(
  "EnsAuthorityError",
  {
    code: Schema.Literals([
      "UNSUPPORTED_NAME",
      "OWNER_NOT_FOUND",
      "NAME_EXPIRED",
      "AUTHORITY_READ_FAILED",
      "INVALID_AUTHORITY_STATE",
    ]),
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}
