"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  actionGenerateImage,
  actionGenerateImageWithFallback,
  actionMintNFT,
  actionEditImage,
  actionMintProvenanceWithChain,
} from "@/app/actions";
import { cn } from "@/lib/utils";
import { ComputeStatus } from "@/components/compute-status";
import type {
  ImageGenerationResult,
  StorageUploadResult,
  MintResult,
} from "@/lib/types";
import type { DbWork } from "@/lib/db";
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
  Upload,
  ImageIcon,
  FileText,
  Monitor,
  ScanLine,
  Fingerprint,
} from "lucide-react";

/**
 * Página para crear y mintear una obra con procedencia.
 * Diseño adaptado de Stitch — Black & Amber Edition.
 * Client Component.
 */
export default function CreatePage() {
  const { address } = useAccount();
  const [mode, setMode] = useState<"register" | "generate" | null>(null);
  const [step, setStep] = useState<
    | "select"
    | "upload"
    | "uploading"
    | "prompt"
    | "generating"
    | "generated"
    | "stored"
    | "minting"
    | "done"
    | "edit_prompt"  // choosing to edit with AI
    | "editing"       // AI editing in progress
    | "edited"        // edited image ready
    | "storing_edit"  // storing edited image
    | "stored_edit"    // edited image stored, ready to mint
    | "minting_edit"  // minting edited NFT
    | "done_edit"     // dual certificate
  >("select");
  const [prompt, setPrompt] = useState("");
  const [imageResult, setImageResult] = useState<ImageGenerationResult | null>(null);
  const [storageResult, setStorageResult] = useState<StorageUploadResult | null>(null);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState(false);
  // Mode 1: Register Only state
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadFileData, setUploadFileData] = useState<Uint8Array | null>(null);
  // Mode 2: AI Edit state
  const [editPrompt, setEditPrompt] = useState("");
  const [editResult, setEditResult] = useState<ImageGenerationResult | null>(null);
  const [editStorageResult, setEditStorageResult] = useState<StorageUploadResult | null>(null);
  // Edit from /my-works
  const [editFromGallery, setEditFromGallery] = useState<{ imageUrl: string; workId: string; tokenId: string } | null>(null);
  const [originalTokenId, setOriginalTokenId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load work from /my-works for AI Edit
  useEffect(() => {
    const editWorkId = searchParams.get("editWorkId");
    if (!editWorkId || !address) return;

    async function loadWork() {
      try {
        const res = await fetch(`/api/works?wallet=${address}`);
        const json = await res.json();
        if (!json.success) return;
        const works: DbWork[] = json.works;
        const work = works.find((w: DbWork) => w.id === editWorkId);
        if (!work || !work.imageDataUrl) return;

        let imageUrl = work.imageDataUrl;

        // If it's a StorageScan URL (not directly displayable), download via API
        if (imageUrl.includes("storagescan") && imageUrl.includes("#/file/")) {
          const merkleRoot = work.merkleRoot || imageUrl.split("#/file/")[1];
          if (merkleRoot) {
            const dlRes = await fetch("/api/storage/download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ merkleRoot }),
            });
            const dlJson = await dlRes.json();
            if (dlJson.success) {
              imageUrl = dlJson.dataUrl;
            }
          }
        }
        // If it's a regular HTTP URL (not base64), fetch and convert
        else if (imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
          const resp = await fetch(imageUrl);
          const blob = await resp.blob();
          imageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }

        setUploadPreviewUrl(imageUrl);
        setEditFromGallery({
          imageUrl,
          workId: work.id,
          tokenId: work.tokenId || "",
        });
        // Populate storageResult and mintResult from the original work
        // so handleMintEdit can access merkleRootOriginal and parentTokenId
        setStorageResult({
          success: true,
          merkleRoot: work.merkleRoot,
          transactionHash: work.storageTxHash,
          sequenceNumber: work.sequenceNumber,
          submissionUrl: work.submissionUrl,
          fileStorageUrl: work.fileStorageUrl,
        });
        setMintResult({
          success: true,
          tokenId: work.tokenId ? BigInt(work.tokenId) : undefined,
          transactionHash: work.mintTxHash,
          merkleRoot: work.merkleRoot,
        });
        setOriginalTokenId(work.tokenId || null);
        setMode("register");
        setStep("edit_prompt");
      } catch (e) {
        console.error("Failed to load work for edit:", e);
      }
    }

    loadWork();
  }, [searchParams, address]);

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

      let result: MintResult;

      if (mode === "register") {
        // Mode 1: mint with actionMintProvenanceWithChain (model: "none", no parent)
        result = await actionMintProvenanceWithChain(
          storageResult.merkleRoot,
          "",          // merkleRootOriginal — none, this is the original
          "",          // zkResKey — none, no AI
          "",          // prompt — none, no AI
          "none",      // model — explicitly "none"
          storageResult.sequenceNumber || "",
          BigInt(0),   // parentTokenId — 0, no parent
        );
      } else {
        // Mode 2: existing generate flow
        result = await actionMintNFT(
          storageResult.merkleRoot,
          imageResult.zkResKey,
          imageResult.prompt,
          imageResult.model,
          storageResult.sequenceNumber || ""
        );
      }

      if (!result.success) {
        setError(result.error || "Error minting NFT");
        setStep("stored");
        return;
      }

      setMintResult(result);
      setOriginalTokenId(result.tokenId?.toString() || null);

      await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          title: mode === "register" ? "Original Artwork" : "Artwork generated on ChainRight",
          prompt: imageResult.prompt || "Original Work (no AI)",
          source: mode === "register" ? "upload" : (imageResult.source || "0g-compute"),
          model: imageResult.model,
          imageDataUrl: mode === "register" ? (uploadPreviewUrl || storageResult.fileStorageUrl || "") : (imageResult.imageUrl || ""),
          merkleRoot: storageResult.merkleRoot,
          storageTxHash: storageResult.transactionHash,
          sequenceNumber: storageResult.sequenceNumber,
          submissionUrl: storageResult.submissionUrl,
          fileStorageUrl: storageResult.fileStorageUrl,
          tokenId: result.tokenId?.toString(),
          mintTxHash: result.transactionHash,
          status: "minted",
          contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
          mode: "original",
        }),
      });

      setStep("done");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setStep("stored");
    }
  }

  // ============ Mode 1: Register Original ============

  async function handleRegisterUpload() {
    if (!uploadFileData) return;
    setError(null);
    setStep("uploading");

    try {
      const blob = new Blob([uploadFileData as BlobPart]);
      const ext = blob.type.includes("jpeg") ? "jpeg" : blob.type.includes("webp") ? "webp" : "png";
      const form = new FormData();
      form.append("file", new File([blob], `original.${ext}`, { type: blob.type || `image/${ext}` }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const apiResp = await fetch("/api/storage/upload", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await apiResp.json();

      if (!result.success) {
        setError(result.error || "Error uploading to Storage");
        setStep("upload");
        return;
      }

      setStorageResult(result);
      setImageResult({
        success: true,
        imageUrl: uploadPreviewUrl || "",
        imageData: uploadFileData,
        zkResKey: "",
        providerAddress: "",
        model: "none",
        prompt: "",
      });
      setStep("stored");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setStep("upload");
    }
  }

  // ============ Mode 2: AI Edit ============

  async function handleEditWithAI() {
    if (!editPrompt.trim() || !uploadPreviewUrl) return;

    setError(null);
    setStep("editing");

    try {
      let imageToSend = uploadPreviewUrl;

      // Si la imagen viene de StorageScan (URL http), descargarla primero
      if (uploadPreviewUrl.startsWith("http")) {
        const resp = await fetch(uploadPreviewUrl);
        const blob = await resp.blob();
        imageToSend = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(blob);
        });
      }

      const result = await actionEditImage(imageToSend, editPrompt);

      if (!result.success) {
        setError(result.error || "Error editing image");
        setStep("done");
        return;
      }

      setEditResult(result);
      setStep("edited");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setStep("done");
    }
  }

  async function handleStoreEdit() {
    if (!editResult || !editResult.imageUrl) return;
    setError(null);
    setStep("storing_edit");

    try {
      const resp = await fetch(editResult.imageUrl);
      const blob = await resp.blob();
      const ext = blob.type.includes("jpeg") ? "jpeg" : blob.type.includes("webp") ? "webp" : "png";
      const form = new FormData();
      form.append("file", new File([blob], `edited.${ext}`, { type: blob.type || `image/${ext}` }));

      const apiResp = await fetch("/api/storage/upload", { method: "POST", body: form });
      const result = await apiResp.json();

      if (!result.success) {
        setError(result.error || "Error uploading edited image");
        setStep("edited");
        return;
      }

      setEditStorageResult(result);
      setStep("stored_edit");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setStep("edited");
    }
  }

  async function handleMintEdit() {
    if (!editStorageResult || !editResult || !storageResult) return;

    setError(null);
    setStep("minting_edit");

    try {
      const result = await actionMintProvenanceWithChain(
        editStorageResult.merkleRoot!,
        storageResult.merkleRoot!,          // merkleRootOriginal
        editResult.zkResKey,                // ZG-Res-Key del edit
        editPrompt,                         // edit prompt
        editResult.model,                   // model
        editStorageResult.sequenceNumber || "",
        BigInt(originalTokenId || mintResult?.tokenId?.toString() || "0"),  // parentTokenId
      );

      if (!result.success) {
        setError(result.error || "Error minting edited NFT");
        setStep("stored_edit");
        return;
      }

      await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          title: `AI-Edited: ${editPrompt.slice(0, 40)}`,
          prompt: editPrompt || "AI-Edited version",
          source: "0g-compute",
          model: editResult.model,
          imageDataUrl: editResult.imageUrl || editStorageResult.fileStorageUrl || "",
          merkleRoot: editStorageResult.merkleRoot,
          storageTxHash: editStorageResult.transactionHash,
          sequenceNumber: editStorageResult.sequenceNumber,
          submissionUrl: editStorageResult.submissionUrl,
          fileStorageUrl: editStorageResult.fileStorageUrl,
          tokenId: result.tokenId?.toString(),
          mintTxHash: result.transactionHash,
          status: "minted",
          contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
          mode: "ai-assist",
          parentTokenId: originalTokenId || mintResult?.tokenId?.toString(),
          editPrompt: editPrompt,
          merkleRootOriginal: storageResult.merkleRoot,
        }),
      });

      setMintResult(result);
      setStep("done_edit");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setStep("stored");
    }
  }

  // ============ Reset ============

  function handleReset() {
    setMode(null);
    setStep("select");
    setPrompt("");
    setImageResult(null);
    setStorageResult(null);
    setMintResult(null);
    setError(null);
    setUploadPreviewUrl(null);
    setUploadFileData(null);
    setEditPrompt("");
    setEditResult(null);
    setEditStorageResult(null);
    setEditFromGallery(null);
    setOriginalTokenId(null);
  }

  function handleCopyHash(hash: string) {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }

  const stepsConfig = [
    { key: mode === "register" ? "upload" : "prompt", label: mode === "register" ? "UPLOAD" : "PROMPT" },
    { key: "store", label: "STORE" },
    { key: "mint", label: "MINT" },
  ];

  function getStepStatus(stepLabel: string) {
    const order = ["upload", "prompt", "store", "mint"];
    const currentMap: Record<string, number> = {
      select: -1,
      upload: 0,
      uploading: 0,
      prompt: mode === "register" ? 0 : 0,
      generating: mode === "register" ? 1 : 1,
      generated: mode === "register" ? 1 : 1,
      stored: 2,
      minting: 3,
      done: 3,
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
          Register Artwork
        </h1>
        <p className="text-[#888888] text-lg">
          Certify your work. With or without AI.
        </p>
      </div>

      {/* 0G Compute Status Panel */}
      <div className="mb-12">
        <ComputeStatus />
      </div>

      {/* Mode Selection */}
      {step === "select" && !mode && (
        <div className="space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mode 1: Register Original */}
            <button
              onClick={() => { setMode("register"); setStep("upload"); }}
              className="bg-[#141414] border border-white/5 p-12 text-left group transition-all duration-300 hover:bg-[#1e1e1e] hover:border-[#f59e0b]/20 text-left"
            >
              <Upload className="w-10 h-10 text-[#f59e0b] mb-6" strokeWidth={1.5} />
              <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f5f5f5] mb-3">
                Register Original
              </h2>
              <p className="text-[#888] leading-relaxed mb-4">
                Upload an existing artwork to certify its creation date,
                creator, and cryptographic fingerprint on-chain.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
                <span>No AI involved</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            {/* Mode 2: Generate with AI */}
            <button
              onClick={() => { setMode("generate"); setStep("prompt"); }}
              className="bg-[#141414] border border-white/5 p-12 text-left group transition-all duration-300 hover:bg-[#1e1e1e] hover:border-[#f59e0b]/20"
            >
              <Sparkles className="w-10 h-10 text-[#f59e0b] mb-6" strokeWidth={1.5} />
              <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f5f5f5] mb-3">
                Generate with AI
              </h2>
              <p className="text-[#888] leading-relaxed mb-4">
                Create a brand new image using AI, then certify it with
                full provenance on the 0G blockchain.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
                <span>0G Compute + Flux Turbo</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#555] text-center">
            Powered by 0G Chain · 0G Storage · 0G Compute
          </p>
        </div>
      )}

      {/* Step Indicator */}
      {mode && (
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
      )}

      {/* Error */}
      {error && (
        <div className="bg-[#93000a]/10 border border-[#ffb4ab]/20 p-4 mb-8">
          <p className="text-[#ffb4ab] text-sm">{error}</p>
        </div>
      )}

      {/* ============ Mode 1: Upload Original Image ============ */}
      {step === "upload" && mode === "register" && (
        <div>
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setUploadPreviewUrl(ev.target?.result as string);
                  file.arrayBuffer().then((buf) => setUploadFileData(new Uint8Array(buf)));
                };
                reader.readAsDataURL(file);
              }}
              className="hidden"
            />
            {!uploadPreviewUrl ? (
              <div className="flex flex-col items-center text-center space-y-6">
                <ImageIcon className="w-16 h-16 text-[#a08e7a] group-hover:text-[#f59e0b] transition-colors" strokeWidth={1} />
                <div className="space-y-2">
                  <p className="text-lg text-[#f0e0d1]">Click to upload your original artwork</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#a08e7a]">PNG, JPG, WEBP</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img src={uploadPreviewUrl} alt="Uploaded" className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <div className="absolute inset-0 border border-transparent group-hover:border-[#f59e0b]/20 transition-all pointer-events-none" />
          </div>

          {uploadPreviewUrl && (
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 pt-8">
              <div className="flex items-center gap-4">
                <Fingerprint className="w-5 h-5 text-[#888]" strokeWidth={1.5} />
                <p className="text-sm text-[#888]">SHA-256 + Merkle Tree will be computed</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => { setUploadPreviewUrl(null); setUploadFileData(null); }}
                  className="text-[#888] font-medium px-6 py-3 hover:text-[#f0e0d1] transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={handleRegisterUpload}
                  className="bg-[#f59e0b] text-[#0a0a0a] font-medium px-10 py-4 flex items-center gap-3 transition-all duration-300 active:scale-95 hover:bg-[#ffb95f]"
                >
                  <CloudUpload className="w-5 h-5" />
                  Register on 0G Storage
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ Step 1: Prompt (AI Generate) ============ */}
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
        <div className="bg-[#141414] p-16 md:p-24">
          <Loader2 className="w-12 h-12 text-[#f59e0b] mx-auto mb-8 animate-spin" />
          <p className="text-lg text-[#f0e0d1] font-medium mb-8 text-center">Generating your image...</p>

          <div className="max-w-sm mx-auto space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-[#f5f5f5]">Compute account verified</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="w-4 h-4 text-[#f59e0b] animate-spin" />
              <span className="text-[#f5f5f5]">Checking provider sub-account balance...</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-[#333]" />
              <span className="text-[#555]">Executing inference (Flux Turbo)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-[#333]" />
              <span className="text-[#555]">Processing TEE response</span>
            </div>
          </div>

          <p className="text-xs text-[#555] text-center mt-8">
            Est. cost: ~0.002 0G per inference · Provider min: 1.0 0G (auto-transferred when low)
          </p>
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

      {/* ============ Loading: Uploading to 0G Storage ============ */}
      {step === "uploading" && (
        <div className="bg-[#141414] p-16 md:p-24 text-center">
          <Loader2 className="w-12 h-12 text-[#f59e0b] mx-auto mb-6 animate-spin" />
          <p className="text-lg text-[#f0e0d1] font-medium mb-2">
            {mode === "register" ? "Registering on 0G Storage..." : "Storing on 0G Storage..."}
          </p>
          <p className="text-sm text-[#888]">
            {mode === "register" ? "Generating Merkle Root" : "Generating Merkle Root"}
          </p>
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

      {/* ============ Stored Edit: Ready to mint edited version ============ */}
      {step === "stored_edit" && editStorageResult && editResult && (
        <div className="space-y-8">
          {/* Success Banner */}
          <div className="bg-[#141414] p-6 border-l-2 border-[#8fd5ff]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#8fd5ff] mb-1">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Edited image stored on 0G Storage
                </p>
                <code className="text-xs text-[#555] font-mono">
                  MERKLE: {editStorageResult.merkleRoot ? editStorageResult.merkleRoot.slice(0, 20) : "N/A"}...
                </code>
              </div>
              <CloudCheck className="w-6 h-6 text-[#555]" />
            </div>
          </div>

          {/* Edited Image Preview */}
          <div className="bg-[#141414] overflow-hidden">
            <div className="aspect-[16/10] overflow-hidden">
              {editResult.imageUrl && (
                <img
                  src={editResult.imageUrl}
                  alt="Edited artwork"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-6">
              <p className="text-sm text-[#888] italic">&ldquo;{editPrompt}&rdquo;</p>
            </div>
          </div>

          {/* Provenance Data */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8fd5ff] mb-6">
              EDIT PROVENANCE DATA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <ProvenanceRow label="AI Model" value={editResult.model} />
              <ProvenanceRow label="ZG-Res-Key" value={editResult.zkResKey ? shorten(editResult.zkResKey, 16) : "N/A"} mono />
              <ProvenanceRow label="Provider" value={editResult.providerAddress ? shorten(editResult.providerAddress, 16) : "N/A"} mono />
              <ProvenanceRow label="Based on" value={`Original NFT #${originalTokenId || "?"}`} />
            </div>
          </div>

          {/* Mint Section */}
          <div className="space-y-6 pt-6 border-t border-white/5">
            <div>
              <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f5f5f5] mb-2">
                Mint Edited Version
              </h2>
              <p className="text-[#888] text-sm">
                Register the AI-edited version on-chain, linked to the original work.
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <button
                onClick={handleMintEdit}
                className="bg-[#f59e0b] text-[#2a1700] font-medium px-8 py-4 flex items-center gap-3 hover:bg-[#ffb95f] transition-all"
              >
                <Coins className="w-5 h-5" />
                Mint Edited NFT
              </button>
              <button
                onClick={() => setStep("edited")}
                className="text-[#888] font-medium px-6 py-4 hover:text-[#f0e0d1] transition-colors"
              >
                ← Back
              </button>
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

          {/* AI Edit Option — after registering or when editing from gallery */}
          {((mode === "register" && step === "done") || editFromGallery) && (
            <div className="mt-16 border-t border-white/5 pt-12">
              <div className="bg-[#1e1e1e] p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-[#f59e0b]" strokeWidth={1.5} />
                  <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#f5f5f5]">
                    Edit with AI
                  </h3>
                </div>
                <p className="text-sm text-[#888] mb-6 leading-relaxed">
                  Create an AI-enhanced version of your original artwork using 0G Compute
                  (qwen-image-edit-2511). The edited version will be linked to this original via on-chain provenance.
                </p>
                <div className="mb-6">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#888] mb-3">
                    Edit Prompt
                  </label>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder='e.g. "make it cyberpunk style with neon lights", "add dramatic lighting", "turn it into watercolor"...'
                    rows={3}
                    className="w-full bg-[#0a0a0a] border-none text-[#f5f5f5] text-sm p-4 placeholder-[#555] resize-none focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleEditWithAI}
                  disabled={!editPrompt.trim()}
                  className={cn(
                    "bg-[#f59e0b] text-[#0a0a0a] font-medium px-8 py-3 flex items-center gap-3 transition-all",
                    editPrompt.trim() ? "hover:opacity-90 active:scale-95" : "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  Edit with AI
                </button>
              </div>
            </div>
          )}

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

      {/* ============ AI Edit: Edit Prompt (from /my-works or after register) ============ */}
      {step === "edit_prompt" && uploadPreviewUrl && (
        <div className="space-y-8">
          <button
            onClick={() => router.push("/my-works")}
            className="flex items-center gap-2 text-[#888] hover:text-[#f0e0d1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Works
          </button>

          <div className="bg-[#141414] p-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-[#f59e0b]" strokeWidth={1.5} />
              <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#f5f5f5]">
                Edit with AI
              </h3>
            </div>

            {/* Original image preview */}
            <div className="aspect-[16/10] overflow-hidden bg-[#0a0a0a] mb-8">
              <img
                src={uploadPreviewUrl}
                alt="Original artwork"
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-sm text-[#888] mb-6 leading-relaxed">
              {editFromGallery
                ? "Describe how you want to modify this artwork. The edited version will be linked to the original on-chain."
                : "Create an AI-enhanced version of your original artwork using 0G Compute (qwen-image-edit-2511). The edited version will be linked to this original via on-chain provenance."}
            </p>

            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#888] mb-3">
                Edit Prompt
              </label>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder='e.g. "make it cyberpunk style with neon lights", "add dramatic lighting", "turn it into watercolor"...'
                rows={4}
                className="w-full bg-[#0a0a0a] border-none text-[#f5f5f5] text-sm p-4 placeholder-[#555] resize-none focus:outline-none"
              />
            </div>

            {/* Cost estimate */}
            <div className="mb-6 bg-[#1a1a1a] border border-[#f59e0b]/10 px-4 py-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
                  Estimated Cost
                </span>
              </div>
              <div className="text-xs text-[#888] space-y-1">
                <p>Provider transfer: <span className="text-[#f5f5f5] font-mono">1.0 0G</span> (auto-transferred when sub-account &lt; 0.5 0G)</p>
                <p>Per inference: <span className="text-[#f5f5f5] font-mono">~0.002 0G</span> (consumed from sub-account)</p>
                <p className="text-[#555] mt-2">
                  Funds are automatically transferred from your compute ledger only when needed. No manual action required.
                </p>
              </div>
            </div>

            <button
              onClick={handleEditWithAI}
              disabled={!editPrompt.trim()}
              className={cn(
                "bg-[#f59e0b] text-[#0a0a0a] font-medium px-8 py-3 flex items-center gap-3 transition-all",
                editPrompt.trim() ? "hover:opacity-90 active:scale-95" : "opacity-40 cursor-not-allowed"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Edit with AI
            </button>
          </div>
        </div>
      )}

      {/* ============ AI Edit: Editing ============ */}
      {step === "editing" && (
        <div className="bg-[#141414] p-16 md:p-24">
          <Loader2 className="w-12 h-12 text-[#f59e0b] mx-auto mb-8 animate-spin" />
          <p className="text-lg text-[#f0e0d1] font-medium mb-8 text-center">Editing with AI...</p>

          {/* Step-by-step progress */}
          <div className="max-w-sm mx-auto space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-[#f5f5f5]">Compute account verified</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="w-4 h-4 text-[#f59e0b] animate-spin" />
              <span className="text-[#f5f5f5]">Checking provider sub-account balance...</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-[#333]" />
              <span className="text-[#555]">Executing inference (qwen-image-edit-2511)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-[#333]" />
              <span className="text-[#555]">Processing TEE response</span>
            </div>
          </div>

          <p className="text-xs text-[#555] text-center mt-8">
            Est. cost: ~0.002 0G per inference · Provider min: 1.0 0G (auto-transferred when low)
          </p>
        </div>
      )}

      {/* ============ AI Edit: Edited Image ============ */}
      {step === "edited" && editResult && (
        <div className="space-y-8">
          <div className="bg-[#141414] overflow-hidden transition-all duration-500 group">
            <div className="aspect-[16/10] overflow-hidden">
              {editResult.imageUrl && (
                <img
                  src={editResult.imageUrl}
                  alt="Edited artwork"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-8">
              <p className="text-sm text-[#888] italic leading-relaxed">
                &ldquo;{editPrompt}&rdquo;
              </p>
            </div>
          </div>

          <div className="mb-16">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#f59e0b] mb-8">
              EDIT PROVENANCE DATA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <ProvenanceRow label="AI Model" value={editResult.model} />
              <ProvenanceRow label="ZG-Res-Key" value={editResult.zkResKey ? shorten(editResult.zkResKey, 16) : "N/A"} mono />
              <ProvenanceRow label="Provider" value={editResult.providerAddress ? shorten(editResult.providerAddress, 16) : "N/A"} mono />
              <ProvenanceRow label="Based on" value={`Original (Merkle Root: ${storageResult?.merkleRoot?.slice(0, 16)}...)`} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-[#222]">
            <button
              onClick={() => setStep("done")}
              className="flex items-center gap-2 text-[#888] font-medium hover:text-[#f59e0b] transition-colors px-6 py-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex flex-col items-end gap-4 w-full md:w-auto">
              <button
                onClick={handleStoreEdit}
                className="bg-[#f59e0b] text-[#2a1700] font-medium px-10 py-5 flex items-center gap-3 transition-all duration-300 active:scale-95 hover:bg-[#ffb95f] group w-full md:w-auto justify-center"
              >
                <CloudUpload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                Store & Mint Edited Version
              </button>
                <p className="text-[#555] text-[10px] font-semibold uppercase tracking-widest text-right">
                Links to original NFT #{originalTokenId || mintResult?.tokenId?.toString() || "?"}
                </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ AI Edit: Storing Edit ============ */}
      {step === "storing_edit" && (
        <div className="bg-[#141414] p-16 md:p-24 text-center">
          <Loader2 className="w-12 h-12 text-[#f59e0b] mx-auto mb-6 animate-spin" />
          <p className="text-lg text-[#f0e0d1] font-medium mb-2">Storing edited image on 0G...</p>
          <p className="text-sm text-[#888]">Generating Merkle Root · Linking to original</p>
        </div>
      )}

      {/* ============ AI Edit: Minting ============ */}
      {step === "minting_edit" && (
        <div className="bg-[#141414] p-16 md:p-24 text-center">
          <Loader2 className="w-12 h-12 text-[#f59e0b] mx-auto mb-6 animate-spin" />
          <p className="text-lg text-[#f0e0d1] font-medium mb-2">Minting edited version...</p>
          <p className="text-sm text-[#888]">Registering on 0G Chain with parent link</p>
        </div>
      )}

      {/* ============ AI Edit: Done — Dual Certificate ============ */}
      {step === "done_edit" && mintResult && editResult && uploadPreviewUrl && (
        <div className="space-y-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f59e0b] mb-4">
              AI-ASSISTED WORK REGISTERED
            </p>
            <h2 className="font-[family-name:var(--font-newsreader)] text-3xl text-[#f5f5f5] mb-2">
              Creative Chain Complete
            </h2>
            <p className="text-[#888]">
              Original → AI-Edited — both certified on 0G Chain
            </p>
          </div>

          {/* Dual certificate preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#141414] border border-white/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b] mb-4">
                Original Work
              </p>
              <img src={uploadPreviewUrl} alt="Original" className="w-full h-40 object-contain mb-4" />
              <p className="text-sm text-[#888]">Token #{originalTokenId || mintResult?.tokenId?.toString() || "?"}</p>
            </div>
            <div className="bg-[#141414] border border-[#8fd5ff]/20 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8fd5ff] mb-4">
                AI-Edited Version
              </p>
              {editResult.imageUrl && (
                <img src={editResult.imageUrl} alt="Edited" className="w-full h-40 object-contain mb-4" />
              )}
              <p className="text-sm text-[#888]">
                Token #{mintResult?.tokenId?.toString() || "?"} · ↳ based on #{originalTokenId || "?"}
              </p>
            </div>
          </div>

          {/* Action Nav */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8 border-t border-white/5">
            <a href="/my-works" className="flex items-center gap-2 text-[#888] hover:text-[#f0e0d1] transition-all">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">View in My Works</span>
            </a>
            <button
              onClick={handleReset}
              className="bg-[#f59e0b] text-[#0a0a0a] px-12 py-4 font-medium hover:scale-[0.98] transition-transform"
            >
              REGISTER ANOTHER
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
