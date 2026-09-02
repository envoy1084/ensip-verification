import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useSetText } from "@ensforge/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { isAddressEqual } from "viem";
import { useAccount, useSignTypedData } from "wagmi";

import {
  createUrlDnsRecord,
  prepareUrlDnsVerification,
  verifyUrlRecord,
} from "./verify-url-record.functions";

const DISCOVERY_KEY = "verification[text][url]";
const DNS_TXT_DESCRIPTOR = "ensrv1 a=1 m=dns-txt.v1";

type SetupStatus =
  | "idle"
  | "checking"
  | "setting-descriptor"
  | "preparing"
  | "signing"
  | "ready"
  | "removing"
  | "verified";

const statusLabels: Record<SetupStatus, string> = {
  idle: "Verify",
  checking: "Checking…",
  "setting-descriptor": "Setting ENS record…",
  preparing: "Preparing proof…",
  signing: "Waiting for signature…",
  ready: "Check verification",
  removing: "Removing…",
  verified: "Verified",
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to prepare verification.";

interface UseUrlDnsVerificationInput {
  readonly name: string;
  readonly value: string | null;
  readonly verificationDescriptor: string | null;
}

export function useUrlDnsVerification({
  name,
  value,
  verificationDescriptor,
}: UseUrlDnsVerificationInput) {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const setText = useSetText();
  const { signTypedDataAsync } = useSignTypedData();
  const verifyOnServer = useServerFn(verifyUrlRecord);
  const prepareOnServer = useServerFn(prepareUrlDnsVerification);
  const createRecordOnServer = useServerFn(createUrlDnsRecord);
  const verificationStatus = useQuery({
    enabled: value !== null && value.length > 0,
    queryFn: () => verifyOnServer({ data: { name } }),
    queryKey: ["url-record-verification", name, value],
    retry: false,
    staleTime: 30_000,
  });
  const [status, setStatus] = useState<SetupStatus>("idle");
  const [configurationOverride, setConfigurationOverride] = useState<
    boolean | null
  >(null);
  const [dnsRecord, setDnsRecord] = useState<{
    readonly name: string;
    readonly value: string;
    readonly zoneFileValue: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    if (!account.isConnected || account.address === undefined) {
      openConnectModal?.();
      return;
    }
    if (account.chainId !== 1) {
      setError("Switch your wallet to Ethereum mainnet first.");
      return;
    }

    setError(null);
    setStatus("checking");

    try {
      const verification = await verifyOnServer({ data: { name } });
      if (
        verification.success &&
        verification.data.verification.verified &&
        verification.data.value === value
      ) {
        setStatus("verified");
        return;
      }
      if (dnsRecord !== null) {
        throw new Error(
          verification.success
            ? "The DNS proof is not visible yet. Check it again after DNS has propagated."
            : verification.error.reason,
        );
      }

      setStatus("preparing");
      let preparation = await prepareOnServer({ data: { name } });
      if (!preparation.success) {
        throw new Error(preparation.error.reason);
      }
      if (!isAddressEqual(account.address, preparation.data.authority)) {
        throw new Error(
          `Connect the ENS verification authority (${preparation.data.authority}) to sign this proof.`,
        );
      }

      if (!preparation.data.descriptorConfigured) {
        setStatus("setting-descriptor");
        await setText.mutateAsync({
          name,
          key: DISCOVERY_KEY,
          value: DNS_TXT_DESCRIPTOR,
        });

        setStatus("preparing");
        preparation = await prepareOnServer({ data: { name } });
        if (!preparation.success) {
          throw new Error(preparation.error.reason);
        }
        setConfigurationOverride(true);
      }

      setStatus("signing");
      const authoritySignature = await signTypedDataAsync({
        ...preparation.data.typedData,
        message: { ...preparation.data.typedData.message },
      });
      const record = await createRecordOnServer({
        data: { preparation: preparation.data, authoritySignature },
      });
      if (!record.success) {
        throw new Error(record.error.reason);
      }

      setDnsRecord(record.data);
      setStatus("ready");
    } catch (cause) {
      setError(getErrorMessage(cause));
      setStatus(dnsRecord === null ? "idle" : "ready");
    }
  };

  const remove = async () => {
    if (!account.isConnected || account.address === undefined) {
      openConnectModal?.();
      return;
    }
    if (account.chainId !== 1) {
      setError("Switch your wallet to Ethereum mainnet first.");
      return;
    }

    setError(null);
    setStatus("removing");

    try {
      await setText.mutateAsync({
        name,
        key: DISCOVERY_KEY,
        value: "",
      });
      setConfigurationOverride(false);
      setDnsRecord(null);
      setStatus("idle");
    } catch (cause) {
      setError(getErrorMessage(cause));
      setStatus("idle");
    }
  };

  const descriptorConfigured =
    configurationOverride ?? verificationDescriptor === DNS_TXT_DESCRIPTOR;
  const isInitiallyChecking =
    value !== null && value.length > 0 && verificationStatus.isPending;
  const isVerifiedFromQuery =
    verificationStatus.data?.success === true &&
    verificationStatus.data.data.verification.verified &&
    verificationStatus.data.data.value === value;
  const isPending =
    isInitiallyChecking ||
    status === "checking" ||
    status === "setting-descriptor" ||
    status === "preparing" ||
    status === "signing" ||
    status === "removing";

  return {
    actionLabel: isInitiallyChecking ? "Checking…" : statusLabels[status],
    descriptorConfigured,
    dnsRecord,
    error,
    isPending,
    isRemoving: status === "removing",
    isVerified:
      configurationOverride !== false &&
      (status === "verified" || isVerifiedFromQuery),
    remove,
    verify,
  } as const;
}
