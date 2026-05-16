"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { cn, shortenAddress } from "@/lib/utils";
import type { DbWork } from "@/lib/db";
import { CertificateCard } from "@/components/certificate-card";
import { useRouter } from "next/navigation";
import { X, Loader2, ImageOff, ExternalLink, Sparkles } from "lucide-react";

/**
 * Modal de detalle de obra — muestra certificado.
 * Para obras AI-Assist, muestra ambos (editado + original).
 */
function WorkDetailModal({
  work,
  onClose,
}: {
  work: DbWork;
  onClose: () => void;
}) {
  const isAiAssist = work.mode === "ai-assist";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/90 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden bg-[#141414] border border-white/5 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-lg font-[family-name:var(--font-newsreader)] text-[#f5f5f5]">
            Work Details
            {isAiAssist && (
              <span className="ml-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8fd5ff] border border-[#8fd5ff]/30 px-2 py-0.5">
                AI-Assisted
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[#888] transition-colors hover:text-[#f0e0d1] hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Certificate for this work */}
          <CertificateCard
            imageUrl={work.imageDataUrl}
            wallet={work.wallet}
            prompt={work.prompt}
            model={work.model}
            merkleRoot={work.merkleRoot}
            tokenId={work.tokenId?.toString()}
            txHash={work.mintTxHash}
            contractAddress={work.contractAddress}
            submissionUrl={work.submissionUrl}
            sequenceNumber={work.sequenceNumber}
            storageTxHash={work.storageTxHash}
          />

          {/* Parent chain link (for AI-Assisted works) */}
          {isAiAssist && work.parentTokenId && (
            <div className="bg-[#8fd5ff]/5 border border-[#8fd5ff]/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 bg-[#8fd5ff]" />
                <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8fd5ff]">
                  Based on Original Work
                </h3>
              </div>
              <div className="space-y-3 text-sm text-[#d8c3ad]">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-[#888]">Original Token ID</span>
                  <span className="text-[#f0e0d1] font-mono">#{work.parentTokenId}</span>
                </div>
                {work.merkleRootOriginal && (
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-[#888]">Original Merkle Root</span>
                    <span className="text-[#f0e0d1] font-mono text-xs break-all max-w-[200px] text-right">
                      {work.merkleRootOriginal.slice(0, 20)}...
                    </span>
                  </div>
                )}
                <a
                  href={`https://chainscan-galileo.0g.ai/nft/${work.contractAddress}/${work.parentTokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 text-xs font-semibold text-[#8fd5ff] hover:text-[#f59e0b] transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Original NFT on ChainScan
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Card de obra individual.
 */
function WorkCard({ work, onClick }: { work: DbWork; onClick: () => void }) {
  const router = useRouter();
  const isAiAssist = work.mode === "ai-assist";
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Convert StorageScan URLs to displayable base64
  useEffect(() => {
    if (!work.imageDataUrl) return;

    // Already a data URL or direct image
    if (work.imageDataUrl.startsWith("data:") || work.imageDataUrl.startsWith("blob:")) {
      setDisplayUrl(work.imageDataUrl);
      return;
    }

    // StorageScan URL with hash fragment — not directly displayable
    if (work.imageDataUrl.includes("storagescan") && work.imageDataUrl.includes("#/file/")) {
      setLoadingImage(true);
      const merkleRoot = work.merkleRoot || work.imageDataUrl.split("#/file/")[1];
      if (merkleRoot) {
        fetch("/api/storage/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merkleRoot }),
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setDisplayUrl(json.dataUrl);
          })
          .catch(() => setDisplayUrl(null))
          .finally(() => setLoadingImage(false));
      }
      return;
    }

    // Regular HTTP URL — try to fetch and convert
    if (work.imageDataUrl.startsWith("http")) {
      setLoadingImage(true);
      fetch(work.imageDataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => setDisplayUrl(reader.result as string);
          reader.readAsDataURL(blob);
        })
        .catch(() => setDisplayUrl(null))
        .finally(() => setLoadingImage(false));
      return;
    }

    setDisplayUrl(work.imageDataUrl);
  }, [work.imageDataUrl, work.merkleRoot]);

  return (
    <article
      onClick={onClick}
      className="bg-[#1a1a1a] border border-white/5 overflow-hidden group cursor-pointer transition-all duration-300 hover:border-[#f59e0b]/20 hover:bg-[#1e1e1e]"
    >
      <div className="aspect-square overflow-hidden bg-[#0a0a0a]">
        {loadingImage ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#f59e0b] animate-spin" />
          </div>
        ) : displayUrl ? (
          <img
            src={displayUrl}
            alt={work.title}
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
          />
        ) : (
          <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-[#333]" />
          </div>
        )}
      </div>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#f0e0d1] line-clamp-1">
            {work.title}
          </h3>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.15em] shrink-0 px-2 py-0.5",
              isAiAssist
                ? "text-[#8fd5ff] bg-[#8fd5ff]/10 border border-[#8fd5ff]/20"
                : "text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20"
            )}
          >
            {isAiAssist ? "AI-EDIT" : "ORIGINAL"}
          </span>
        </div>

        {/* Prompt row */}
        {work.prompt && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d8c3ad]/70 line-clamp-2">
            {isAiAssist && work.editPrompt
              ? `EDIT: ${work.editPrompt}`
              : `PROMPT: ${work.prompt}`}
          </p>
        )}

        {/* Date + Parent link */}
        <div className="flex items-center justify-between text-[10px] text-[#a08e7a] uppercase tracking-widest">
          <span>
            {work.createdAt
              ? new Date(work.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
          {isAiAssist && work.parentTokenId && (
            <span className="text-[#8fd5ff]/60">↳ based on #{work.parentTokenId}</span>
          )}
        </div>

        {/* Action button: Edit with AI (only for originals) */}
        {!isAiAssist && (
          <div className="pt-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => router.push(`/create?editWorkId=${work.id}`)}
              className="w-full text-xs font-semibold uppercase tracking-widest border border-[#f59e0b]/30 text-[#f59e0b] py-2 px-3 hover:bg-[#f59e0b]/10 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3 h-3" />
              Edit with AI
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Lista de obras de la wallet conectada (MVP via db.json).
 * Dos secciones: Original Works + AI-Assisted Works.
 */
export function MyWorks() {
  const { address, isConnected } = useAccount();
  const [works, setWorks] = useState<DbWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWork, setSelectedWork] = useState<DbWork | null>(null);

  useEffect(() => {
    async function loadWorks() {
      if (!isConnected || !address) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/works?wallet=${address}`);
        const json = await res.json();
        if (json.success) {
          setWorks(json.works || []);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadWorks();
  }, [address, isConnected]);

  if (!isConnected) return null;

  const originalWorks = works.filter((w) => w.mode === "original" || !w.mode);
  const aiWorks = works.filter((w) => w.mode === "ai-assist");

  return (
    <>
      {/* Page Title Section */}
      <section className="mb-16 pt-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <h1 className="font-[family-name:var(--font-newsreader)] text-5xl text-[#f0e0d1]">
              My Works
            </h1>
            {address && (
              <span className="text-sm text-[#a08e7a] border border-[#a08e7a]/30 px-3 py-1 tracking-widest font-mono text-xs">
                {shortenAddress(address)}
              </span>
            )}
          </div>
          <p className="text-lg text-[#d8c3ad] max-w-xl">
            Your tangible history on the blockchain
          </p>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="bg-[#141414] border border-white/5 p-12 text-center">
          <Loader2 className="w-8 h-8 text-[#f59e0b] mx-auto mb-4 animate-spin" />
          <p className="text-sm text-[#888]">Loading works...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && works.length === 0 && (
        <div className="bg-[#141414] border border-white/5 p-16 text-center">
          <ImageOff className="w-12 h-12 text-[#555] mx-auto mb-6" strokeWidth={1.5} />
          <p className="text-[#888] mb-2">You don&apos;t have any saved works yet.</p>
          <p className="text-xs text-[#555] uppercase tracking-widest">
            Create your first artwork to see it here.
          </p>
        </div>
      )}

      {!loading && works.length > 0 && (
        <div className="space-y-20">
          {/* Original Works Section */}
          {originalWorks.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1 h-6 bg-[#f59e0b]" />
                <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f0e0d1]">
                  Original Works
                </h2>
                <span className="text-xs text-[#555] font-mono">×{originalWorks.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {originalWorks.map((work) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    onClick={() => setSelectedWork(work)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* AI-Assisted Works Section */}
          {aiWorks.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1 h-6 bg-[#8fd5ff]" />
                <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#f0e0d1]">
                  AI-Assisted Works
                </h2>
                <span className="text-xs text-[#555] font-mono">×{aiWorks.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {aiWorks.map((work) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    onClick={() => setSelectedWork(work)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal de detalle */}
      {selectedWork && (
        <WorkDetailModal work={selectedWork} onClose={() => setSelectedWork(null)} />
      )}
    </>
  );
}
