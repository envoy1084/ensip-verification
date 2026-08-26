import type { Address } from "viem";

export const ETHEREUM_MAINNET_CHAIN_ID = 1 as const;

export const MAINNET_UNIVERSAL_RESOLVER_ADDRESS =
  "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" as const satisfies Address;

export const ENS_REGISTRY_ADDRESS =
  "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const satisfies Address;

export const ENS_BASE_REGISTRAR_ADDRESS =
  "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85" as const satisfies Address;

export const ENS_NAME_WRAPPER_ADDRESS =
  "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401" as const satisfies Address;
