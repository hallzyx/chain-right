"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { cn } from "@/lib/utils";
import { Lock, AlertTriangle } from "lucide-react";

/**
 * Gating de acceso: exige wallet conectada en 0G testnet.
 * Black & Amber Edition.
 */
export function WalletGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="w-full max-w-xl bg-[#141414] border border-white/5 p-12 text-center">
          <Lock className="w-12 h-12 text-[#f59e0b] mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="mb-2 text-2xl font-[family-name:var(--font-newsreader)] text-[#f5f5f5]">
            Connect your wallet to enter
          </h2>
          <p className="mb-8 text-sm text-[#888888] leading-relaxed">
            ChainRight uses web3 authentication. Connect your wallet to create,
            register, and verify artworks on 0G testnet.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (chainId !== 16602) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="w-full max-w-xl bg-[#141414] border border-[#f59e0b]/20 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-[#f59e0b] mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="mb-2 text-2xl font-[family-name:var(--font-newsreader)] text-[#f5f5f5]">
            Wrong Network
          </h2>
          <p className="mb-4 text-sm text-[#888888]">
            Switch to <strong className="text-[#f0e0d1]">0G Galileo Testnet</strong> to use the MVP.
          </p>
          <p className="mb-6 text-xs text-[#555555]">Expected Chain ID: 16602</p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Botón compacto de wallet para navbar.
 */
export function WalletBadge() {
  return (
    <div className={cn("scale-95 origin-right")}>
      <ConnectButton chainStatus="icon" showBalance={false} />
    </div>
  );
}
