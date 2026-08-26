import { type Address, parseAbi } from "viem";

export const ETHEREUM_MAINNET_CHAIN_ID = 1 as const;

export const MAINNET_UNIVERSAL_RESOLVER_ADDRESS =
  "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" as const satisfies Address;

export const universalResolverResolveAbi = parseAbi([
  "error DNSDecodingFailed(bytes dns)",
  "error DNSEncodingFailed(string ens)",
  "error EmptyAddress()",
  "error HttpError(uint16 status, string message)",
  "error InvalidBatchGatewayResponse()",
  "error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData)",
  "error OffsetOutOfBoundsError(uint256 offset, uint256 length)",
  "error ResolverError(bytes errorData)",
  "error ResolverNotContract(bytes name, address resolver)",
  "error ResolverNotFound(bytes name)",
  "error UnsupportedResolverProfile(bytes4 selector)",
  "function resolve(bytes name, bytes data) view returns (bytes data, address resolver)",
]);

export const resolverTextAbi = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
]);

export const resolverAddressAbi = parseAbi([
  "function addr(bytes32 node, uint256 coinType) view returns (bytes)",
]);

export const resolverContenthashAbi = parseAbi([
  "function contenthash(bytes32 node) view returns (bytes)",
]);

export const resolverDataAbi = parseAbi([
  "function data(bytes32 node, string key) view returns (bytes)",
]);
