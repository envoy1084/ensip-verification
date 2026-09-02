export const HTTPS_ORIGIN_METHOD_ID = "https-origin.v1" as const;
export const HTTPS_ORIGIN_MAX_LIFETIME_SECONDS = 31_536_000n;
export const HTTPS_ORIGIN_PROOF_PATH = "/.well-known/ens-record-verification/";

export const DNS_TXT_METHOD_ID = "dns-txt.v1" as const;
export const DNS_TXT_MAX_LIFETIME_SECONDS = 31_536_000n;
export const DNS_TXT_PROOF_LABEL = "_ens-record-verification";
