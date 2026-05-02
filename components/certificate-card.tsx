"use client";

import { useState } from "react";
import { cn, shortenAddress } from "@/lib/utils";
import { downloadCertificatePdf } from "@/lib/certificate-pdf";
import { Download, ExternalLink, CheckCircle2, FileText } from "lucide-react";

interface Props {
  imageUrl?: string;
  wallet?: string;
  prompt: string;
  model: string;
  merkleRoot?: string;
  tokenId?: string;
  txHash?: string;
  contractAddress?: string;
  submissionUrl?: string;
  sequenceNumber?: string;
  /** Hash de la tx de storage (distinto del mint tx hash). */
  storageTxHash?: string;
}

/**
 * Tarjeta de certificado tangible para MVP post-mint.
 * Black & Amber Edition.
 */
export function CertificateCard({
  imageUrl,
  wallet,
  prompt,
  model,
  merkleRoot,
  tokenId,
  txHash,
  contractAddress,
  submissionUrl,
  sequenceNumber,
  storageTxHash,
}: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const explorer = txHash
    ? `https://chainscan-galileo.0g.ai/tx/${txHash}`
    : undefined;

  const nftUrl = contractAddress && tokenId
    ? `https://chainscan-galileo.0g.ai/nft/${contractAddress}/${tokenId}`
    : undefined;

  const storageScanByRoot = merkleRoot
    ? `https://storagescan.0g.ai/#/file/${merkleRoot}`
    : undefined;

  const storageScan = submissionUrl || storageScanByRoot;

  /** Descarga el certificado PDF con toda la metadata. */
  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      await downloadCertificatePdf({
        tokenId,
        contractAddress,
        wallet,
        prompt,
        model,
        merkleRoot,
        sequenceNumber,
        storageTxHash,
        mintTxHash: txHash,
        submissionUrl,
        nftUrl,
        imageUrl,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <section className="bg-[#141414] border border-white/5 p-8 md:p-12">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-[family-name:var(--font-newsreader)] text-[#f5f5f5]">
          Certificate of Authorship
        </h3>
        <span className="flex items-center gap-2 text-xs font-semibold text-[#f59e0b]">
          <CheckCircle2 className="w-4 h-4" />
          Verifiable
        </span>
      </div>

      <div className="grid gap-8 md:grid-cols-[200px,1fr]">
        <div className="overflow-hidden bg-[#0a0a0a] border border-white/5">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Certified artwork"
              className="max-h-60 w-full object-cover"
            />
          ) : (
            <div className="h-48 w-full" />
          )}
        </div>

        <div className="space-y-3 text-sm text-[#d8c3ad]">
          <InfoRow label="Author" value={wallet ? shortenAddress(wallet) : "—"} />
          <InfoRow label="Model" value={model} />
          <InfoRow label="Token ID" value={tokenId || "—"} />
          <InfoRow label="Sequence" value={sequenceNumber || "—"} mono />
          <InfoRow label="Prompt" value={prompt} />

          <div className="pt-3 flex flex-wrap gap-2">
            {explorer && (
              <a
                href={explorer}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors",
                  "bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20 border border-[#f59e0b]/20"
                )}
              >
                <ExternalLink className="w-3 h-3" />
                Ver Tx on ChainScan
              </a>
            )}
            {nftUrl && (
              <a
                href={nftUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors",
                  "bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20 border border-[#f59e0b]/20"
                )}
              >
                <ExternalLink className="w-3 h-3" />
                View NFT on ChainScan
              </a>
            )}
            {submissionUrl && (
              <a
                href={submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors",
                  "bg-[#8fd5ff]/10 text-[#8fd5ff] hover:bg-[#8fd5ff]/20 border border-[#8fd5ff]/20"
                )}
              >
                <ExternalLink className="w-3 h-3" />
                View Submission on StorageScan
              </a>
            )}
            {storageScan && !submissionUrl && (
              <a
                href={storageScan}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors",
                  "bg-[#8fd5ff]/10 text-[#8fd5ff] hover:bg-[#8fd5ff]/20 border border-[#8fd5ff]/20"
                )}
              >
                <ExternalLink className="w-3 h-3" />
                View on StorageScan
              </a>
            )}
          </div>

          {/* Botón de descarga de certificado PDF */}
          <div className="pt-2">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className={cn(
                "w-full px-3 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-2",
                "bg-[#f59e0b] text-[#0a0a0a] hover:opacity-90",
                "disabled:opacity-50 disabled:cursor-wait"
              )}
            >
              <FileText className="w-4 h-4" />
              {pdfLoading ? "Generating PDF..." : "Download Certificate PDF"}
            </button>
          </div>

          <details className="pt-2">
            <summary className="cursor-pointer text-xs text-[#555]">
              Technical Details (hashes)
            </summary>
            <div className="mt-2 space-y-2 border border-white/5 bg-[#0a0a0a] p-3 text-xs">
              <InfoRow label="Merkle Root" value={merkleRoot || "—"} mono />
              <InfoRow label="Tx Hash" value={txHash || "—"} mono />
              <InfoRow label="Sequence Number" value={sequenceNumber || "—"} mono />
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-24 shrink-0 text-[#888]">{label}:</span>
      <span
        className={cn(
          "text-[#f0e0d1]",
          mono && "font-mono text-[11px] break-all"
        )}
      >
        {value}
      </span>
    </div>
  );
}
