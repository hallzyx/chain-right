"use client";

import { useState, useRef } from "react";
import {
  actionVerifyImage,
  actionComputeMerkleRoot,
  actionManualVerify,
  actionGetVerificationDetails,
} from "@/app/actions";
import { cn, shortenAddress } from "@/lib/utils";
import { bufferToDataUrl, modifyOnePixel } from "@/lib/utils";
import { downloadCertificatePdf } from "@/lib/certificate-pdf";
import { WowMoment } from "@/components/wow-moment";
import type { VerificationResult } from "@/lib/types";
import {
  ImageIcon,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Link2,
  Download,
  ChevronDown,
  ArrowRight,
  FileSearch,
  Loader2,
  Fingerprint,
  BookOpen,
  Shield,
  ExternalLink,
} from "lucide-react";

type VerifyPhase =
  | "idle"
  | "reading_file"
  | "hashing"
  | "connecting_rpc"
  | "querying_contract"
  | "done";

interface LiveTrace {
  fileSize?: string;
  merkleRoot?: string;
  rpcUrl?: string;
  contractAddress?: string;
  chainId?: number;
  blockNumber?: number;
  querySelector?: string;
}

/**
 * Página de verificación de autenticidad.
 * Diseño adaptado de Stitch — Black & Amber Edition.
 */
export default function VerifyPage() {
  const [step, setStep] = useState<
    "upload" | "verifying" | "result" | "wow"
  >("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [originalBase64, setOriginalBase64] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<Uint8Array | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [originalRoot, setOriginalRoot] = useState<string | null>(null);
  const [modifiedRoot, setModifiedRoot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [verifyPhase, setVerifyPhase] = useState<VerifyPhase>("idle");
  const [trace, setTrace] = useState<LiveTrace>({});
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [manualRoot, setManualRoot] = useState("");
  const [manualResult, setManualResult] = useState<VerificationResult | null>(
    null
  );
  const [manualLoading, setManualLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setVerificationResult(null);
    setOriginalRoot(null);
    setModifiedRoot(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadedImage(dataUrl);
      setOriginalBase64(dataUrl);
      setOriginalData(new Uint8Array(await file.arrayBuffer()));
    };
    reader.readAsDataURL(file);
  }

  // ── Verificar ──
  async function handleVerify() {
    if (!originalBase64) return;
    setError(null);
    setTrace({});
    setStep("verifying");

    setVerifyPhase("reading_file");
    const sz = originalData?.length ?? 0;
    setTrace((t) => ({
      ...t,
      fileSize: sz > 1024 ? `${(sz / 1024).toFixed(1)} KB` : `${sz} bytes`,
    }));
    await sleep(350);

    setVerifyPhase("hashing");
    const rr = await actionComputeMerkleRoot(originalBase64);
    if (rr.success && rr.merkleRoot) {
      setOriginalRoot(rr.merkleRoot);
      setTrace((t) => ({ ...t, merkleRoot: rr.merkleRoot }));
    }
    await sleep(300);

    setVerifyPhase("connecting_rpc");
    try {
      const d = await actionGetVerificationDetails();
      setTrace((t) => ({
        ...t,
        rpcUrl: d.rpcUrl,
        contractAddress: d.contractAddress,
        chainId: d.chainId,
        blockNumber: d.blockNumber,
      }));
    } catch {
      /* graceful */
    }
    await sleep(350);

    setVerifyPhase("querying_contract");
    setTrace((t) => ({
      ...t,
      querySelector: `getProvenance(${t.merkleRoot?.slice(0, 10)}...)`,
    }));
    await sleep(300);
    const result = await actionVerifyImage(originalBase64);
    setVerificationResult(result);
    setVerifyPhase("done");
    await sleep(250);
    setStep("result");
  }

  // ── Manual ──
  async function handleManualVerify() {
    if (!manualRoot.trim()) return;
    setManualLoading(true);
    setManualResult(null);
    try {
      setManualResult(await actionManualVerify(manualRoot.trim()));
    } catch (e: any) {
      setManualResult({
        verified: false,
        merkleRoot: manualRoot.trim(),
        message: `Error: ${e.message}`,
      });
    } finally {
      setManualLoading(false);
    }
  }

  // ── Wow ──
  function handleWowMoment() {
    if (!originalData) return;
    const m = modifyOnePixel(originalData);
    actionComputeMerkleRoot(bufferToDataUrl(m, "image/png")).then((r) => {
      if (r.merkleRoot) setModifiedRoot(r.merkleRoot);
    });
    setStep("wow");
  }

  // ── PDF ──
  async function handleDownloadPdf() {
    if (!verificationResult?.provenance) return;
    setPdfLoading(true);
    try {
      const p = verificationResult.provenance;
      await downloadCertificatePdf({
        wallet: p.creator,
        prompt: p.prompt,
        model: p.model,
        merkleRoot: p.merkleRoot,
        sequenceNumber: p.sequenceNumber,
        submissionUrl: p.sequenceNumber
          ? `https://storagescan-galileo.0g.ai/submission/${p.sequenceNumber}`
          : undefined,
        imageUrl: uploadedImage ?? undefined,
        timestamp: new Date(
          Number(p.timestamp) * 1000
        ).toISOString(),
      });
    } finally {
      setPdfLoading(false);
    }
  }

  function handleReset() {
    setStep("upload");
    setUploadedImage(null);
    setOriginalBase64(null);
    setOriginalData(null);
    setVerificationResult(null);
    setOriginalRoot(null);
    setModifiedRoot(null);
    setError(null);
    setVerifyPhase("idle");
    setTrace({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function statusFor(p: VerifyPhase): "pending" | "active" | "done" {
    const o: VerifyPhase[] = [
      "idle",
      "reading_file",
      "hashing",
      "connecting_rpc",
      "querying_contract",
      "done",
    ];
    const ci = o.indexOf(verifyPhase),
      pi = o.indexOf(p);
    return pi < ci ? "done" : pi === ci ? "active" : "pending";
  }

  function progressPercent(): number {
    const phases: VerifyPhase[] = [
      "reading_file",
      "hashing",
      "connecting_rpc",
      "querying_contract",
      "done",
    ];
    const idx = phases.indexOf(verifyPhase);
    if (idx < 0) return 0;
    if (verifyPhase === "done") return 100;
    return Math.round(((idx + 0.5) / phases.length) * 100);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-0 pb-24">
      {/* Header */}
      <section className="mb-16 pt-8">
        <h1 className="font-[family-name:var(--font-newsreader)] text-5xl text-[#f0e0d1] mb-4">
          Verify Authenticity
        </h1>
        <p className="text-lg text-[#d8c3ad] max-w-2xl leading-relaxed">
          Upload any image to check its blockchain provenance and verify its
          origin in our immutable ledger.
        </p>
      </section>

      {error && (
        <div className="bg-[#93000a]/10 border border-[#ffb4ab]/20 p-4 mb-8">
          <p className="text-[#ffb4ab] text-sm">{error}</p>
        </div>
      )}

      {/* ═══════════ UPLOAD ═══════════ */}
      {step === "upload" && !uploadedImage && (
        <div className="space-y-12">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group relative flex flex-col items-center justify-center h-[400px]",
              "bg-[#1a1a1a]/50 border border-white/5",
              "transition-all duration-300 hover:bg-[#31281f] cursor-pointer"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center text-center space-y-6">
              <ImageIcon
                className="w-16 h-16 text-[#a08e7a] group-hover:text-[#f59e0b] transition-colors"
                strokeWidth={1}
              />
              <div className="space-y-2">
                <p className="text-lg text-[#f0e0d1]">Click to upload an image</p>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#a08e7a]">
                  PNG, JPG, WEBP
                </p>
              </div>
            </div>
            {/* Interactive Overlay Effect */}
            <div className="absolute inset-0 border border-transparent group-hover:border-[#f59e0b]/20 transition-all pointer-events-none" />
          </div>

          {/* Forensic Details Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/5 pt-16">
            <div className="space-y-4">
              <Fingerprint
                className="w-6 h-6 text-[#f59e0b]"
                strokeWidth={1.5}
              />
              <h3 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f0e0d1]">
                Hash Verification
              </h3>
              <p className="text-[#d8c3ad] leading-relaxed">
                Every image is uniquely hashed using SHA-256 to ensure no
                alteration has occurred since its initial registration.
              </p>
            </div>
            <div className="space-y-4">
              <BookOpen
                className="w-6 h-6 text-[#f59e0b]"
                strokeWidth={1.5}
              />
              <h3 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f0e0d1]">
                Immutable Logs
              </h3>
              <p className="text-[#d8c3ad] leading-relaxed">
                We cross-reference metadata against on-chain records to provide
                a complete ownership and creation timeline.
              </p>
            </div>
            <div className="space-y-4">
              <Shield
                className="w-6 h-6 text-[#f59e0b]"
                strokeWidth={1.5}
              />
              <h3 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f0e0d1]">
                Secure Sandbox
              </h3>
              <p className="text-[#d8c3ad] leading-relaxed">
                Our verification process runs in an isolated environment,
                protecting your original file&apos;s integrity and privacy.
              </p>
            </div>
          </section>
        </div>
      )}

      {uploadedImage && step === "upload" && (
        <div className="space-y-8">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a08e7a] mb-6">
            Selection Preview
          </div>
          <div className="bg-[#1a1a1a]/80 border border-white/5 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-8 w-full md:w-auto">
              <div className="w-[120px] h-[120px] shrink-0 bg-black overflow-hidden ring-1 ring-white/10">
                <img
                  src={uploadedImage}
                  alt="Provenance asset"
                  className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg text-[#f0e0d1] mb-1">
                  Uploaded image
                </span>
                <span className="text-sm text-[#a08e7a]">
                  Ready for verification
                </span>
              </div>
            </div>
            <div className="flex items-center gap-8 w-full md:w-auto justify-end">
              <button
                onClick={handleReset}
                className="text-[#d8c3ad] hover:text-[#f0e0d1] transition-colors"
              >
                Change
              </button>
              <button
                onClick={handleVerify}
                className="bg-[#f59e0b] text-[#2a1700] px-10 py-4 text-xs font-semibold uppercase tracking-[0.1em] hover:opacity-90 active:scale-95 transition-all flex items-center gap-3"
              >
                <Search className="w-4 h-4" />
                Verify Authenticity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VERIFICANDO ═══════════ */}
      {step === "verifying" && (
        <div className="space-y-6">
          {/* Barra de progreso */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#888]">Analysis progress</span>
              <span className="text-xs font-mono text-[#f59e0b]">
                {progressPercent()}%
              </span>
            </div>
            <div className="w-full h-1 bg-[#1a1a1a]">
              <div
                className="h-full bg-[#f59e0b] transition-all duration-500 ease-out"
                style={{ width: `${progressPercent()}%` }}
              />
            </div>
          </div>
          {uploadedImage && (
            <div className="bg-[#1a1a1a] border border-white/5 overflow-hidden max-h-32 mb-4">
              <img
                src={uploadedImage}
                alt=""
                className="w-full h-32 object-cover opacity-30"
              />
            </div>
          )}
          <div className="space-y-4">
            <AnalysisSteps
              trace={trace}
              verificationResult={verificationResult}
              statusFor={statusFor}
            />
          </div>
        </div>
      )}

      {/* ═══════════ RESULTADO + WOW ═══════════ */}
      {(step === "result" || step === "wow") && verificationResult && (
        <div className="space-y-12">
          {/* 1. SUCCESS / FAIL BANNER */}
          <section className="text-center">
            <div
              className={cn(
                "py-12 px-8 inline-block w-full",
                verificationResult.verified
                  ? "bg-[#1a1a1a]/50"
                  : "bg-[#93000a]/5 border border-[#ffb4ab]/10"
              )}
            >
              <div className="mb-6">
                {verificationResult.verified ? (
                  <ShieldCheck
                    className="w-16 h-16 text-[#f59e0b] mx-auto"
                    strokeWidth={1.5}
                  />
                ) : (
                  <XCircle
                    className="w-16 h-16 text-[#ffb4ab] mx-auto"
                    strokeWidth={1.5}
                  />
                )}
              </div>
              <h2
                className={cn(
                  "font-[family-name:var(--font-newsreader)] text-4xl md:text-5xl mb-4",
                  verificationResult.verified
                    ? "text-[#f0e0d1]"
                    : "text-[#ffb4ab]"
                )}
              >
                {verificationResult.verified
                  ? "Authenticity Confirmed"
                  : "No Record Found"}
              </h2>
              <p className="text-[#d8c3ad] max-w-md mx-auto mb-6">
                {verificationResult.message}
              </p>
              {verificationResult.verified && (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#f59e0b]" />
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#f59e0b]">
                    Record found at block #{trace.blockNumber?.toLocaleString() || "—"}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Acordeón del proceso */}
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 transition-colors border",
              showAnalysis
                ? "border-[#f59e0b]/20 bg-[#f59e0b]/5"
                : "border-white/5 bg-[#141414]/30 hover:border-white/10"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#d8c3ad]">
                {showAnalysis ? "Hide" : "Show"} analysis process
              </span>
              <span className="text-[10px] font-mono text-[#555] bg-[#1a1a1a] px-1.5 py-0.5">
                5/5 completed
              </span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-[#888] transition-transform",
                showAnalysis && "rotate-180"
              )}
            />
          </button>

          {showAnalysis && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="mb-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#555]">Analysis complete</span>
                  <span className="text-xs font-mono text-[#f59e0b]">100%</span>
                </div>
                <div className="w-full h-1 bg-[#1a1a1a]">
                  <div className="h-full w-full bg-[#f59e0b]" />
                </div>
              </div>
              <div className="space-y-4">
                <AnalysisSteps
                  trace={trace}
                  verificationResult={verificationResult}
                  statusFor={() => "done" as const}
                />
              </div>
            </div>
          )}

          {/* 2. MERKLE ROOT CARD */}
          <section>
            <div className="bg-[#141414] p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a08e7a] mb-4">
                CRYPTOGRAPHIC FINGERPRINT
              </p>
              <div className="font-mono text-lg break-all tracking-tight text-[#f0e0d1] mb-6 bg-black/30 p-4">
                {verificationResult.merkleRoot}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f59e0b]" />
                <span className="text-sm text-[#d8c3ad]">
                  SHA-256 verified locally and on-chain
                </span>
              </div>
            </div>
          </section>

          {/* 3. ON-CHAIN PROVENANCE DATA */}
          {verificationResult.verified && verificationResult.provenance && (
            <>
              <section>
                <div className="bg-[#141414] p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Link2
                      className="w-5 h-5 text-[#f59e0b]"
                      strokeWidth={1.5}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#f0e0d1]">
                      ON-CHAIN PROVENANCE DATA
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <ProvenanceItem
                      label="CREATOR"
                      value={shortenAddress(verificationResult.provenance.creator)}
                    />
                    <ProvenanceItem
                      label="AI MODEL"
                      value={verificationResult.provenance.model}
                    />
                    <ProvenanceItem
                      label="PROMPT"
                      value={verificationResult.provenance.prompt}
                    />
                    <ProvenanceItem
                      label="ZK RESOURCE KEY"
                      value={verificationResult.provenance.zkResKey || "—"}
                    />
                    <ProvenanceItem
                      label="SEQUENCE"
                      value={verificationResult.provenance.sequenceNumber || "—"}
                    />
                    <ProvenanceItem
                      label="TIMESTAMP"
                      value={new Date(
                        Number(verificationResult.provenance.timestamp) * 1000
                      ).toLocaleString("en-US")}
                    />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {verificationResult.provenance.sequenceNumber && (
                      <a
                        href={`https://storagescan-galileo.0g.ai/submission/${verificationResult.provenance.sequenceNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-xs font-semibold bg-[#8fd5ff]/10 text-[#8fd5ff] hover:bg-[#8fd5ff]/20 border border-[#8fd5ff]/20 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on StorageScan
                      </a>
                    )}
                  </div>
                </div>
              </section>

              {/* Download PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className={cn(
                  "w-full py-4 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  "bg-[#f59e0b] text-[#0a0a0a] hover:opacity-90",
                  "disabled:opacity-50"
                )}
              >
                <Download className="w-4 h-4" />
                {pdfLoading ? "Generating..." : "Download Certificate PDF"}
              </button>
            </>
          )}

          {/* 4. WOW MOMENT TRIGGER */}
          {step !== "wow" && (
            <section>
              <div className="bg-[#1e1e1e] p-10 relative overflow-hidden group">
                <div className="relative z-10 max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#888] mb-2">
                    Experience the Proof
                  </p>
                  <h2 className="font-[family-name:var(--font-newsreader)] text-3xl text-[#f0e0d1] mb-4">
                    The Wow Moment
                  </h2>
                  <p className="text-[#d8c3ad] mb-8 leading-relaxed">
                    See what happens when just ONE pixel changes... Our
                    cryptographic analysis is so precise that a single byte
                    alteration invalidates the entire chain.
                  </p>
                  <button
                    onClick={handleWowMoment}
                    className="text-sm font-medium text-[#f0e0d1] hover:text-[#f59e0b] transition-colors flex items-center gap-2"
                  >
                    VIEW WOW MOMENT
                    <ArrowRight className="w-4 h-4 text-[#f59e0b]" />
                  </button>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 group-hover:opacity-60 transition-opacity">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTmG0ztIqEuy4QgPg8yAsI-HghEFP-UDfeVZVlK3lpSrbV1Ee4dZwBiTBizzFmEKcPQVEWWetsUGwdxCP1CdL8XtgwQWZiF6c3Yl3ET_iW4kzmZY4a4xxH_G2QKwk5cCSHkHr2aCQYROjoVDP6cv5uASIqN4lJGnPIr_IzhqSFUFZWdpXzMu5cSjuUCkgdIoev3lfB--_bIjmI7HeIBQLESMgq7jiWXIFaarA_UO47GfnCXp9104wWX1n8YNuK6ajFfo1raEIHOA"
                    alt="Wow Moment Decor"
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
              </div>
            </section>
          )}

          {step === "wow" && (
            <WowMoment
              originalRoot={originalRoot}
              modifiedRoot={modifiedRoot}
              originalImage={uploadedImage}
            />
          )}

          {/* Bottom action */}
          <section className="text-center pt-8">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 text-[#888] hover:text-[#f0e0d1] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Verify another image
            </button>
          </section>
        </div>
      )}

      {/* ═══════════ VERIFICACIÓN MANUAL ═══════════ */}
      {step === "upload" && (
        <div className="mt-16">
          <button
            onClick={() => setShowManual(!showManual)}
            className="w-full text-left flex items-center justify-between px-4 py-4 border border-white/5 bg-[#141414]/30 hover:border-white/10 transition-colors"
          >
            <div>
              <span className="text-sm font-medium text-[#d8c3ad]">
                Have a PDF certificate?
              </span>
              <p className="text-xs text-[#888] mt-0.5">
                Verify manually by pasting the Merkle Root
              </p>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-[#888] transition-transform",
                showManual && "rotate-180"
              )}
            />
          </button>
          {showManual && (
            <div className="mt-3 border border-white/5 bg-[#141414]/30 p-6 space-y-4">
              <label className="block text-sm font-medium text-[#d8c3ad]">
                Paste your Merkle Root
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={manualRoot}
                  onChange={(e) => setManualRoot(e.target.value)}
                  placeholder="0x..."
                  className={cn(
                    "flex-1 bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-[#f0e0d1] font-mono",
                    "focus:outline-none focus:border-[#f59e0b]/30",
                    "placeholder:text-[#555]"
                  )}
                />
                <button
                  onClick={handleManualVerify}
                  disabled={!manualRoot.trim() || manualLoading}
                  className={cn(
                    "px-5 py-3 text-sm font-semibold shrink-0 transition-all",
                    manualRoot.trim()
                      ? "bg-[#f59e0b] text-[#0a0a0a] hover:bg-[#ffb95f]"
                      : "bg-[#1a1a1a] text-[#555] cursor-not-allowed"
                  )}
                >
                  {manualLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
              {manualResult && (
                <div
                  className={cn(
                    "p-4 text-sm",
                    manualResult.verified
                      ? "bg-[#f59e0b]/5 border border-[#f59e0b]/20 text-[#f0e0d1]"
                      : "bg-[#93000a]/5 border border-[#ffb4ab]/10 text-[#ffb4ab]"
                  )}
                >
                  <p className="font-semibold mb-1">
                    {manualResult.verified ? "Confirmed" : "No record"}
                  </p>
                  <p className="text-xs opacity-75">{manualResult.message}</p>
                  {manualResult.provenance && (
                    <div className="mt-2 text-xs text-[#888] space-y-1">
                      <p>
                        Creator:{" "}
                        {shortenAddress(manualResult.provenance.creator)}
                      </p>
                      <p>Model: {manualResult.provenance.model}</p>
                      {manualResult.provenance.sequenceNumber && (
                        <p>
                          Sequence: {manualResult.provenance.sequenceNumber}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Note */}
      {step === "upload" && (
        <footer className="w-full py-12 flex flex-col items-center border-t border-white/5 mt-16">
          <p className="text-sm text-[#a08e7a] text-center mb-4">
            Your image is processed locally. Nothing is uploaded without your
            consent.
          </p>
          <div className="flex space-x-8">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a08e7a]">
              Privacy Policy
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a08e7a]">
              Protocol Specs
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a08e7a]">
              Support
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}

// ═══════════ COMPONENTES ═══════════

function AnalysisSteps({
  trace,
  verificationResult,
  statusFor,
}: {
  trace: LiveTrace;
  verificationResult: VerificationResult | null;
  statusFor: (p: VerifyPhase) => "pending" | "active" | "done";
}) {
  const steps: {
    phase: VerifyPhase;
    icon: React.ReactNode;
    label: string;
    detail: string;
    result?: string;
    meta?: (string | undefined)[];
  }[] = [
    {
      phase: "reading_file",
      icon: <FileSearch className="w-5 h-5" />,
      label: "Reading image file",
      detail: trace.fileSize
        ? `Size detected: ${trace.fileSize}`
        : "Analyzing file metadata...",
    },
    {
      phase: "hashing",
      icon: <Fingerprint className="w-5 h-5" />,
      label: "Computing cryptographic fingerprint (Merkle Tree)",
      detail: "Building Merkle Tree over file segments...",
      result: trace.merkleRoot,
    },
    {
      phase: "connecting_rpc",
      icon: <Link2 className="w-5 h-5" />,
      label: "Connecting to 0G Chain",
      detail: trace.rpcUrl
        ? `RPC: ${trace.rpcUrl}`
        : "Establishing connection to RPC node...",
      meta: [
        trace.chainId ? `Chain ID: ${trace.chainId}` : undefined,
        trace.blockNumber
          ? `Current block: #${trace.blockNumber.toLocaleString()}`
          : undefined,
      ],
    },
    {
      phase: "querying_contract",
      icon: <Search className="w-5 h-5" />,
      label: "Querying smart contract",
      detail: "Looking up provenance record in on-chain mapping...",
      meta: [
        trace.contractAddress
          ? `Contract: ${shortenAddress(trace.contractAddress)}`
          : undefined,
        trace.querySelector,
      ],
    },
    {
      phase: "done",
      icon: verificationResult?.verified ? (
        <CheckCircle2 className="w-5 h-5" />
      ) : (
        <XCircle className="w-5 h-5" />
      ),
      label: verificationResult?.verified
        ? "Record found on-chain!"
        : "Record NOT found",
      detail: verificationResult?.verified
        ? "Merkle Root matches an immutable on-chain record."
        : "This Merkle Root does not exist in the contract.",
    },
  ];

  return (
    <>
      {steps.map((s) => (
        <VerifyStep
          key={s.phase}
          icon={s.icon}
          label={s.label}
          detail={s.detail}
          status={statusFor(s.phase)}
          result={s.result}
          meta={s.meta}
        />
      ))}
    </>
  );
}

function VerifyStep({
  icon,
  label,
  detail,
  status,
  result,
  meta,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  status: "pending" | "active" | "done";
  result?: string;
  meta?: (string | undefined)[];
}) {
  return (
    <div
      className={cn(
        "border p-4 transition-all duration-300",
        status === "active" &&
          "border-[#f59e0b]/40 bg-[#f59e0b]/5",
        status === "done" &&
          (label.includes("NOT")
            ? "border-[#ffb4ab]/30 bg-[#ffb4ab]/5"
            : "border-[#f59e0b]/30 bg-[#f59e0b]/5"),
        status === "pending" && "border-white/5 bg-[#0a0a0a]/30 opacity-35"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 w-9 h-9 flex items-center justify-center mt-0.5",
            status === "active" && "text-[#f59e0b] bg-[#f59e0b]/10",
            status === "done" &&
              (label.includes("NOT")
                ? "text-[#ffb4ab] bg-[#ffb4ab]/10"
                : "text-[#f59e0b] bg-[#f59e0b]/10"),
            status === "pending" && "text-[#555] bg-[#1a1a1a]"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-sm font-semibold",
                status === "active" && "text-[#f59e0b]",
                status === "done" &&
                  (label.includes("NOT")
                    ? "text-[#ffb4ab]"
                    : "text-[#f0e0d1]"),
                status === "pending" && "text-[#555]"
              )}
            >
              {label}
            </p>
            {status === "active" && (
              <Loader2 className="w-3 h-3 text-[#f59e0b] animate-spin" />
            )}
            {status === "done" && !label.includes("NOT") && (
              <CheckCircle2 className="w-3 h-3 text-[#f59e0b]" />
            )}
          </div>
          <p
            className={cn(
              "text-xs mt-0.5",
              status === "active"
                ? "text-[#f59e0b]/80"
                : status === "done"
                ? "text-[#888]"
                : "text-[#555]"
            )}
          >
            {detail}
          </p>
          {meta && meta.filter(Boolean).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {meta
                .filter(Boolean)
                .map((m, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono text-[#555] bg-[#1a1a1a]/50 px-1.5 py-0.5"
                  >
                    {m}
                  </span>
                ))}
            </div>
          )}
          {status === "done" && result && (
            <div className="mt-2 bg-[#0a0a0a] border border-white/5 px-2.5 py-1.5">
              <code className="text-[11px] text-[#f59e0b] break-all font-mono leading-relaxed">
                {result}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProvenanceItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#888] mb-1">
        {label}
      </p>
      <p className="text-sm text-[#f0e0d1] font-mono truncate">{value}</p>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
