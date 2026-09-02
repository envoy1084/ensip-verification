export const HTTPS_ORIGIN_METHOD_ID = "https-origin.v1" as const;
export const HTTPS_ORIGIN_MAX_LIFETIME_SECONDS = 31_536_000n;
export const HTTPS_ORIGIN_PROOF_PATH = "/.well-known/ens-record-verification/";

export const httpsOriginDescriptorPolicy = Object.freeze({
  proofUri: "forbidden" as const,
});
