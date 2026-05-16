"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Cpu, Wallet, Server, ShieldCheck, ArrowRight, RefreshCw, Coins, ArrowDownRight, Info, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Panel de estado del sistema 0G Compute Network.
 * Muestra: cuenta, balances, providers, costos y flujo de fondos.
 * Diseñado para visibilidad total del flujo 0G (hackathon demo).
 */
export function ComputeStatus({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<ComputeStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compute/status");
      const json = await res.json();
      if (json.success) {
        setStatus(json.status);
      } else {
        setError(json.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDepositAmount(amount: number) {
    setDepositing(true);
    setError(null);
    try {
      const res = await fetch("/api/compute/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deposit", amount }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStatus();
      } else {
        setError(json.message || `Failed to deposit ${amount} 0G`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDepositing(false);
    }
  }

  useEffect(() => {
    void fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#141414] border border-white/5 p-6 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-[#f59e0b] animate-spin" />
        <span className="text-sm text-[#888]">Checking 0G Compute status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#93000a]/10 border border-[#ffb4ab]/20 p-4">
        <p className="text-[#ffb4ab] text-sm">Error loading 0G Compute status: {error}</p>
      </div>
    );
  }

  if (!status) return null;

  const { accountExists, walletBalance, computeBalance, computeTotalBalance, providers, costs } = status;
  const computeTotalNum = parseFloat(computeTotalBalance);
  const needsDeposit = accountExists && computeTotalNum < 1.0;

  // Steps for the flow visualization
  const steps = [
    {
      label: "Wallet On-Chain",
      detail: `${walletBalance} 0G`,
      done: true,
      icon: Wallet,
    },
    {
      label: "Compute Account",
      detail: accountExists ? `Total: ${computeTotalBalance} 0G · Available: ${computeBalance} 0G` : "Not created yet",
      done: accountExists,
      icon: Cpu,
      warning: needsDeposit,
    },
    {
      label: "Text-to-Image Provider",
      detail: providers.textToImage.available ? providers.textToImage.model : "No providers",
      done: providers.textToImage.available && accountExists,
      icon: Server,
      tee: providers.textToImage.teeVerified,
    },
    {
      label: "Image Editing Provider",
      detail: providers.imageEditing.available ? providers.imageEditing.model : "No providers",
      done: providers.imageEditing.available && accountExists,
      icon: Server,
      tee: providers.imageEditing.teeVerified,
    },
    {
      label: "Chatbot (Agent)",
      detail: providers.chatbot.available ? providers.chatbot.model : "No providers",
      done: providers.chatbot.available && accountExists,
      icon: Server,
      tee: providers.chatbot.teeVerified,
    },
  ];

  if (compact) {
    const allReady = accountExists && computeTotalNum >= 1.0 && providers.textToImage.available && providers.imageEditing.available;
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2 border text-xs",
        allReady
          ? "bg-[#f59e0b]/5 border-[#f59e0b]/20 text-[#f59e0b]"
          : needsDeposit
            ? "bg-[#93000a]/10 border-[#ffb4ab]/20 text-[#ffb4ab]"
            : "bg-[#141414] border-white/5 text-[#888]"
      )}>
        {allReady ? <CheckCircle2 className="w-3 h-3" /> : needsDeposit ? <AlertCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        <span>
          {allReady
            ? `0G Compute Ready · ${computeTotalBalance} 0G · ${providers.textToImage.model} + ${providers.imageEditing.model}`
            : needsDeposit
              ? `Low compute balance: ${computeTotalBalance} 0G (need ≥1.0 0G for providers)`
              : !accountExists
                ? "0G Compute: Account not created"
                : "0G Compute: Some providers unavailable"}
        </span>
        <button
          onClick={fetchStatus}
          className="ml-auto p-1 hover:text-[#f59e0b] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Full version: detailed flow panel with cost breakdown
  return (
    <div className="bg-[#141414] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-[#f59e0b]" strokeWidth={1.5} />
          <h3 className="font-[family-name:var(--font-newsreader)] text-lg text-[#f5f5f5]">
            0G Compute Network
          </h3>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 text-[#888] hover:text-[#f59e0b] transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Flow Steps */}
      <div className="p-6 space-y-0">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.label} className="flex items-start gap-4">
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2",
                  step.warning
                    ? "bg-[#93000a]/20 border-[#ffb4ab] text-[#ffb4ab]"
                    : step.done
                      ? "bg-[#f59e0b]/10 border-[#f59e0b] text-[#f59e0b]"
                      : "bg-[#1a1a1a] border-[#333] text-[#555]"
                )}>
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.warning ? <AlertCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {!isLast && (
                  <div className={cn(
                    "w-[1px] h-8",
                    step.done ? "bg-[#f59e0b]/30" : "bg-[#333]"
                  )} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      step.warning ? "text-[#ffb4ab]" : step.done ? "text-[#f5f5f5]" : "text-[#888]"
                    )}>
                      {step.label}
                    </p>
                    <p className="text-xs text-[#555] mt-0.5 font-mono">{step.detail}</p>
                    {step.warning && (
                      <p className="text-[10px] text-[#ffb4ab] mt-1">
                        Need ≥1.0 0G to use providers. Deposit more funds below.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {"tee" in step && step.tee && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2 py-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        TEE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fund Management */}
      {accountExists && (
        <div className={cn(
          "border-t px-6 py-5",
          needsDeposit
            ? "border-[#ffb4ab]/20 bg-[#93000a]/5"
            : "border-white/5 bg-[#0a0a0a]/30"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {needsDeposit ? (
                <>
                  <AlertCircle className="w-5 h-5 text-[#ffb4ab]" />
                  <div>
                    <p className="text-sm font-medium text-[#ffb4ab]">Low Compute Balance</p>
                    <p className="text-xs text-[#ffb4ab]/70 mt-0.5">
                      Total: {computeTotalBalance} 0G. Providers require ≥1.0 0G minimum.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5 text-[#f59e0b]" />
                  <div>
                    <p className="text-sm font-medium text-[#f5f5f5]">Manage Compute Funds</p>
                    <p className="text-xs text-[#555] mt-0.5">
                      Total: {computeTotalBalance} 0G
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDepositAmount(0.1)}
                disabled={depositing}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold uppercase tracking-widest border px-4 py-2 transition-all",
                  depositing
                    ? "border-[#555] text-[#555] cursor-not-allowed"
                    : "border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
                )}
              >
                {depositing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Depositing...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3 h-3" />
                    Deposit 0.1 0G
                  </>
                )}
              </button>
              <button
                onClick={() => handleDepositAmount(1.0)}
                disabled={depositing}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold uppercase tracking-widest border px-4 py-2 transition-all",
                  depositing
                    ? "border-[#555] text-[#555] cursor-not-allowed"
                    : needsDeposit
                      ? "border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#ffb4ab]/10"
                      : "border-white/10 text-[#888] hover:bg-white/5"
                )}
              >
                {depositing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Depositing...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3 h-3" />
                    Deposit 1.0 0G
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      {accountExists && (
        <div className="border-t border-white/5 px-6 py-5 bg-[#0a0a0a]/30">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
              Cost Breakdown
            </h4>
          </div>

          <div className="space-y-3">
            {/* Flow of funds */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded border border-white/5">
                <Wallet className="w-3 h-3 text-[#888]" />
                <span className="text-[#d8c3ad]">Wallet: {walletBalance} 0G</span>
              </div>
              <ArrowDownRight className="w-4 h-4 text-[#f59e0b]" />
              <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded border border-[#f59e0b]/20">
                <Cpu className="w-3 h-3 text-[#f59e0b]" />
                <span className="text-[#f59e0b]">Compute: {computeBalance} 0G</span>
              </div>
              <ArrowDownRight className="w-4 h-4 text-[#f59e0b]" />
              <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded border border-white/5">
                <Server className="w-3 h-3 text-[#8fd5ff]" />
                <span className="text-[#8fd5ff]">Provider: {costs.providerTransfer} 0G</span>
              </div>
            </div>

            {/* Cost details */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#1a1a1a] border border-white/5 px-4 py-3 rounded">
                <p className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Account Setup</p>
                <p className="text-sm text-[#f5f5f5] font-mono">{costs.accountMinDeposit} 0G</p>
                <p className="text-[10px] text-[#555] mt-1">One-time deposit to create compute account</p>
              </div>
              <div className="bg-[#1a1a1a] border border-white/5 px-4 py-3 rounded">
                <p className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Per Provider Transfer</p>
                <p className="text-sm text-[#f5f5f5] font-mono">{costs.providerTransfer} 0G</p>
                <p className="text-[10px] text-[#555] mt-1">Transferred only when sub-account balance is low</p>
              </div>
              <div className="bg-[#1a1a1a] border border-white/5 px-4 py-3 rounded col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Est. Cost per Inference</p>
                <p className="text-sm text-[#f5f5f5] font-mono">{costs.estimatedPerInference}</p>
                <p className="text-[10px] text-[#555] mt-1">
                  Each image generation or edit consumes from the provider&apos;s sub-account balance.
                  Funds are auto-transferred ({costs.providerTransfer} 0G) only when the sub-account drops below 0.5 0G.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Architecture Summary */}
      <div className="border-t border-white/5 px-6 py-4 bg-[#0a0a0a]/50">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-3 h-3 text-[#555]" />
          <span className="text-[10px] text-[#555] uppercase tracking-widest">How it works</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[#555] uppercase tracking-widest">
          <span className="text-[#888]">Wallet</span>
          <ArrowRight className="w-3 h-3 text-[#f59e0b]" />
          <span className="text-[#888]">Compute Ledger</span>
          <ArrowRight className="w-3 h-3 text-[#f59e0b]" />
          <span className="text-[#888]">Provider Sub-Account</span>
          <ArrowRight className="w-3 h-3 text-[#f59e0b]" />
          <span className="text-[#8fd5ff]">TEE Inference</span>
        </div>
      </div>
    </div>
  );
}

interface ComputeStatusData {
  accountExists: boolean;
  walletBalance: string;
  computeBalance: string;
  computeTotalBalance: string;
  providers: {
    textToImage: { available: boolean; model: string; address: string; teeVerified: boolean };
    imageEditing: { available: boolean; model: string; address: string; teeVerified: boolean };
    chatbot: { available: boolean; model: string; address: string; teeVerified: boolean };
  };
  costs: {
    accountMinDeposit: string;
    providerTransfer: string;
    estimatedPerInference: string;
  };
}
