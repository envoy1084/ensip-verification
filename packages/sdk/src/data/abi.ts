import { parseAbi } from "viem";

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

export const ensRegistryAbi = parseAbi([
  "function owner(bytes32 node) view returns (address)",
]);

export const nameWrapperAbi = parseAbi([
  "function getData(uint256 id) view returns (address owner, uint32 fuses, uint64 expiry)",
]);

export const baseRegistrarAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function nameExpires(uint256 tokenId) view returns (uint256)",
]);

export const erc1271Abi = parseAbi([
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)",
]);
