import { encodeAbiParameters, hashDomain, keccak256, toBytes } from "viem";

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

export const SECP256K1_ORDER =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
export const SECP256K1_HALF_ORDER =
  0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n;
export const ERC1271_MAGIC_VALUE = "0x1626ba7e";
export const ERC1271_CANONICAL_RESULT = encodeAbiParameters(
  [{ type: "bytes4" }],
  [ERC1271_MAGIC_VALUE],
);
