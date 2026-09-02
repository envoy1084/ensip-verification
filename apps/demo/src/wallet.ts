import { getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { mainnet } from "wagmi/chains";

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";
const publicRpcUrl = import.meta.env.VITE_PUBLIC_RPC_URL;

export const wagmiConfig = getDefaultConfig({
  appName: "ENS Record Verification",
  projectId: walletConnectProjectId,
  chains: [mainnet],
  transports: { [mainnet.id]: http(publicRpcUrl || undefined) },
  ssr: true,
});

const rainbowKitLightTheme = lightTheme({
  accentColor: "#0080bc",
  accentColorForeground: "#f6f6f6",
  borderRadius: "small",
  fontStack: "system",
  overlayBlur: "small",
});

export const rainbowKitTheme = {
  ...rainbowKitLightTheme,
  radii: {
    ...rainbowKitLightTheme.radii,
    actionButton: "4px",
    connectButton: "4px",
    menuButton: "4px",
    modal: "8px",
    modalMobile: "8px",
  },
};
