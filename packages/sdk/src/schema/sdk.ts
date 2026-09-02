import type { PublicClient } from "viem";
import type { Address, Hex } from "viem";

import type { SdkErrorCode } from "../data/errors.js";
import type { RecordSelector } from "./records.js";

export interface RecordVerificationOptions {
  readonly publicClient: PublicClient;
}

type RecordQuery = RecordSelector & { readonly name: string };

type VerificationOption<Verify extends boolean> = Verify extends true
  ? { readonly verify: true }
  : { readonly verify?: false };

export type GetRecordInput<Verify extends boolean = false> = RecordQuery &
  VerificationOption<Verify>;

export type VerificationResult =
  | { readonly verified: true; readonly verificationType: "control" }
  | { readonly verified: false };

export interface GetRecordData<Verify extends boolean = false> {
  readonly value: string | null;
  readonly verification: Verify extends true ? VerificationResult : null;
}

export interface RecordVerificationError {
  readonly code: SdkErrorCode;
  readonly message: string;
}

export type RecordVerificationResult<Data> =
  | {
      readonly success: true;
      readonly data: Data;
    }
  | {
      readonly success: false;
      readonly error: RecordVerificationError;
    };

export type GetRecordResult<Verify extends boolean = false> =
  RecordVerificationResult<GetRecordData<Verify>>;

export interface PrepareDnsTxtVerificationInput {
  readonly name: string;
  readonly type: "text";
  readonly key: string;
}

export interface DnsTxtVerificationClaim {
  readonly name: string;
  readonly node: Hex;
  readonly recordType: "text";
  readonly recordKey: string;
  readonly valueHash: Hex;
  readonly authorityVersion: bigint;
  readonly authority: Address;
  readonly method: "dns-txt.v1";
  readonly target: string;
  readonly issuedAt: bigint;
  readonly validUntil: bigint;
}

export interface DnsTxtVerificationPreparation {
  readonly authority: Address;
  readonly descriptorConfigured: boolean;
  readonly dnsRecordName: string;
  readonly ensBlockNumber: bigint;
  readonly claim: DnsTxtVerificationClaim;
  readonly typedData: {
    readonly domain: {
      readonly name: "ENS Record Verification";
      readonly version: "1";
      readonly chainId: 1n;
    };
    readonly types: {
      readonly ENSRecordVerification: readonly {
        readonly name: string;
        readonly type: string;
      }[];
    };
    readonly primaryType: "ENSRecordVerification";
    readonly message: DnsTxtVerificationClaim;
  };
}

export type PrepareDnsTxtVerificationResult =
  RecordVerificationResult<DnsTxtVerificationPreparation>;

export interface CreateDnsTxtRecordInput {
  readonly preparation: DnsTxtVerificationPreparation;
  readonly authoritySignature: Hex;
}

export interface DnsTxtRecord {
  readonly name: string;
  readonly value: string;
  readonly zoneFileValue: string;
}

export type CreateDnsTxtRecordResult = RecordVerificationResult<DnsTxtRecord>;
