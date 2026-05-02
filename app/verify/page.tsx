"use client";

import { useState, useRef } from "react";
import { actionVerifyImage, actionComputeMerkleRoot, actionManualVerify, actionGetVerificationDetails } from "@/app/actions";
import { cn, shortenAddress } from "@/lib/utils";
import { bufferToDataUrl, modifyOnePixel } from "@/lib/utils";
import { downloadCertificatePdf } from "@/lib/certificate-pdf";
import { WowMoment } from "@/components/wow-moment";
import type { VerificationResult } from "@/lib/types";

type VerifyPhase = "idle" | "reading_file" | "hashing" | "connecting_rpc" | "querying_contract" | "done";

interface LiveTrace {
  fileSize?: string;
  merkleRoot?: string;
  rpcUrl?: string;
  contractAddress?: string;
  chainId?: number;
  blockNumber?: number;
  querySelector?: string;
}

export default function VerifyPage() {
  const [step, setStep] = useState<"upload" | "verifying" | "result" | "wow">("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [originalBase64, setOriginalBase64] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<Uint8Array | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [originalRoot, setOriginalRoot] = useState<string | null>(null);
  const [modifiedRoot, setModifiedRoot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [verifyPhase, setVerifyPhase] = useState<VerifyPhase>("idle");
  const [trace, setTrace] = useState<LiveTrace>({});
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [manualRoot, setManualRoot] = useState("");
  const [manualResult, setManualResult] = useState<VerificationResult | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setVerificationResult(null); setOriginalRoot(null); setModifiedRoot(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadedImage(dataUrl); setOriginalBase64(dataUrl);
      setOriginalData(new Uint8Array(await file.arrayBuffer()));
    };
    reader.readAsDataURL(file);
  }

  // ── Verificar ──
  async function handleVerify() {
    if (!originalBase64) return;
    setError(null); setTrace({}); setStep("verifying");

    setVerifyPhase("reading_file");
    const sz = originalData?.length ?? 0;
    setTrace(t => ({ ...t, fileSize: sz > 1024 ? `${(sz / 1024).toFixed(1)} KB` : `${sz} bytes` }));
    await sleep(350);

    setVerifyPhase("hashing");
    const rr = await actionComputeMerkleRoot(originalBase64);
    if (rr.success && rr.merkleRoot) { setOriginalRoot(rr.merkleRoot); setTrace(t => ({ ...t, merkleRoot: rr.merkleRoot })); }
    await sleep(300);

    setVerifyPhase("connecting_rpc");
    try {
      const d = await actionGetVerificationDetails();
      setTrace(t => ({ ...t, rpcUrl: d.rpcUrl, contractAddress: d.contractAddress, chainId: d.chainId, blockNumber: d.blockNumber }));
    } catch { /* graceful */ }
    await sleep(350);

    setVerifyPhase("querying_contract");
    setTrace(t => ({ ...t, querySelector: `getProvenance(${t.merkleRoot?.slice(0, 10)}...)` }));
    await sleep(300);
    const result = await actionVerifyImage(originalBase64);
    setVerificationResult(result);
    setVerifyPhase("done");
    await sleep(250); setStep("result");
  }

  // ── Manual ──
  async function handleManualVerify() {
    if (!manualRoot.trim()) return;
    setManualLoading(true); setManualResult(null);
    try { setManualResult(await actionManualVerify(manualRoot.trim())); }
    catch (e: any) { setManualResult({ verified: false, merkleRoot: manualRoot.trim(), message: `Error: ${e.message}` }); }
    finally { setManualLoading(false); }
  }

  // ── Wow ──
  function handleWowMoment() {
    if (!originalData) return;
    const m = modifyOnePixel(originalData);
    actionComputeMerkleRoot(bufferToDataUrl(m, "image/png")).then(r => { if (r.merkleRoot) setModifiedRoot(r.merkleRoot); });
    setStep("wow");
  }

  // ── PDF ──
  async function handleDownloadPdf() {
    if (!verificationResult?.provenance) return;
    setPdfLoading(true);
    try {
      const p = verificationResult.provenance;
      await downloadCertificatePdf({
        wallet: p.creator, prompt: p.prompt, model: p.model, merkleRoot: p.merkleRoot,
        sequenceNumber: p.sequenceNumber,
        submissionUrl: p.sequenceNumber ? `https://storagescan-galileo.0g.ai/submission/${p.sequenceNumber}` : undefined,
        imageUrl: uploadedImage ?? undefined,
        timestamp: new Date(Number(p.timestamp) * 1000).toISOString(),
      });
    } finally { setPdfLoading(false); }
  }

  function handleReset() {
    setStep("upload"); setUploadedImage(null); setOriginalBase64(null); setOriginalData(null);
    setVerificationResult(null); setOriginalRoot(null); setModifiedRoot(null);
    setError(null); setVerifyPhase("idle"); setTrace({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function statusFor(p: VerifyPhase): "pending" | "active" | "done" {
    const o: VerifyPhase[] = ["idle","reading_file","hashing","connecting_rpc","querying_contract","done"];
    const ci = o.indexOf(verifyPhase), pi = o.indexOf(p);
    return pi < ci ? "done" : pi === ci ? "active" : "pending";
  }

  function progressPercent(): number {
    const phases: VerifyPhase[] = ["reading_file","hashing","connecting_rpc","querying_contract","done"];
    const idx = phases.indexOf(verifyPhase);
    if (idx < 0) return 0;
    if (verifyPhase === "done") return 100;
    return Math.round(((idx + 0.5) / phases.length) * 100);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Verify Authenticity</h1>
        <p className="text-slate-400 max-w-md mx-auto">Upload an image. We compute its cryptographic fingerprint and query the 0G blockchain in real time.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8"><p className="text-red-400 text-sm">{error}</p></div>}

      {/* ═══════════ UPLOAD ═══════════ */}
      {step === "upload" && !uploadedImage && (
        <div onClick={() => fileInputRef.current?.click()} className={cn("border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300","border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-900/50","group")}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <div className="text-6xl mb-5 group-hover:scale-110 transition-transform">🖼️</div>
          <p className="text-lg font-medium text-slate-300 mb-2 group-hover:text-cyan-300">Click to upload an image</p>
          <p className="text-sm text-slate-500">PNG, JPG, WebP — any format</p>
        </div>
      )}

      {uploadedImage && step === "upload" && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden"><img src={uploadedImage} alt="" className="w-full h-auto max-h-80 object-contain" /></div>
          <div className="flex gap-4">
            <button onClick={handleReset} className="flex-1 py-4 rounded-xl font-semibold border-2 border-slate-700 text-slate-300 hover:border-slate-600">← Change</button>
            <button onClick={handleVerify} className="flex-1 py-4 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25">🔍 Verify Authenticity</button>
          </div>
        </div>
      )}

      {/* ═══════════ VERIFICANDO ═══════════ */}
      {step === "verifying" && (
        <div>
          {/* Barra de progreso */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-400">Analysis progress</span>
              <span className="text-xs font-mono text-cyan-400">{progressPercent()}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent()}%` }} />
            </div>
          </div>
          {uploadedImage && <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden max-h-32 mb-4"><img src={uploadedImage} alt="" className="w-full h-32 object-cover opacity-30" /></div>}
          <div className="space-y-4"><AnalysisSteps trace={trace} verificationResult={verificationResult} statusFor={statusFor} /></div>
        </div>
      )}

      {/* ═══════════ RESULTADO + WOW ═══════════ */}
      {(step === "result" || step === "wow") && verificationResult && (
        <div className="space-y-6">
          {/* Acordeón del proceso */}
          <button onClick={() => setShowAnalysis(!showAnalysis)} className={cn("w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors", showAnalysis ? "border-cyan-500/30 bg-cyan-500/5" : "border-slate-700/50 bg-slate-900/30 hover:border-slate-600/50")}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">{showAnalysis ? "🔽" : "▶"} Show analysis process</span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">5/5 completed</span>
            </div>
            <span className="text-xs text-slate-500">{showAnalysis ? "Hide ▲" : "Expand ▼"}</span>
          </button>

          {showAnalysis && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="mb-1">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500">Analysis complete</span><span className="text-xs font-mono text-green-400">100%</span></div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full w-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" /></div>
              </div>
              <div className="space-y-4"><AnalysisSteps trace={trace} verificationResult={verificationResult} statusFor={() => "done" as const} /></div>
            </div>
          )}

          {/* Resultado principal */}
          <div className={cn("rounded-2xl p-8 text-center border", verificationResult.verified ? "bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/10" : "bg-red-500/5 border-red-500/20")}>
            <div className="text-6xl mb-4">{verificationResult.verified ? "✅" : "❌"}</div>
            <h2 className={cn("text-2xl font-bold mb-2", verificationResult.verified ? "text-green-400" : "text-red-400")}>{verificationResult.verified ? "Authenticity Confirmed" : "No Record Found"}</h2>
            <p className="text-slate-400 text-sm">{verificationResult.message}</p>
          </div>

          {/* Merkle Root */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-3 text-slate-200">🔐 Cryptographic Fingerprint (Merkle Root)</h3>
            <p className="text-xs text-slate-500 mb-3">Unique hash. If you change A SINGLE PIXEL, it changes completely.</p>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4"><code className="text-sm text-cyan-400 break-all font-mono">{verificationResult.merkleRoot}</code></div>
          </div>

          {/* Provenance */}
          {verificationResult.verified && verificationResult.provenance && (
            <>
              <div className="bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-1 text-slate-100">⛓️ On-Chain Provenance Data</h3>
                <p className="text-xs text-slate-500 mb-5">
                  Immutably recorded on{" "}
                  <code className="text-[11px] text-cyan-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">{shortenAddress(trace.contractAddress || "")}</code> · Bloque #{trace.blockNumber?.toLocaleString() || "?"}
                </p>
                <div className="grid gap-3 text-sm">
                  <DataRow label="Creator" value={shortenAddress(verificationResult.provenance.creator)} isHash />
                  <DataRow label="AI Model" value={verificationResult.provenance.model} />
                  <DataRow label="Prompt" value={verificationResult.provenance.prompt} />
                  <DataRow label="ZK Resource Key" value={verificationResult.provenance.zkResKey || "-"} isHash />
                  <DataRow label="Sequence (txSeq)" value={verificationResult.provenance.sequenceNumber || "-"} mono />
                  <DataRow label="Timestamp" value={new Date(Number(verificationResult.provenance.timestamp) * 1000).toLocaleString("en-US")} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {verificationResult.provenance.sequenceNumber && (
                    <a href={`https://storagescan-galileo.0g.ai/submission/${verificationResult.provenance.sequenceNumber}`} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2 text-xs font-semibold bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30">☁️ View on StorageScan</a>
                  )}
                </div>
              </div>
              <button onClick={handleDownloadPdf} disabled={pdfLoading} className={cn("w-full rounded-xl py-3.5 text-sm font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20", "disabled:opacity-50")}>{pdfLoading ? "⏳ Generating..." : "📄 Download Certificate PDF"}</button>
            </>
          )}

          {/* ═══════════ WOW MOMENT ═══════════ */}
          {step !== "wow" ? (
            <button onClick={handleWowMoment} className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 shadow-lg shadow-purple-500/25">🤯 View Wow Moment: Change ONE PIXEL</button>
          ) : (
            <WowMoment
              originalRoot={originalRoot}
              modifiedRoot={modifiedRoot}
              originalImage={uploadedImage}
            />
          )}

          <button onClick={handleReset} className="w-full py-4 rounded-xl font-semibold border-2 border-slate-700 text-slate-300 hover:border-slate-600">← Verify another image</button>
        </div>
      )}

      {/* ═══════════ VERIFICACIÓN MANUAL ═══════════ */}
      {step === "upload" && (
        <div className="mt-12">
          <button onClick={() => setShowManual(!showManual)} className="w-full text-left flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/30 p-4 hover:border-slate-600/50">
            <div><span className="text-sm font-semibold text-slate-300">📜 Have a PDF certificate?</span><p className="text-xs text-slate-500 mt-0.5">Verify manually by pasting the Merkle Root</p></div>
            <span className={cn("text-slate-500 transition-transform", showManual && "rotate-180")}>▼</span>
          </button>
          {showManual && (
            <div className="mt-3 rounded-xl border border-slate-700/50 bg-slate-900/30 p-5 space-y-4">
              <label className="block text-sm font-medium text-slate-300">Paste your Merkle Root</label>
              <div className="flex gap-3">
                <input type="text" value={manualRoot} onChange={e => setManualRoot(e.target.value)} placeholder="0x..." className={cn("flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 font-mono","focus:outline-none focus:ring-2 focus:ring-cyan-500/50","placeholder:text-slate-600")} />
                <button onClick={handleManualVerify} disabled={!manualRoot.trim() || manualLoading} className={cn("rounded-lg px-5 py-3 text-sm font-semibold shrink-0", manualRoot.trim() ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400" : "bg-slate-800 text-slate-600 cursor-not-allowed")}>{manualLoading ? "⏳" : "Verify"}</button>
              </div>
              {manualResult && (
                <div className={cn("rounded-lg p-4 text-sm", manualResult.verified ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-red-500/5 border border-red-500/20 text-red-300")}>
                  <p className="font-semibold mb-1">{manualResult.verified ? "✅ Confirmed" : "❌ No record"}</p>
                  <p className="text-xs opacity-75">{manualResult.message}</p>
                  {manualResult.provenance && <div className="mt-2 text-xs text-slate-400 space-y-1"><p>Creator: {shortenAddress(manualResult.provenance.creator)}</p><p>Model: {manualResult.provenance.model}</p>{manualResult.provenance.sequenceNumber && <p>Sequence: {manualResult.provenance.sequenceNumber}</p>}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════ COMPONENTES ═══════════

function AnalysisSteps({ trace, verificationResult, statusFor }: { trace: LiveTrace; verificationResult: VerificationResult | null; statusFor: (p: VerifyPhase) => "pending" | "active" | "done" }) {
  return (
    <>
      <VerifyStep icon="📂" label="Reading image file" status={statusFor("reading_file")} detail={trace.fileSize ? `Size detected: ${trace.fileSize}` : "Analyzing file metadata..."} />
      <VerifyStep icon="🔐" label="Computing cryptographic fingerprint (Merkle Tree)" status={statusFor("hashing")} detail="Building Merkle Tree over file segments..." result={trace.merkleRoot} />
      <VerifyStep icon="🌐" label="Connecting to 0G Chain" status={statusFor("connecting_rpc")} detail={trace.rpcUrl ? `RPC: ${trace.rpcUrl}` : "Establishing connection to RPC node..."} meta={[trace.chainId ? `Chain ID: ${trace.chainId}` : undefined, trace.blockNumber ? `Current block: #${trace.blockNumber.toLocaleString()}` : undefined]} />
      <VerifyStep icon="⛓️" label="Querying smart contract" status={statusFor("querying_contract")} detail="Looking up provenance record in on-chain mapping..." meta={[trace.contractAddress ? `Contract: ${shortenAddress(trace.contractAddress)}` : undefined, trace.querySelector]} />
      <VerifyStep icon={verificationResult?.verified ? "✅" : "❌"} label={verificationResult?.verified ? "Record found on-chain!" : "Record NOT found"} status={statusFor("done")} detail={verificationResult?.verified ? "Merkle Root matches an immutable on-chain record." : "This Merkle Root does not exist in the contract."} />
    </>
  );
}

function VerifyStep({ icon, label, detail, status, result, meta }: { icon: string; label: string; detail: string; status: "pending" | "active" | "done"; result?: string; meta?: (string | undefined)[] }) {
  return (
    <div className={cn("rounded-xl border p-4 transition-all duration-300", status === "active" && "border-cyan-500/40 bg-cyan-500/5 shadow-lg shadow-cyan-500/10", status === "done" && "border-green-500/30 bg-green-500/5", status === "pending" && "border-slate-700/50 bg-slate-900/30 opacity-35")}>
      <div className="flex items-start gap-3">
        <div className={cn("text-xl shrink-0 w-9 h-9 flex items-center justify-center rounded-lg mt-0.5", status === "active" && "animate-pulse bg-cyan-500/10", status === "done" && "bg-green-500/10", status === "pending" && "bg-slate-800")}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm font-semibold", status === "active" && "text-cyan-300", status === "done" && "text-green-300", status === "pending" && "text-slate-500")}>{label}</p>
            {status === "active" && <span className="text-xs text-cyan-400 animate-pulse">⏳</span>}
            {status === "done" && <span className="text-xs text-green-400">✓</span>}
          </div>
          <p className={cn("text-xs mt-0.5", status === "active" ? "text-cyan-400/80" : status === "done" ? "text-slate-400" : "text-slate-600")}>{detail}</p>
          {meta && meta.filter(Boolean).length > 0 && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{meta.filter(Boolean).map((m, i) => <span key={i} className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">{m}</span>)}</div>}
          {status === "done" && result && <div className="mt-2 bg-slate-950 border border-slate-700/50 rounded-lg px-2.5 py-1.5"><code className="text-[11px] text-cyan-400 break-all font-mono leading-relaxed">{result}</code></div>}
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value, isHash = false, mono = false }: { label: string; value: string; isHash?: boolean; mono?: boolean }) {
  return <div className="flex flex-col sm:flex-row sm:items-start gap-1.5"><span className="text-slate-500 shrink-0 w-32 text-xs">{label}:</span><span className={cn("text-slate-300 text-xs", (isHash || mono) && "font-mono text-[11px] break-all")}>{value}</span></div>;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
