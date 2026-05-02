"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { cn, formatTimestamp, shortenAddress } from "@/lib/utils";
import type { DbWork } from "@/lib/db";
import { CertificateCard } from "@/components/certificate-card";
import { X, Loader2, ImageOff } from "lucide-react";

/**
 * Modal de detalle de obra — reutiliza CertificateCard al estilo post-mint.
 * Black & Amber Edition.
 */
function WorkDetailModal({
  work,
  onClose,
}: {
  work: DbWork;
  onClose: () => void;
}) {
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
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[#888] transition-colors hover:text-[#f0e0d1] hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
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
        </div>
      </div>
    </div>
  );
}

/**
 * Lista de obras de la wallet conectada (MVP via db.json).
 * Black & Amber Edition.
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

  return (
    <>
      {/* Page Title Section */}
      <section className="mb-16 pt-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
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

      {/* Gallery Grid */}
      {!loading && works.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {works.map((work) => (
            <article
              key={work.id}
              onClick={() => setSelectedWork(work)}
              className="bg-[#1a1a1a] border border-white/5 overflow-hidden group cursor-pointer transition-all duration-300 hover:border-[#f59e0b]/20 hover:bg-[#1e1e1e]"
            >
              <div className="aspect-square overflow-hidden bg-[#0a0a0a]">
                {work.imageDataUrl ? (
                  <img
                    src={work.imageDataUrl}
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
                      "text-[10px] font-semibold uppercase tracking-[0.15em] shrink-0",
                      work.status === "minted"
                        ? "text-[#f59e0b]"
                        : "text-[#8fd5ff]"
                    )}
                  >
                    {work.status}
                  </span>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d8c3ad]/70 line-clamp-2">
                  PROMPT: {work.prompt}
                </p>
                <p className="text-[10px] text-[#a08e7a] uppercase tracking-widest">
                  {work.createdAt
                    ? new Date(work.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Modal de detalle */}
      {selectedWork && (
        <WorkDetailModal work={selectedWork} onClose={() => setSelectedWork(null)} />
      )}
    </>
  );
}
