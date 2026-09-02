import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

export const wagmiConfig = getDefaultConfig({
  appName: "ENS Record Verification",
  projectId: walletConnectProjectId,
  chains: [mainnet],
  ssr: false,
});
