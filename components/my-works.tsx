"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { cn, formatTimestamp, shortenAddress } from "@/lib/utils";
import type { DbWork } from "@/lib/db";
import { CertificateCard } from "@/components/certificate-card";

/**
 * Modal de detalle de obra — reutiliza CertificateCard al estilo post-mint.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Detalle de Obra</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
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
           />
         </div>
      </div>
    </div>
  );
}

/**
 * Lista de obras de la wallet conectada (MVP via db.json).
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
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">Mis Obras</h2>
          <span className="text-xs text-slate-500">
            {address ? shortenAddress(address) : ""}
          </span>
        </div>

        {loading && (
          <div className="rounded-xl border border-indigo-500/20 bg-[#111A38]/60 p-4 text-sm text-slate-400">
            Cargando obras...
          </div>
        )}

        {!loading && works.length === 0 && (
          <div className="rounded-xl border border-indigo-500/20 bg-[#111A38]/60 p-6 text-sm text-slate-400">
            Todavía no tenés obras guardadas en este MVP.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => (
            <article
              key={work.id}
              onClick={() => setSelectedWork(work)}
              className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-[#111A38]/70 cursor-pointer transition-all hover:border-indigo-500/40 hover:bg-[#111A38]/90"
            >
              {work.imageDataUrl ? (
                <img
                  src={work.imageDataUrl}
                  alt={work.title}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="h-44 w-full bg-[#070B1A]" />
              )}
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-1 font-semibold text-slate-100">
                  {work.title}
                </h3>
                <p className="line-clamp-2 text-xs text-slate-400">{work.prompt}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {formatTimestamp(
                      Math.floor(new Date(work.createdAt).getTime() / 1000)
                    )}
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5",
                      work.status === "minted"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-indigo-500/10 text-indigo-300"
                    )}
                  >
                    {work.status}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Modal de detalle */}
      {selectedWork && (
        <WorkDetailModal work={selectedWork} onClose={() => setSelectedWork(null)} />
      )}
    </>
  );
}
