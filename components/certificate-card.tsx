"use client";

import { cn, shortenAddress } from "@/lib/utils";

interface Props {
  imageUrl?: string;
  wallet?: string;
  prompt: string;
  model: string;
  merkleRoot?: string;
  tokenId?: string;
  txHash?: string;
}

/**
 * Tarjeta de certificado tangible para MVP post-mint.
 */
export function CertificateCard({ imageUrl, wallet, prompt, model, merkleRoot, tokenId, txHash }: Props) {
  const explorer = txHash
    ? `https://chainscan-galileo.0g.ai/tx/${txHash}`
    : undefined;

  const storageScan = merkleRoot
    ? `https://storagescan.0g.ai/#/file/${merkleRoot}`
    : undefined;

  return (
    <section className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#111A38]/90 to-[#1A0F35]/80 p-6 shadow-lg shadow-indigo-900/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-100">Certificado de Autoría</h3>
        <span className="rounded bg-green-500/15 px-2 py-1 text-xs font-semibold text-green-400">✅ Verificable</span>
      </div>

      <div className="grid gap-6 md:grid-cols-[200px,1fr]">
        <div className="overflow-hidden rounded-xl border border-indigo-500/20 bg-[#070B1A]">
          {imageUrl ? (
            <img src={imageUrl} alt="Obra certificada" className="h-full w-full object-cover" />
          ) : (
            <div className="h-48 w-full" />
          )}
        </div>

        <div className="space-y-3 text-sm text-slate-300">
          <InfoRow label="Autor" value={wallet ? shortenAddress(wallet) : "-"} />
          <InfoRow label="Modelo" value={model} />
          <InfoRow label="Token ID" value={tokenId || "-"} />
          <InfoRow label="Prompt" value={prompt} />

          <div className="pt-3 flex flex-wrap gap-2">
            {explorer && (
              <a
                href={explorer}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold",
                  "bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30"
                )}
              >
                Ver Tx en ChainScan
              </a>
            )}
            {storageScan && (
              <a
                href={storageScan}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold",
                  "bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
                )}
              >
                Ver en StorageScan
              </a>
            )}
          </div>

          <details className="pt-2">
            <summary className="cursor-pointer text-xs text-slate-500">Detalles técnicos (hashes)</summary>
            <div className="mt-2 space-y-2 rounded-lg border border-slate-700/50 bg-[#070B1A]/70 p-3 text-xs">
              <InfoRow label="Merkle Root" value={merkleRoot || "-"} mono />
              <InfoRow label="Tx Hash" value={txHash || "-"} mono />
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-24 shrink-0 text-slate-500">{label}:</span>
      <span className={cn("text-slate-200", mono && "font-mono text-[11px] break-all")}>{value}</span>
    </div>
  );
}
