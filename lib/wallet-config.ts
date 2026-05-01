import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { http } from "wagmi";

/**
 * Configuración de chain 0G Testnet (Galileo) para Wagmi/RainbowKit.
 */
export const zeroGTestnet = defineChain({
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: {
    name: "0G",
    symbol: "0G",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai"],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G ChainScan Galileo",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
});

/**
 * Configuración principal de Wagmi para RainbowKit.
 */
export const walletConfig = getDefaultConfig({
  appName: "ChainRight",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "chainright-mvp",
  chains: [zeroGTestnet],
  transports: {
    [zeroGTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai"),
  },
  ssr: false,
});
