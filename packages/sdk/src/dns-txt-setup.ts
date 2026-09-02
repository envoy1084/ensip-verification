import { Clock, Effect, Schema } from "effect";

import type { Ensforge } from "@ensforge/sdk";
import type { Address, Hex, PublicClient } from "viem";

import {
  ENS_RECORD_VERIFICATION_DOMAIN,
  ENS_RECORD_VERIFICATION_TYPES,
} from "./data/claims.js";
import { DNS_TXT_PROOF_MAX_BYTES } from "./data/limits.js";
import {
  DNS_TXT_MAX_LIFETIME_SECONDS,
  DNS_TXT_METHOD_ID,
} from "./data/methods.js";
import { resolveEnsAuthorityV1 } from "./protocol/authority.js";
import {
  deriveCommonClaim,
  deriveProofKey,
  hashCommonClaim,
} from "./protocol/claims.js";
import { parseDescriptor } from "./protocol/descriptor.js";
import { deriveDnsProofOwner, deriveDnsTxtTarget } from "./protocol/dns.js";
import {
  ensureEnsSnapshotCanonical,
  readEnsRecordSnapshot,
} from "./protocol/ens.js";
import { prepareEnsName } from "./protocol/name.js";
import { deriveRecordMetadata } from "./protocol/records.js";
import { validateAuthoritySignature } from "./protocol/signatures.js";
import { ProofEnvelope } from "./schema/claims.js";
import {
  type RpcError,
  ValidationError,
  VerificationError,
} from "./schema/errors.js";
import type {
  CreateDnsTxtRecordInput,
  DnsTxtVerificationPreparation,
  PrepareDnsTxtVerificationInput,
} from "./schema/sdk.js";

export const prepareDnsTxtVerification: (
  ensforge: Ensforge,
  publicClient: PublicClient,
  input: PrepareDnsTxtVerificationInput,
) => Effect.Effect<
  DnsTxtVerificationPreparation,
  RpcError | ValidationError | VerificationError
> = Effect.fn("prepareDnsTxtVerification")(function* (
  ensforge: Ensforge,
  publicClient: PublicClient,
  input: PrepareDnsTxtVerificationInput,
) {
  const name = yield* prepareEnsName(input.name);
  const selector = { type: input.type, key: input.key } as const;
  const resolved = yield* readEnsRecordSnapshot(ensforge, publicClient, {
    name,
    selector,
  });

  if (resolved.record.value?.type !== "text") {
    return yield* new VerificationError({
      code: "METHOD_NOT_APPLICABLE",
      message: "the target ENS text record is empty",
    });
  }
  const descriptorValue =
    resolved.discovery.value?.type === "text"
      ? resolved.discovery.value.value
      : "";
  const descriptorConfigured = descriptorValue.length > 0;
  const descriptor = descriptorConfigured
    ? yield* parseDescriptor(descriptorValue)
    : {
        protocolVersion: "ensrv1" as const,
        authorityVersion: 1n,
        method: DNS_TXT_METHOD_ID,
      };
  if (
    descriptor.authorityVersion !== 1n ||
    descriptor.method !== DNS_TXT_METHOD_ID ||
    descriptor.proofUri !== undefined
  ) {
    return yield* new VerificationError({
      code: "METHOD_NOT_APPLICABLE",
      message:
        "the existing discovery record selects a different verification method",
    });
  }

  const authority = yield* resolveEnsAuthorityV1(ensforge, {
    name,
    snapshot: resolved.snapshot,
  });
  const target = yield* deriveDnsTxtTarget(resolved.record.value.value);
  const issuedAt = BigInt(Math.floor((yield* Clock.currentTimeMillis) / 1_000));
  const maximumValidUntil = issuedAt + DNS_TXT_MAX_LIFETIME_SECONDS;
  const validUntil =
    authority.authorityValidUntil !== undefined &&
    authority.authorityValidUntil < maximumValidUntil
      ? authority.authorityValidUntil
      : maximumValidUntil;
  if (validUntil <= issuedAt) {
    return yield* new VerificationError({
      code: "NAME_EXPIRED",
      message: "the ENS authority expires before a claim can be issued",
    });
  }

  const claim = yield* deriveCommonClaim({
    name,
    selector,
    value: resolved.record.value,
    authorityVersion: descriptor.authorityVersion,
    authority,
    method: descriptor.method,
    target,
    issuedAt,
    validUntil,
  });
  const { recordKey, recordType } = deriveRecordMetadata(selector);
  const proofKey = deriveProofKey({
    authorityVersion: descriptor.authorityVersion,
    authority: authority.authority,
    node: name.node as Hex,
    recordType,
    recordKey,
    method: descriptor.method,
  });
  const dnsRecordName = yield* deriveDnsProofOwner(target, proofKey);
  yield* ensureEnsSnapshotCanonical(publicClient, resolved.snapshot);

  const publicClaim = {
    ...claim,
    node: claim.node as Hex,
    valueHash: claim.valueHash as Hex,
    authority: claim.authority as Address,
    method: DNS_TXT_METHOD_ID,
    recordType: "text" as const,
  };

  return {
    authority: publicClaim.authority,
    descriptorConfigured,
    dnsRecordName,
    ensBlockNumber: resolved.snapshot.blockNumber,
    claim: publicClaim,
    typedData: {
      domain: ENS_RECORD_VERIFICATION_DOMAIN,
      types: ENS_RECORD_VERIFICATION_TYPES,
      primaryType: "ENSRecordVerification",
      message: publicClaim,
    },
  } satisfies DnsTxtVerificationPreparation;
});

export const createDnsTxtRecord: (
  publicClient: PublicClient,
  input: CreateDnsTxtRecordInput,
) => Effect.Effect<
  {
    readonly name: string;
    readonly value: string;
    readonly zoneFileValue: string;
  },
  RpcError | ValidationError | VerificationError
> = Effect.fn("createDnsTxtRecord")(function* (
  publicClient: PublicClient,
  input: CreateDnsTxtRecordInput,
) {
  const authoritySignature = input.authoritySignature.toLowerCase();
  yield* validateAuthoritySignature(publicClient, {
    authority: input.preparation.authority,
    signature: authoritySignature,
    digest: hashCommonClaim(input.preparation.claim),
    blockNumber: input.preparation.ensBlockNumber,
  });
  const encodedEnvelope = yield* Schema.encodeUnknownEffect(ProofEnvelope)({
    v: "ensrv1",
    claim: input.preparation.claim,
    authoritySignature,
    proof: {},
  }).pipe(
    Effect.mapError(
      () =>
        new ValidationError({
          code: "INVALID_ENVELOPE",
          message: "unable to create a valid DNS TXT proof envelope",
        }),
    ),
  );
  const value = JSON.stringify(encodedEnvelope);
  if (new TextEncoder().encode(value).byteLength > DNS_TXT_PROOF_MAX_BYTES) {
    return yield* new ValidationError({
      code: "ENVELOPE_TOO_LARGE",
      message: `DNS TXT proof exceeds ${DNS_TXT_PROOF_MAX_BYTES} bytes`,
    });
  }

  return {
    name: input.preparation.dnsRecordName,
    value,
    zoneFileValue: `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
  };
});
