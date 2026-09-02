import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EnsforgeProvider } from "@ensforge/react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";

import { rainbowKitTheme, wagmiConfig } from "./wallet";

const queryClient = new QueryClient();
const ensforgeConfig = { network: "mainnet" as const, wagmiConfig };

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <EnsforgeProvider config={ensforgeConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={rainbowKitTheme}>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </EnsforgeProvider>
    </WagmiProvider>
  );
}
