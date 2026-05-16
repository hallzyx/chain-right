"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Cpu, ChevronDown, PlusCircle, RefreshCw, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Panel de estado del sistema 0G Compute Network.
 * Acordeón colapsado por defecto. Muestra solo lo esencial al expandir.
 */
export function ComputeStatus({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<ComputeStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
      <div className="bg-[#141414] border border-white/5 px-4 py-3 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-[#f59e0b] animate-spin" />
        <span className="text-sm text-[#888]">Checking 0G Compute status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#141414] border border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#ffb4ab]" />
          <span className="text-xs text-[#ffb4ab]">Compute status unavailable</span>
        </div>
        <button onClick={fetchStatus} className="p-1 text-[#888] hover:text-[#f59e0b] transition-colors" title="Retry">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (!status) return null;

  const { accountExists, computeBalance, computeTotalBalance, providers, costs } = status;
  const computeTotalNum = parseFloat(computeTotalBalance);
  const needsDeposit = accountExists && computeTotalNum < 0.1;
  const allReady = accountExists && computeTotalNum >= 0.1 && providers.textToImage.available && providers.imageEditing.available;

  // Active model based on context (prefer image-editing if available, fallback to text-to-image)
  const activeModel = providers.imageEditing.available
    ? providers.imageEditing.model
    : providers.textToImage.available
      ? providers.textToImage.model
      : "";

  // Compact mode (used in /my-works)
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2 border text-xs",
        allReady
          ? "bg-[#f59e0b]/5 border-[#f59e0b]/20 text-[#f59e0b]"
          : needsDeposit
            ? "bg-[#93000a]/10 border-[#ffb4ab]/20 text-[#ffb4ab]"
            : "bg-[#141414] border-white/5 text-[#888]"
      )}>
        {allReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        <span>
          {allReady
            ? `0G Compute Ready · ${computeTotalBalance} 0G`
            : needsDeposit
              ? `Low balance: ${computeTotalBalance} 0G`
              : !accountExists
                ? "Compute: Not set up"
                : "Compute: Providers unavailable"}
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

  // Full version: accordion with simplified content
  return (
    <div className="bg-[#141414] border border-white/5 overflow-hidden">
      {/* Accordion Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center border",
            allReady
              ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]"
              : needsDeposit
                ? "bg-[#93000a]/20 border-[#ffb4ab]/40 text-[#ffb4ab]"
                : "bg-[#1a1a1a] border-[#333] text-[#555]"
          )}>
            {allReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : needsDeposit ? <AlertCircle className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-[#f5f5f5]">0G Compute Network</p>
            <p className="text-[11px] text-[#555]">
              {accountExists
                ? `${computeTotalBalance} 0G · ${activeModel || "No model"}`
                : "Account not created"}
            </p>
          </div>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-[#555] transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>

      {/* Accordion Content — only when expanded */}
      {open && (
        <div className="border-t border-white/5">
          {/* Status Pills */}
          <div className="px-4 py-3 flex flex-wrap gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border",
              providers.textToImage.available
                ? "bg-[#f59e0b]/5 border-[#f59e0b]/20 text-[#f59e0b]"
                : "bg-[#1a1a1a] border-white/5 text-[#555]"
            )}>
              {providers.textToImage.available ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              Generate
            </span>
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border",
              providers.imageEditing.available
                ? "bg-[#f59e0b]/5 border-[#f59e0b]/20 text-[#f59e0b]"
                : "bg-[#1a1a1a] border-white/5 text-[#555]"
            )}>
              {providers.imageEditing.available ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              Edit
            </span>
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border",
              providers.chatbot.available
                ? "bg-[#f59e0b]/5 border-[#f59e0b]/20 text-[#f59e0b]"
                : "bg-[#1a1a1a] border-white/5 text-[#555]"
            )}>
              {providers.chatbot.available ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              Agent
            </span>
          </div>

          {/* Fund Management — only if account exists */}
          {accountExists && (
            <div className={cn(
              "px-4 py-3 border-t border-white/5",
              needsDeposit ? "bg-[#93000a]/5" : ""
            )}>
              {needsDeposit && (
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 text-[#ffb4ab]" />
                  <span className="text-xs text-[#ffb4ab]">Low balance — deposit to use providers</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDepositAmount(0.1)}
                  disabled={depositing}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-medium border px-3 py-1.5 rounded transition-all",
                    depositing
                      ? "border-[#555] text-[#555] cursor-not-allowed"
                      : "border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
                  )}
                >
                  {depositing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3 h-3" />
                  )}
                  0.1 0G
                </button>
                <button
                  onClick={() => handleDepositAmount(1.0)}
                  disabled={depositing}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-medium border px-3 py-1.5 rounded transition-all",
                    depositing
                      ? "border-[#555] text-[#555] cursor-not-allowed"
                      : needsDeposit
                        ? "border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#ffb4ab]/10"
                        : "border-white/10 text-[#888] hover:bg-white/5"
                  )}
                >
                  {depositing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3 h-3" />
                  )}
                  1.0 0G
                </button>
              </div>
            </div>
          )}

          {/* Cost info — minimal */}
          {accountExists && (
            <div className="px-4 py-3 border-t border-white/5 bg-[#0a0a0a]/30">
              <div className="flex items-center justify-between text-[11px] text-[#555]">
                <span>Est. cost per image</span>
                <span className="font-mono text-[#888]">{costs.estimatedPerInference}</span>
              </div>
            </div>
          )}

          {/* Refresh */}
          <div className="px-4 py-2 border-t border-white/5 flex justify-end">
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-[#f59e0b] transition-colors"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      )}
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

