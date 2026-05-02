"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { cn } from "@/lib/utils";
import { Fingerprint, AlertTriangle, Shield } from "lucide-react";

/**
 * Gating de acceso: exige wallet conectada en 0G testnet.
 * Diseño "Mechanical Vault Dial" de Stitch — Black & Amber Edition.
 */
export function WalletGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // ── Not connected → Vault Gate ──
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: "radial-gradient(circle at center, #141414 0%, #0A0A0A 100%)",
        }}
      >
        {/* Background Cryptographic Grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#f59e0b 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Corner Diagnostic Readouts */}
        <div className="absolute bottom-12 left-12">
          <div className="text-[10px] text-[#555] font-mono leading-relaxed">
            <p>LOAD_SEC_MODULE... [OK]</p>
            <p>SYNC_VAULT_DOOR... [READY]</p>
          </div>
        </div>
        <div className="absolute bottom-12 right-12">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#555] hover:text-[#f59e0b] transition-colors font-[family-name:var(--font-newsreader)]">
            PRIVACY POLICY &amp; TERMS
          </span>
        </div>

        {/* Outer Ring */}
        <div className="relative flex items-center justify-center w-[520px] h-[520px] max-w-[95vw]">
          {/* Mechanical Ring */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              border: "8px solid #1e1e1e",
              borderRadius: "50%",
              boxShadow:
                "inset 0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(245,158,11,0.1)",
            }}
          >
            {/* Locking Bolts */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-3 w-6 h-6 bg-[#1e1e1e] shadow-lg" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -mb-3 w-6 h-6 bg-[#1e1e1e] shadow-lg" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 w-6 h-6 bg-[#1e1e1e] shadow-lg" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 w-6 h-6 bg-[#1e1e1e] shadow-lg" />
          </div>

          {/* Center Dial Card */}
          <div className="relative z-10 text-center bg-[#0a0a0a]/80 rounded-full border-2 border-[#f59e0b]/30 backdrop-blur-sm flex flex-col items-center justify-center w-[380px] h-[380px] max-w-[85vw] px-12 py-12">
            <Fingerprint
              className="w-12 h-12 text-[#f59e0b] mb-6"
              strokeWidth={1.5}
            />
            <h1 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-3xl text-[#f59e0b] mb-3 leading-tight text-center">
              Connect your wallet to enter
            </h1>
            <p className="text-sm text-[#888] mb-8 max-w-xs leading-relaxed italic font-[family-name:var(--font-newsreader)]">
              Authenticate your identity to access your private creative vault.
            </p>
            <div className="flex justify-center scale-90 sm:scale-100">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Wrong Network ──
  if (chainId !== 16602) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: "radial-gradient(circle at center, #141414 0%, #0A0A0A 100%)",
        }}
      >
        {/* Background Cryptographic Grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#f59e0b 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex flex-col items-center gap-8 max-w-[95vw]">
          <AlertTriangle className="w-16 h-16 text-[#ffb4ab]" strokeWidth={1.5} />
          <div className="text-center space-y-4">
            <h2 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl text-[#f0e0d1]">
              Wrong Network
            </h2>
            <p className="text-sm text-[#888] max-w-md leading-relaxed">
              Switch to <strong className="text-[#f59e0b]">0G Galileo Testnet</strong> to use the MVP.
            </p>
            <p className="text-xs text-[#555]">
              Expected Chain ID: <span className="font-mono text-[#f59e0b]">16602</span>
            </p>
          </div>
          <div className="flex justify-center scale-90 sm:scale-100">
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
