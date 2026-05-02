"use client";

import { useState } from "react";
import {
  actionGenerateImage,
  actionGenerateImageWithFallback,
  actionMintNFT,
} from "@/app/actions";
import { cn } from "@/lib/utils";
import type {
  ImageGenerationResult,
  StorageUploadResult,
  MintResult,
} from "@/lib/types";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  CloudUpload,
  Check,
  Loader2,
  ShieldCheck,
  CloudCheck,
  Coins,
  ArrowUpRight,
  Download,
  Copy,
  CheckCircle2,
} from "lucide-react";

/**
 * Página para crear y mintear una obra con procedencia.
 * Diseño adaptado de Stitch — Black & Amber Edition.
 * Client Component.
 */
export default function CreatePage() {
  const { address } = useAccount();
  const [step, setStep] = useState<
    | "prompt"
    | "generating"
    | "generated"
    | "uploading"
    | "stored"
    | "minting"
    | "done"
  >("prompt");
  const [prompt, setPrompt] = useState("");
  const [imageResult, setImageResult] = useState<ImageGenerationResult | null>(null);
  const [storageResult, setStorageResult] = useState<StorageUploadResult | null>(null);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState(false);

  // ============ Paso 1: Generar Imagen ============

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setError(null);
    setStep("generating");

    try {
      const result = await actionGenerateImage(prompt);

      if (result.fallbackRequired) {
        setPendingPrompt(prompt);
        setFallbackReason(
          result.fallbackReason ||
            "No text-to-image providers available on 0G at this time."
        );
        setShowFallbackModal(true);
        setStep("prompt");
        return;
      }

      if (!result.success) {
        setError(result.error || "Unknown error");
        setStep("prompt");
        return;
      }

      setImageResult(result);
      setStep("generated");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setStep("prompt");
    }
  }

  async function handleAcceptFallback() {
    setShowFallbackModal(false);
    setError(null);
    setStep("generating");

    try {
      const result = await actionGenerateImageWithFallback(pendingPrompt);

      if (!result.success) {
        setError(result.error || "OpenAI fallback error");
        setStep("prompt");
        return;
      }

      setImageResult(result);
      setStep("generated");
    } catch (err: any) {
      setError(err.message || "Unexpected fallback error");
      setStep("prompt");
    }
  }

  function handleCancelFallback() {
    setShowFallbackModal(false);
    setStep("prompt");
  }

  // ============ Paso 2: Subir a Storage ============

  async function handleUpload() {
    if (!imageResult || !imageResult.imageUrl) return;

    setError(null);
    setStep("uploading");

    try {
      const resp = await fetch(imageResult.imageUrl);
      const blob = await resp.blob();
      const ext = blob.type.includes("jpeg")
        ? "jpeg"
        : blob.type.includes("webp")
        ? "webp"
        : "png";

      const form = new FormData();
      form.append(
        "file",
        new File([blob], `chainright.${ext}`, { type: blob.type || `image/${ext}` })
      );

      const apiResp = await fetch("/api/storage/upload", {
        method: "POST",
        body: form,
      });

      const result = await apiResp.json();

      if (!result.success) {
        setError(result.error || "Error uploading to Storage");
        setStep("generated");
        return;
      }

      setStorageResult(result);
      setStep("stored");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setStep("generated");
    }
  }

  // ============ Paso 3: Mintear NFT ============

  async function handleMint() {
    if (!storageResult || !imageResult) return;

    setError(null);
    setStep("minting");

    try {
      if (!storageResult.merkleRoot) {
        setError("No Merkle Root available for minting");
        setStep("stored");
        return;
      }

      const result = await actionMintNFT(
        storageResult.merkleRoot,
        imageResult.zkResKey,
        imageResult.prompt,
        imageResult.model,
        storageResult.sequenceNumber || ""
      );

      if (!result.success) {
        setError(result.error || "Error minting NFT");
        setStep("stored");
        return;
      }

      setMintResult(result);

      await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          title: "Artwork generated on ChainRight",
          prompt: imageResult.prompt,
          source: imageResult.source || "0g-compute",
          model: imageResult.model,
          imageDataUrl: imageResult.imageUrl,
          merkleRoot: storageResult.merkleRoot,
          storageTxHash: storageResult.transactionHash,
          sequenceNumber: storageResult.sequenceNumber,
          submissionUrl: storageResult.submissionUrl,
          fileStorageUrl: storageResult.fileStorageUrl,
          tokenId: result.tokenId?.toString(),
          mintTxHash: result.transactionHash,
          status: "minted",
          contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        }),
      });

      setStep("done");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setStep("stored");
    }
  }

  // ============ Reset ============

  function handleReset() {
    setStep("prompt");
    setPrompt("");
    setImageResult(null);
    setStorageResult(null);
    setMintResult(null);
    setError(null);
  }

  function handleCopyHash(hash: string) {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }

  const stepsConfig = [
    { key: "prompt", label: "PROMPT" },
    { key: "store", label: "STORE" },
    { key: "mint", label: "MINT" },
  ];

  function getStepStatus(stepLabel: string) {
    const order = ["prompt", "store", "mint"];
    const currentMap: Record<string, number> = {
      prompt: 0,
      generating: 0,
      generated: 0,
      uploading: 1,
      stored: 1,
      minting: 2,
      done: 2,
    };
    const idx = order.indexOf(stepLabel);
    const currentIdx = currentMap[step] ?? 0;
    if (currentIdx > idx) return "done";
    if (currentIdx === idx) return "active";
    return "pending";
  }

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-0 pb-24">
      {/* Header */}
      <div className="w-full mb-12">
        <h1 className="font-[family-name:var(--font-newsreader)] text-4xl md:text-5xl text-[#f5f5f5] mb-2 mt-12">
          Create Artwork
        </h1>
        <p className="text-[#888888] text-lg">
          Your AI artwork. Your proof. Your ownership.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="w-full max-w-xl mx-auto mb-20">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#333] -z-10" />
          {stepsConfig.map((s, i) => {
            const status = getStepStatus(s.key);
            return (
              <div key={s.key} className="flex flex-col items-center gap-4 bg-[#0a0a0a] px-4">
                <div
                  className={cn(
                    "w-3 h-3 flex items-center justify-center",
                    status === "done" && "bg-[#f59e0b]",
                    status === "active" && "bg-[#f59e0b] ring-4 ring-[#f59e0b]/20",
                    status === "pending" && "bg-[#333]"
                  )}
                >
                  {status === "done" && <Check className="w-2 h-2 text-[#0a0a0a]" />}
                  {status === "active" && <div className="w-1.5 h-1.5 bg-[#2a1700]" />}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.15em]",
                    status === "done" && "text-[#f59e0b]",
                    status === "active" && "text-[#f59e0b]",
                    status === "pending" && "text-[#555]"
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#93000a]/10 border border-[#ffb4ab]/20 p-4 mb-8">
          <p className="text-[#ffb4ab] text-sm">{error}</p>
        </div>
      )}

      {/* ============ Step 1: Prompt ============ */}
      {step === "prompt" && (
        <div className="space-y-8">
          <section className="w-full bg-[#141414] p-8 md:p-12 transition-all duration-500">
            <div className="mb-8">
              <label
                htmlFor="prompt-input"
                className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f5f5f5] block mb-6"
              >
                Describe your image
              </label>
              <div className="relative group">
                <textarea
                  id="prompt-input"
                  className="w-full bg-[#0a0a0a] border-none text-[#f5f5f5] text-lg p-6 placeholder-[#555] transition-all duration-300 resize-none focus:outline-none focus:ring-0"
                  style={{ boxShadow: "none" }}
                  placeholder="A noir detective standing in the rain, neon city lights reflecting in the puddles, cinematic lighting, 8k resolution, oil painting style..."
                  rows={6}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#666] mt-4">
                Be specific. The prompt is stored on-chain forever.
              </p>
            </div>
            <div className="flex justify-center mt-12">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className={cn(
                  "bg-[#f59e0b] text-[#0a0a0a] font-medium text-base px-10 py-4 flex items-center gap-3 transition-all duration-300",
                  prompt.trim()
                    ? "hover:opacity-90 active:scale-95"
                    : "opacity-40 cursor-not-allowed"
                )}
              >
                <Sparkles className="w-5 h-5" />
                <span>Generate Image</span>
              </button>
            </div>
          </section>

          {/* Visual Context */}
          <div className="grid grid-cols-3 gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="h-48 bg-[#141414]">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAu77MZ8P9JxxAon-mpCi7ECZsO7kKsDw6y6i_cKniTNMCj90zfduZmIx8sFIhqUGgz00MI7dzvG7Q5EyOpW_raFO7BaVk71A6ggI7VDn60WmIwDBJkePoiaqoCO4NFLA12DYFIxnhtf-NQ3jPmVfkWgjPSEiR3du6EB-YgOl1cGM2Wl4ohY3jTs8NNCqKKNJBlY6dgodRmf6TcKTO_Sa5q6uSnAq5T0rA2GBpb6md3dAAhyXaufK2LlqK_ImXsIOFPAPFRzElzDQ"
                alt="Abstract digital artwork"
              />
            </div>
            <div className="h-48 bg-[#141414]">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCp5XkyCfH-ZdYUm612AbVk3tpZ0kCUw_x-CVmS1_ODo8bzoq_i5Sw2SsS8P3DS-zYVS7MmMmFAanmPNXGlVg_iqHQNlvd-CUMdi6_SKt8JyErhi2B9p2yKYIzwK5VIcGM6Oo0ni-QpMAPz231DFnI-j8hARJBOL9i3NTc4p0N2pBftaujj6RKcIr57Xlhw5Y9HLp0CgRILBmilBcL6z7SDiYSoCLudKmKo-UrW_I1JGNpBnpqly737vtN3DEBq18oLX1_UVtUbvg"
                alt="Premium black cardstock with gold foil"
              />
            </div>
            <div className="h-48 bg-[#141414]">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_fjAMB3wjnJeA-suQV3zWe7qlzQSDBBUi45k3NJcd9g95k_WMjvVyPA08zHbm2cHeUpNO-vEpxhmg1PBScxHIkEZ5ZsVTSImJnp4MIETyiWuqyxeYDKk7rOA6CqRt1g-HnOg-YRgDBRSmmFhCpeLXIuYHGr0lej8W_hbTY6RGd6Qkf_rcUk8zdkdk5Ns1fMYvkylRSAE6f41xn0dqIDRA-yV_AjXQsmANfCuoqjRTUiZ4YSslpGlHYYFu474lajj3pROPzXaJmg"
                alt="Glass prism reflecting amber light"
              />
            </div>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#555] text-center">
            Powered by 0G Compute — Flux Turbo. TEE-verified execution.
          </p>
        </div>
      )}

      {/* ============ Loading: Generating ============ */}
      {step === "generating" && (
        <div className="bg-[#141414] p-16 md:p-24 text-center">
          <Loader2 className="w-12 h-12 text-[#f59e0b] mx-auto mb-6 animate-spin" />
          <p className="text-lg text-[#f0e0d1] font-medium mb-2">Generating your image...</p>
          <p className="text-sm text-[#888]">0G Compute + Flux Turbo</p>
        </div>
      )}

      {/* ============ Step 2: Imagen Generada ============ */}
      {step === "generated" && imageResult && (
        <div className="space-y-8">
          {/* Hero Card */}
          <div className="bg-[#141414] overflow-hidden transition-all duration-500 group">
            <div className="aspect-[16/10] overflow-hidden">
              {imageResult.imageUrl && (
                <img
                  src={imageResult.imageUrl}
                  alt={imageResult.prompt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-8">
              <p className="text-sm text-[#888] italic leading-relaxed">
                &ldquo;{imageResult.prompt}&rdquo;
              </p>
            </div>
          </div>

          {/* Provenance Data */}
          <div className="mb-16">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#f59e0b] mb-8">
              PROVENANCE DATA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <ProvenanceRow label="AI Model" value={imageResult.model} />
              <ProvenanceRow
                label="ZG-Res-Key"
                value={imageResult.zkResKey ? shorten(imageResult.zkResKey, 16) : "N/A"}
                mono
              />
              <ProvenanceRow
                label="Provider"
                value={
                  imageResult.providerAddress
                    ? shorten(imageResult.providerAddress, 16)
                    : "N/A"
                }
                mono
              />
              <ProvenanceRow
                label="Source"
                value={
                  imageResult.source === "openai-fallback"
                    ? "OpenAI (fallback with consent)"
                    : "0G Compute Network"
                }
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-[#222]">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-[#888] font-medium hover:text-[#f59e0b] transition-colors px-6 py-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex flex-col items-end gap-4 w-full md:w-auto">
              <button
                onClick={handleUpload}
                className="bg-[#f59e0b] text-[#2a1700] font-medium px-10 py-5 flex items-center gap-3 transition-all duration-300 active:scale-95 hover:bg-[#ffb95f] group w-full md:w-auto justify-center"
              >
                <CloudUpload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                Store on 0G Storage
              </button>
              <p className="text-[#555] text-[10px] font-semibold uppercase tracking-widest text-right">
                Your image and prompt will be permanently recorded on-chain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ Loading: Uploading ============ */}
      {step === "uploading" && (
        <div className="bg-[#141414] p-16 md:p-24 text-center">
          <Loader2 className="w-12 h-12 text-[#f59e0b] mx-auto mb-6 animate-spin" />
          <p className="text-lg text-[#f0e0d1] font-medium mb-2">
            Storing on 0G Storage...
          </p>
          <p className="text-sm text-[#888]">Generating Merkle Root</p>
        </div>
      )}

      {/* ============ Step 3: Almacenado ============ */}
      {step === "stored" && storageResult && imageResult && (
        <div className="space-y-8">
          {/* Success Banner */}
          <div className="bg-[#141414] p-6 border-l-2 border-[#f59e0b]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#f59e0b] mb-1">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Stored on 0G Storage
                </p>
                <code className="text-xs text-[#555] font-mono">
                  SEQ_HASH: {storageResult.sequenceNumber
                    ? shorten(storageResult.sequenceNumber, 16)
                    : storageResult.merkleRoot
                    ? shorten(storageResult.merkleRoot, 16)
                    : "N/A"}
                </code>
              </div>
              <CloudCheck className="w-6 h-6 text-[#555]" />
            </div>
          </div>

          {/* Merkle Root Card */}
          <div className="bg-[#1e1e1e] p-8 md:p-12">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#f59e0b] mb-6 block">
              MERKLE ROOT
            </span>
            <div className="flex items-start gap-4 mb-8">
              <code className="font-mono text-xl md:text-2xl text-[#f5f5f5] break-all leading-tight flex-1">
                {storageResult.merkleRoot}
              </code>
                <button
                onClick={() =>
                  storageResult.merkleRoot && handleCopyHash(storageResult.merkleRoot)
                }
                className="shrink-0 p-2 text-[#888] hover:text-[#f59e0b] transition-colors"
                title="Copy Merkle Root"
              >
                {copiedHash ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="space-y-4 max-w-2xl">
              <p className="text-[#888] leading-relaxed">
                This is your artwork&apos;s unique cryptographic fingerprint. It serves
                as the immutable anchor for every pixel and prompt used in this
                creation, verifiable across the decentralized ledger.
              </p>
              <p className="text-xs text-[#555] italic">
                Keep this safe. This hash is required to verify the provenance and
                authenticity of your asset in the future.
              </p>
            </div>
          </div>

          {/* Mint Section */}
          <div className="space-y-8 pt-8">
            <div>
              <h2 className="font-[family-name:var(--font-newsreader)] text-3xl text-[#f5f5f5] mb-4">
                Register on the blockchain
              </h2>
              <p className="text-[#888] max-w-xl leading-relaxed">
                Mint a high-fidelity NFT containing the full provenance record.
                This final step formalizes your ownership and embeds the Merkle
                Root into the global state.
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <button
                onClick={handleMint}
                className="bg-[#f59e0b] text-[#2a1700] font-medium px-10 py-4 flex items-center gap-3 hover:bg-[#ffb95f] transition-all duration-300"
              >
                <Coins className="w-5 h-5" />
                Mint NFT
              </button>
              <button
                onClick={() => setStep("generated")}
                className="text-[#888] font-medium px-8 py-4 hover:text-[#f0e0d1] transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="pt-8">
            <p className="text-[10px] uppercase tracking-widest text-[#555]">
              Requires a 0G Testnet wallet with sufficient credits for transaction
              fees. All transactions are final and immutable.
            </p>
          </div>

          {/* Preview Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2" />
            <div className="lg:col-span-1">
              <div className="bg-[#141414] p-4 space-y-4">
                <div className="aspect-square w-full bg-[#0a0a0a] overflow-hidden mb-6">
                  {imageResult.imageUrl && (
                    <img
                      src={imageResult.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="space-y-4">
                  <span className="text-xs font-semibold uppercase tracking-tighter text-[#555]">
                    Original Prompt
                  </span>
                  <p className="text-xs text-[#888] leading-relaxed italic font-[family-name:var(--font-newsreader)]">
                    &ldquo;{imageResult.prompt}&rdquo;
                  </p>
                </div>
              </div>
              <div className="bg-[#141414]/50 p-6 space-y-4 mt-4">
                <ProvenanceRowSmall label="Gas Estimate" value="~0.00042 OG" />
                <ProvenanceRowSmall label="Network" value="0G Testnet" />
                <ProvenanceRowSmall label="Standard" value="ERC-721" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Loading: Minting ============ */}
      {step === "minting" && (
        <div className="bg-[#141414] p-16 md:p-24 text-center">
          <Loader2 className="w-12 h-12 text-[#f59e0b] mx-auto mb-6 animate-spin" />
          <p className="text-lg text-[#f0e0d1] font-medium mb-2">
            Minting NFT on 0G Chain...
          </p>
          <p className="text-sm text-[#888]">Waiting for block confirmation</p>
        </div>
      )}

      {/* ============ Step 4: Done / Certificate ============ */}
      {step === "done" && mintResult && imageResult && storageResult && (
        <div className="space-y-16">
          {/* Success Header */}
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f59e0b] mb-4">
              MINTED
            </p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-5xl md:text-6xl text-[#f5f5f5] mb-2">
              #{mintResult.tokenId?.toString() || "—"}
            </h1>
            <p className="text-[#888]">Permanently registered on 0G Chain</p>
          </div>

          {/* Certificate of Authorship */}
          <section className="bg-[#141414] p-8 md:p-16 lg:p-20 relative overflow-hidden">
            {/* Framed aesthetic header */}
            <div className="flex flex-col items-center mb-16">
              <div className="w-full h-[1px] bg-[#f59e0b]/30 mb-2" />
              <h2 className="font-[family-name:var(--font-newsreader)] text-[#f59e0b] tracking-[0.2em] px-8 text-center uppercase text-sm md:text-base">
                Certificate of Authorship
              </h2>
              <div className="w-full h-[1px] bg-[#f59e0b]/30 mt-2" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left: Artwork */}
              <div className="lg:col-span-5 aspect-square bg-[#0a0a0a] group">
                {imageResult.imageUrl && (
                  <img
                    src={imageResult.imageUrl}
                    alt="Certified artwork"
                    className="w-full h-full object-cover grayscale-[0.3] hover:grayscale-0 transition-all duration-700"
                  />
                )}
              </div>

              {/* Right: Metadata */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-y-6">
                    <CertMeta label="ARTIST" value={address ? shorten(address, 10) : "—"} />
                    <CertMeta label="AI MODEL" value={imageResult.model} />
                    <CertMeta
                      label="TOKEN ID"
                      value={`#${mintResult.tokenId?.toString() || "—"}`}
                    />
                    <CertMeta
                      label="SEQUENCE"
                      value={
                        storageResult.sequenceNumber
                          ? shorten(storageResult.sequenceNumber, 12)
                          : shorten(storageResult.merkleRoot, 12)
                      }
                    />
                    <div className="col-span-2">
                      <CertMeta
                        label="REGISTERED"
                        value={new Date().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      />
                    </div>
                  </div>

                  {/* Verification Badges */}
                  <div className="flex flex-wrap gap-4 pt-6 border-t border-white/5">
                    <Badge label="VERIFIED ON 0G CHAIN" />
                    <Badge label="STORAGE CONFIRMED" />
                    <Badge label="CRYPTOGRAPHIC PROOF" />
                  </div>
                </div>

                {/* Bottom Action Links & Prompt */}
                <div className="mt-12">
                  <p className="text-[#888] italic mb-8 leading-relaxed font-[family-name:var(--font-newsreader)]">
                    &ldquo;{imageResult.prompt}&rdquo;
                  </p>
                  <div className="flex flex-wrap items-center gap-6">
                    {mintResult.transactionHash && (
                      <a
                        href={`https://chainscan-galileo.0g.ai/tx/${mintResult.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold uppercase tracking-widest text-[#888] hover:text-[#f0e0d1] transition-colors"
                      >
                        VIEW TX
                      </a>
                    )}
                    {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS && mintResult.tokenId && (
                      <a
                        href={`https://chainscan-galileo.0g.ai/nft/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}/${mintResult.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold uppercase tracking-widest text-[#888] hover:text-[#f0e0d1] transition-colors"
                      >
                        VIEW NFT
                      </a>
                    )}
                    {storageResult.submissionUrl && (
                      <a
                        href={storageResult.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold uppercase tracking-widest text-[#888] hover:text-[#f0e0d1] transition-colors"
                      >
                        VIEW SUBMISSION
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Download PDF Button */}
            <div className="mt-16 flex justify-center">
              <button
                onClick={() => {
                  // Trigger PDF download via certificate-card logic
                  // For now just a placeholder — certificate-card handles PDF
                  window.open("/my-works", "_self");
                }}
                className="bg-[#f59e0b] text-[#0a0a0a] px-10 py-4 font-medium tracking-wider hover:opacity-90 transition-opacity flex items-center gap-3"
              >
                <Download className="w-5 h-5" />
                VIEW IN MY WORKS
              </button>
            </div>
          </section>

          {/* Page Nav */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-24">
            <a
              href="/my-works"
              className="flex items-center gap-2 text-[#888] hover:text-[#f0e0d1] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">View in My Works</span>
            </a>
            <button
              onClick={handleReset}
              className="bg-[#f59e0b] text-[#0a0a0a] px-12 py-4 font-medium hover:scale-[0.98] transition-transform"
            >
              CREATE ANOTHER
            </button>
          </div>
        </div>
      )}

      {/* ============ Fallback Modal ============ */}
      {showFallbackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]/90 p-4">
          <div className="w-full max-w-xl bg-[#141414] border border-white/5 p-8 md:p-12">
            <h3 className="mb-3 text-xl font-[family-name:var(--font-newsreader)] text-[#f5f5f5]">
              No text-to-image providers available on 0G right now
            </h3>
            <p className="mb-4 text-sm text-[#888]">{fallbackReason}</p>
            <p className="mb-8 text-sm text-[#d8c3ad]">
              We can use <strong>OpenAI</strong> as a fallback to generate the
              image, then continue with 0G Storage + mint on 0G testnet.
              <br />
              <span className="text-[#555]">
                The fallback only runs if you explicitly accept it.
              </span>
            </p>

            <div className="flex gap-4">
              <button
                onClick={handleCancelFallback}
                className="flex-1 border border-[#333] px-4 py-3 text-sm font-medium text-[#888] transition-all hover:border-[#555]"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptFallback}
                className="flex-1 bg-[#f59e0b] text-[#0a0a0a] px-4 py-3 text-sm font-medium transition-all hover:bg-[#ffb95f]"
              >
                Accept fallback and generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: { key: string; label: string }[];
  currentStep: string;
}) {
  // Not used directly — logic is inline above
  return null;
}

function ProvenanceRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
      <span className="text-[#888] text-sm font-medium">{label}</span>
      <span
        className={cn(
          "text-[#f5f5f5] font-medium",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProvenanceRowSmall({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
      <span className="text-xs text-[#555] uppercase tracking-tighter">{label}</span>
      <span className="text-xs text-[#d8c3ad]">{value}</span>
    </div>
  );
}

function CertMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#888] mb-1">
        {label}
      </p>
      <p className="text-sm text-[#f0e0d1] font-mono">{value}</p>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-[#f59e0b]" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#f59e0b]">
        {label}
      </span>
    </div>
  );
}

function shorten(str: string | undefined | null, maxLen: number) {
  if (!str) return "—";
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return str.slice(0, half) + "..." + str.slice(-half);
}
