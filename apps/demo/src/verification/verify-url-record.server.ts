import { RecordVerification } from "@thenamespace/record-verification";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const rpcUrl = import.meta.env.VITE_PUBLIC_RPC_URL;

const recordVerification = rpcUrl
  ? new RecordVerification({
      publicClient: createPublicClient({
        chain: mainnet,
        transport: http(rpcUrl),
      }),
    })
  : null;

export function verifyUrlRecord(name: string) {
  if (recordVerification === null) {
    throw new Error("VITE_PUBLIC_RPC_URL is not configured.");
  }

  return recordVerification.getRecord({
    name,
    type: "text",
    key: "url",
    verify: true,
  });
}
