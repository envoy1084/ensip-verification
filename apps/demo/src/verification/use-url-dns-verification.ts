import { useState } from "react";

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
  | "verified";

const statusLabels: Record<SetupStatus, string> = {
  idle: "Verify",
  checking: "Checking…",
  "setting-descriptor": "Setting ENS record…",
  preparing: "Preparing proof…",
  signing: "Waiting for signature…",
  ready: "Check verification",
  verified: "Verified",
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to prepare verification.";

export function useUrlDnsVerification(name: string) {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const setText = useSetText();
  const { signTypedDataAsync } = useSignTypedData();
  const verifyOnServer = useServerFn(verifyUrlRecord);
  const prepareOnServer = useServerFn(prepareUrlDnsVerification);
  const createRecordOnServer = useServerFn(createUrlDnsRecord);
  const [status, setStatus] = useState<SetupStatus>("idle");
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
      if (verification.success && verification.data.verification.verified) {
        setStatus("verified");
        return;
      }
      if (dnsRecord !== null) {
        throw new Error(
          verification.success
            ? "The DNS proof is not visible yet. Check it again after DNS has propagated."
            : verification.error.message,
        );
      }

      setStatus("preparing");
      let preparation = await prepareOnServer({ data: { name } });
      if (!preparation.success) {
        throw new Error(preparation.error.message);
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
          throw new Error(preparation.error.message);
        }
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
        throw new Error(record.error.message);
      }

      setDnsRecord(record.data);
      setStatus("ready");
    } catch (cause) {
      setError(getErrorMessage(cause));
      setStatus(dnsRecord === null ? "idle" : "ready");
    }
  };

  return {
    actionLabel: statusLabels[status],
    dnsRecord,
    error,
    isPending:
      status === "checking" ||
      status === "setting-descriptor" ||
      status === "preparing" ||
      status === "signing",
    isVerified: status === "verified",
    verify,
  } as const;
}
