import { parseAbi } from "viem";

export const erc1271Abi = parseAbi([
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)",
]);
