import { Effect, Schema } from "effect";

import {
  encodeAbiParameters,
  hashDomain,
  hashTypedData,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";

import {
  ClaimError,
  CommonClaim,
  type CommonClaim as CommonClaimType,
  type DeriveCommonClaimInput,
  type ProofKeyInput,
} from "../schema/claims.js";
import {
  deriveLogicalResolverValueBytes,
  deriveRecordMetadata,
} from "./records.js";

export const ENS_RECORD_VERIFICATION_DOMAIN = {
  name: "ENS Record Verification",
  version: "1",
  chainId: 1n,
} as const;

export const ENS_RECORD_VERIFICATION_TYPES = {
  ENSRecordVerification: [
    { name: "name", type: "string" },
    { name: "node", type: "bytes32" },
    { name: "recordType", type: "string" },
    { name: "recordKey", type: "string" },
    { name: "valueHash", type: "bytes32" },
    { name: "authorityVersion", type: "uint32" },
    { name: "authority", type: "address" },
    { name: "method", type: "string" },
    { name: "target", type: "string" },
    { name: "issuedAt", type: "uint64" },
    { name: "validUntil", type: "uint64" },
  ],
} as const;

export const ENS_RECORD_VERIFICATION_DOMAIN_SEPARATOR = hashDomain({
  domain: ENS_RECORD_VERIFICATION_DOMAIN,
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
    ],
  },
});

export const PROOF_KEY_TYPEHASH = keccak256(
  toBytes(
    "ENSRecordVerificationProofKey(bytes32 domainSeparator,uint32 authorityVersion,address authority,bytes32 node,bytes32 recordTypeHash,bytes32 recordKeyHash,bytes32 methodHash)",
  ),
);

export const deriveResolverValueHash = Effect.fn("deriveResolverValueHash")(
  function* (value: DeriveCommonClaimInput["value"]) {
    return keccak256(yield* deriveLogicalResolverValueBytes(value));
  },
);

export const deriveCommonClaim = Effect.fn("deriveCommonClaim")(function* (
  input: DeriveCommonClaimInput,
) {
  const { recordType, recordKey } = deriveRecordMetadata(input.selector);
  const valueHash = yield* deriveResolverValueHash(input.value);

  return yield* Schema.decodeUnknownEffect(CommonClaim)({
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
  }).pipe(
    Effect.mapError(
      (cause) =>
        new ClaimError({
          code: "INVALID_CLAIM",
          message: "unable to derive a valid common claim",
          cause,
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
      return yield* new ClaimError({
        code: "CLAIM_MISMATCH",
        message: `claim ${field} does not match live ENS state`,
      });
    }
  }
});
