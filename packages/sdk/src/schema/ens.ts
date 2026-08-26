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
  readonly blockNumber: bigint;
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
