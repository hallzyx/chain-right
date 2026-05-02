"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  actionGenerateImage,
  actionGenerateImageWithFallback,
  actionMintNFT,
} from "@/app/actions";
import { cn } from "@/lib/utils";
import type { ImageGenerationResult, StorageUploadResult, MintResult } from "@/lib/types";
import { useAccount } from "wagmi";
import { CertificateCard } from "@/components/certificate-card";

/**
 * Página para crear y mintear una obra con procedencia.
 * Client Component.
 */
export default function CreatePage() {
  const { address } = useAccount();
  const [step, setStep] = useState<"prompt" | "generating" | "generated" | "uploading" | "stored" | "minting" | "done">("prompt");
  const [prompt, setPrompt] = useState("");
  const [imageResult, setImageResult] = useState<ImageGenerationResult | null>(null);
  const [storageResult, setStorageResult] = useState<StorageUploadResult | null>(null);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string>("");

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

  /**
   * Ejecuta fallback OpenAI solo después de consentimiento explícito del usuario.
   */
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

  /**
   * Cancela fallback y mantiene al usuario en el paso de prompt.
   */
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
      // Convertir data URL a Blob y enviar por multipart
      const resp = await fetch(imageResult.imageUrl);
      const blob = await resp.blob();
      const ext = blob.type.includes("jpeg") ? "jpeg" : blob.type.includes("webp") ? "webp" : "png";

      const form = new FormData();
      form.append("file", new File([blob], `chainright.${ext}`, { type: blob.type || `image/${ext}` }));

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

      // Persistir obra en db.json para la sección "Mis Obras"
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
          // Campos para StorageScan
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Create Artwork
        </h1>
        <p className="text-slate-400">
          Generate an AI image, store it on 0G, and mint an NFT with verifiable provenance.
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <StepIndicator active={step === "prompt" || step === "generating" || step === "generated"} done={step === "generated" || step === "stored" || step === "done"} label="Generate" />
        <div className="w-16 h-px bg-slate-700" />
        <StepIndicator active={step === "uploading" || step === "stored"} done={step === "stored" || step === "done"} label="Store" />
        <div className="w-16 h-px bg-slate-700" />
        <StepIndicator active={step === "minting" || step === "done"} done={step === "done"} label="Mint" />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ============ Paso 1: Prompt ============ */}
      {step === "prompt" && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <label className="block text-sm font-medium mb-3 text-slate-300">
            Describe your image
          </label>
          <textarea
            className={cn(
              "w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4",
              "text-slate-100 placeholder:text-slate-600",
              "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50",
              "resize-none"
            )}
            placeholder="e.g. cyberpunk book cover with a programmer looking at the horizon, retro-futuristic style..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className={cn(
              "mt-6 w-full py-4 rounded-xl font-semibold text-lg transition-all",
              prompt.trim()
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            )}
          >
            ✨ Generate Image
          </button>

          <p className="text-xs text-slate-600 mt-4 text-center">
            Power by 0G Compute — Flux Turbo
          </p>
        </div>
      )}

      {/* ============ Loading ============ */}
      {step === "generating" && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-6 animate-pulse">✨</div>
          <p className="text-lg text-slate-300">Generating your image...</p>
          <p className="text-sm text-slate-500 mt-2">0G Compute + Flux Turbo</p>
        </div>
      )}

      {step === "uploading" && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-6 animate-pulse">☁️</div>
          <p className="text-lg text-slate-300">Storing on 0G Storage...</p>
          <p className="text-sm text-slate-500 mt-2">Generating Merkle Root</p>
        </div>
      )}

      {step === "minting" && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-6 animate-pulse">⛓️</div>
          <p className="text-lg text-slate-300">Minting NFT on 0G Chain...</p>
          <p className="text-sm text-slate-500 mt-2">Waiting for block confirmation</p>
        </div>
      )}

      {/* ============ Paso 2: Imagen Generada ============ */}
      {step === "generated" && imageResult && (
        <div className="space-y-8">
          {/* Imagen */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {imageResult.imageUrl && (
              <img
                src={imageResult.imageUrl}
                alt={imageResult.prompt}
                className="w-full h-auto"
              />
            )}
            <div className="p-6">
              <p className="text-slate-400 text-sm mb-4">{imageResult.prompt}</p>
            </div>
          </div>

          {/* Datos de Procedencia */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span>📋</span> Provenance Data
            </h3>
            <div className="space-y-3 text-sm">
              <DataRow label="Model" value={imageResult.model} />
              <DataRow label="ZG-Res-Key" value={imageResult.zkResKey || "(no disponible)"} isHash />
              <DataRow label="Provider" value={imageResult.providerAddress} isHash />
              <DataRow
                label="Source"
                value={
                  imageResult.source === "openai-fallback"
                    ? "OpenAI (fallback with consent)"
                    : "0G Compute"
                }
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className={cn(
                "flex-1 py-4 rounded-xl font-semibold transition-all",
                "border-2 border-slate-700 text-slate-300 hover:border-slate-600"
              )}
            >
              ← Back
            </button>
            <button
              onClick={handleUpload}
              className={cn(
                "flex-1 py-4 rounded-xl font-semibold transition-all",
                "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25"
              )}
            >
              ☁️ Save to 0G Storage
            </button>
          </div>
        </div>
      )}

      {/* ============ Paso 3: Almacenado ============ */}
      {step === "stored" && storageResult && imageResult && (
        <div className="space-y-8">
          {/* Success */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-semibold text-green-400">Successfully stored</p>
          </div>

          {/* Merkle Root */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span>🔐</span> Merkle Root (Your Unique Identifier)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              This is the unique hash of your image. If you change A SINGLE PIXEL, this hash changes completely.
              Save it — it's the only way to retrieve and verify your artwork.
            </p>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
              <code className="text-sm text-cyan-400 break-all">
                {storageResult.merkleRoot}
              </code>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className={cn(
                "flex-1 py-4 rounded-xl font-semibold transition-all",
                "border-2 border-slate-700 text-slate-300 hover:border-slate-600"
              )}
            >
              ← Cancel
            </button>
            <button
              onClick={handleMint}
              className={cn(
                "flex-1 py-4 rounded-xl font-semibold transition-all",
                "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25"
              )}
            >
              ⛓️ Mint NFT
            </button>
          </div>

          <p className="text-xs text-slate-600 text-center">
            Note: You need the contract deployed and configured in .env to mint.
          </p>
        </div>
      )}

      {/* ============ Paso 4: Done ============ */}
      {step === "done" && mintResult && (
        <div className="space-y-8">
          {/* Success */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-10 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">NFT Minted Successfully!</h2>
            <p className="text-slate-400">Your artwork now has verifiable on-chain provenance.</p>
          </div>

           {/* Resultado tangible */}
           <CertificateCard
             imageUrl={imageResult?.imageUrl}
             wallet={address}
             prompt={imageResult?.prompt || ""}
             model={imageResult?.model || ""}
             merkleRoot={mintResult.merkleRoot}
             tokenId={mintResult.tokenId?.toString()}
             txHash={mintResult.transactionHash}
             contractAddress={process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}
             submissionUrl={storageResult?.submissionUrl}
             sequenceNumber={storageResult?.sequenceNumber}
             storageTxHash={storageResult?.transactionHash}
           />

          <a
            href="/my-works"
            className={cn(
              "block w-full py-3 rounded-xl text-center text-sm font-semibold",
              "border border-indigo-500/30 text-indigo-200 hover:border-violet-400 hover:text-violet-200 transition-all"
            )}
          >
            View in My Works
          </a>

          <button
            onClick={handleReset}
            className={cn(
              "w-full py-4 rounded-xl font-semibold transition-all",
              "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25"
            )}
          >
            🎨 Create Another
          </button>
        </div>
      )}

      {/* Modal de consentimiento de fallback */}
      {showFallbackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg">
            <h3 className="mb-3 text-xl font-semibold text-slate-100">
              No text-to-image providers available on 0G right now
            </h3>
            <p className="mb-4 text-sm text-slate-400">
              {fallbackReason}
            </p>
            <p className="mb-6 text-sm text-slate-300">
              We can use <strong>OpenAI</strong> as a fallback to generate the image,
              then continue with 0G Storage + mint on 0G testnet.
              <br />
              <span className="text-slate-500">
                The fallback only runs if you explicitly accept it.
              </span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelFallback}
                className={cn(
                  "flex-1 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition-all",
                  "hover:border-slate-600"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptFallback}
                className={cn(
                  "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                  "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
                  "hover:from-cyan-400 hover:to-blue-500"
                )}
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

function StepIndicator({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
          done
            ? "bg-green-500 text-white"
            : active
            ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white ring-4 ring-cyan-500/20"
            : "bg-slate-800 text-slate-500 border border-slate-700"
        )}
      >
        {done ? "✓" : label[0]}
      </div>
      <span
        className={cn(
          "text-xs",
          active || done ? "text-slate-300" : "text-slate-600"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function DataRow({
  label,
  value,
  isHash = false,
}: {
  label: string;
  value: string;
  isHash?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-slate-500 flex-shrink-0 w-24">{label}:</span>
      <span
        className={cn(
          "text-slate-300",
          isHash && "font-mono text-xs break-all"
        )}
      >
        {value}
      </span>
    </div>
  );
}
