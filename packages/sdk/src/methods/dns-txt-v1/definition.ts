export const DNS_TXT_METHOD_ID = "dns-txt.v1" as const;
export const DNS_TXT_MAX_LIFETIME_SECONDS = 31_536_000n;
export const DNS_TXT_PROOF_LABEL = "_ens-record-verification";

export const dnsTxtDescriptorPolicy = Object.freeze({
  proofUri: "forbidden" as const,
});
