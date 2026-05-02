"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { cn } from "@/lib/utils";

/**
 * Gating de acceso: exige wallet conectada en 0G testnet.
 */
export function WalletGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-indigo-500/30 bg-[#111A38]/70 p-8 text-center shadow-lg shadow-indigo-900/20">
          <p className="mb-3 text-4xl">🔐</p>
          <h2 className="mb-2 text-2xl font-bold text-slate-100">Connect your wallet to enter</h2>
          <p className="mb-6 text-sm text-slate-400">
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
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#111A38]/70 p-8 text-center shadow-lg shadow-amber-900/20">
          <p className="mb-3 text-4xl">⚠️</p>
          <h2 className="mb-2 text-2xl font-bold text-slate-100">Wrong Network</h2>
          <p className="mb-4 text-sm text-slate-300">
            Switch to <strong>0G Galileo Testnet</strong> to use the MVP.
          </p>
          <p className="mb-6 text-xs text-slate-500">Expected Chain ID: 16602</p>
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
