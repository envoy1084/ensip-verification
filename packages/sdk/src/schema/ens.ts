import { Schema } from "effect";

import { EthereumAddress } from "./encoding.js";
import type { EnsNameIdentity } from "./name.js";
import { LogicalResolverValueSchema, RecordSelectorSchema } from "./records.js";
import type { RecordSelector } from "./records.js";

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
  selector: RecordSelectorSchema,
  value: Schema.NullOr(LogicalResolverValueSchema),
});

export type ResolvedEnsRecord = typeof ResolvedEnsRecord.Type;

export const EnsRecordSnapshot = Schema.Struct({
  snapshot: EnsSnapshot,
  record: ResolvedEnsRecord,
  discovery: ResolvedEnsRecord,
});

export type EnsRecordSnapshot = typeof EnsRecordSnapshot.Type;

export interface ReadRecordSnapshotInput {
  readonly name: EnsNameIdentity;
  readonly selector: RecordSelector;
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
