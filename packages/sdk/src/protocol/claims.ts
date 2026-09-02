import { Effect, Schema } from "effect";

import {
  encodeAbiParameters,
  hashTypedData,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";

import {
  ENS_RECORD_VERIFICATION_DOMAIN,
  ENS_RECORD_VERIFICATION_DOMAIN_SEPARATOR,
  ENS_RECORD_VERIFICATION_TYPES,
  PROOF_KEY_TYPEHASH,
} from "../data/claims.js";
import {
  CommonClaim,
  type CommonClaim as CommonClaimType,
  type DeriveCommonClaimInput,
  type ProofKeyInput,
} from "../schema/claims.js";
import { ValidationError, VerificationError } from "../schema/errors.js";
import {
  deriveLogicalResolverValueBytes,
  deriveRecordMetadata,
} from "./records.js";

export const deriveResolverValueHash = Effect.fn("deriveResolverValueHash")(
  function* (value: DeriveCommonClaimInput["value"]) {
    return keccak256(yield* deriveLogicalResolverValueBytes(value));
  },
);

export const deriveCommonClaim = Effect.fn("deriveCommonClaim")(function* (
  input: DeriveCommonClaimInput,
) {
  const { recordType, recordKey } = deriveRecordMetadata(input.selector);
  const valueHash = yield* deriveResolverValueHash(input.value).pipe(
    Effect.mapError(
      () =>
        new ValidationError({
          code: "INVALID_CLAIM",
          message: "unable to hash the live resolver value",
        }),
    ),
  );

  const claim = {
    name: input.name.normalizedName,
    node: input.name.node,
    recordType,
    recordKey,
    valueHash,
    authorityVersion: input.authorityVersion,
    authority: input.authority.authority.toLowerCase(),
    method: input.method,
    target: input.target,
    issuedAt: input.issuedAt,
    validUntil: input.validUntil,
  };

  return yield* Schema.encodeUnknownEffect(CommonClaim)(claim).pipe(
    Effect.flatMap(Schema.decodeEffect(CommonClaim)),
    Effect.mapError(
      () =>
        new ValidationError({
          code: "INVALID_CLAIM",
          message: "unable to derive a valid common claim",
        }),
    ),
  );
});

export const hashCommonClaim = (claim: CommonClaimType): Hex =>
  hashTypedData({
    domain: ENS_RECORD_VERIFICATION_DOMAIN,
    types: ENS_RECORD_VERIFICATION_TYPES,
    primaryType: "ENSRecordVerification",
    message: {
      ...claim,
      node: claim.node as Hex,
      valueHash: claim.valueHash as Hex,
      authority: claim.authority as Address,
      authorityVersion: Number(claim.authorityVersion),
    },
  });

export const deriveProofKey = (input: ProofKeyInput): Hex =>
  keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "uint32" },
        { type: "address" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
      ],
      [
        PROOF_KEY_TYPEHASH,
        ENS_RECORD_VERIFICATION_DOMAIN_SEPARATOR,
        Number(input.authorityVersion),
        input.authority as Address,
        input.node,
        keccak256(toBytes(input.recordType)),
        keccak256(toBytes(input.recordKey)),
        keccak256(toBytes(input.method)),
      ],
    ),
  );

export const compareCommonClaim = Effect.fn("compareCommonClaim")(function* (
  claim: CommonClaimType,
  expected: CommonClaimType,
) {
  for (const field of [
    "name",
    "node",
    "recordType",
    "recordKey",
    "valueHash",
    "authorityVersion",
    "authority",
    "method",
    "target",
  ] as const) {
    if (claim[field] !== expected[field]) {
      return yield* new VerificationError({
        code: "CLAIM_MISMATCH",
        message: `claim ${field} does not match live ENS state`,
      });
    }
  }
});
