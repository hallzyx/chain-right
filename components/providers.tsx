"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { walletConfig, zeroGTestnet } from "@/lib/wallet-config";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

/**
 * Proveedores globales de wallet y query state.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          initialChain={zeroGTestnet}
          theme={darkTheme({
            accentColor: "#F59E0B",
            accentColorForeground: "#0A0A0A",
            borderRadius: "none",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
