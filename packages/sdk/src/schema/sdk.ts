import type { PublicClient } from "viem";
import type { Address, Hex } from "viem";

import type { RecordVerificationErrorCode } from "./errors.js";
import type { RecordSelector } from "./records.js";

export interface RecordVerificationOptions {
  readonly publicClient: PublicClient;
  readonly fetch?: typeof globalThis.fetch;
  readonly dnsOverHttpsUrl?: string;
}

export type VerifyRecordInput = RecordSelector & { readonly name: string };

export interface VerificationResult {
  readonly verified: true;
  readonly type: "control";
  readonly method: "https-origin.v1" | "dns-txt.v1";
  readonly target: string;
  readonly validUntil: bigint;
  readonly cacheUntil: bigint;
}

export interface VerifyRecordData {
  readonly value: string;
  readonly verification: VerificationResult;
}

export interface RecordVerificationError {
  readonly code: RecordVerificationErrorCode;
  readonly reason: string;
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

export type VerifyRecordResult = RecordVerificationResult<VerifyRecordData>;

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
