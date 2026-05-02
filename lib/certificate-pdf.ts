import { jsPDF } from "jspdf";

/** Datos necesarios para generar el certificado PDF. */
export interface CertificatePdfData {
  tokenId?: string;
  contractAddress?: string;
  wallet?: string;
  prompt: string;
  model: string;
  merkleRoot?: string;
  sequenceNumber?: string;
  storageTxHash?: string;
  mintTxHash?: string;
  submissionUrl?: string;
  nftUrl?: string;
  imageUrl?: string;
  timestamp?: string;
}

/**
 * Descarga una imagen desde una URL y la convierte a data URL base64.
 * Soporta data: URLs y URLs http(s).
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    // Si ya es data URL, usarla directamente
    if (url.startsWith("data:")) return url;

    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Trunca texto largo para que entre en el PDF. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

/** Dibuja una línea horizontal fina. */
function hline(doc: jsPDF, y: number, margin = 15) {
  doc.setDrawColor(100, 100, 120);
  doc.setLineWidth(0.3);
  doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
}

/** Dibuja una fila de metadata (label | value). */
function metaRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  margin = 18,
  labelWidth = 42,
  pageWidth = 210
) {
  const valueMaxWidth = pageWidth - margin - labelWidth - margin;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 120);
  doc.text(label, margin, y);
  doc.setTextColor(30, 30, 40);
  const lines = doc.splitTextToSize(value, valueMaxWidth);
  doc.text(lines, margin + labelWidth, y);
  return Math.max(lines.length * 4, 4);
}

/**
 * Genera y descarga un certificado de autenticidad en PDF.
 * Diseñado como documento formal con fines probatorios legales.
 */
export async function downloadCertificatePdf(data: CertificatePdfData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth(); // 210mm
  const ph = doc.internal.pageSize.getHeight(); // 297mm
  const m = 15; // margen
  let y = 20;

  // ── Borde exterior ──
  doc.setDrawColor(60, 50, 140);
  doc.setLineWidth(0.8);
  doc.roundedRect(m - 3, 12, pw - (m - 3) * 2, ph - 24, 3, 3, "S");

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 50, 140);
  doc.setFontSize(22);
  doc.text("ChainRight", pw / 2, y, { align: "center" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 140);
  doc.text("Verifiable AI-Generated Image Provenance on 0G Network", pw / 2, y, { align: "center" });
  y += 8;

  hline(doc, y);
  y += 6;

  // ── Título ──
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 35, 90);
  doc.setFontSize(16);
  doc.text("CERTIFICATE OF AUTHENTICITY", pw / 2, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  doc.text("This document certifies the on-chain provenance of an AI-generated artwork.", pw / 2, y, { align: "center" });
  y += 8;

  // ── Imagen ──
  if (data.imageUrl) {
    const imgBase64 = await loadImageAsBase64(data.imageUrl);
    if (imgBase64) {
      const imgW = 55;
      const imgH = 55;
      try {
        doc.addImage(imgBase64, "PNG", pw / 2 - imgW / 2, y, imgW, imgH, undefined, "FAST");
        y += imgH + 6;
      } catch {
        // Si falla la imagen, seguimos sin ella
        y += 4;
      }
    }
  }

  // ── Metadata Table ──
  hline(doc, y);
  y += 5;

  const rows: [string, string][] = [
    ["Token ID", data.tokenId || "-"],
    ["Contract Address", data.contractAddress || "-"],
    ["Creator Wallet", data.wallet || "-"],
    ["AI Model", data.model || "-"],
    ["Prompt", truncate(data.prompt || "", 140)],
    ["Merkle Root", data.merkleRoot || "-"],
    ["Sequence Number (txSeq)", data.sequenceNumber || "-"],
    ["Storage Tx Hash", data.storageTxHash || "-"],
    ["Mint Tx Hash", data.mintTxHash || "-"],
    ["Minted At", data.timestamp || "-"],
    ["Network", "0G Galileo Testnet (Chain ID: 16602)"],
  ];

  for (const [label, value] of rows) {
    if (y > ph - 40) {
      doc.addPage();
      y = 20;
    }
    y += metaRow(doc, y, label, value, m, 42, pw) + 1;
  }

  y += 4;
  hline(doc, y);
  y += 5;

  // ── Verification Section ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 35, 90);
  doc.text("Verification", m, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const verifyRows: string[] = [];
  if (data.nftUrl) {
    verifyRows.push(`NFT on ChainScan: ${data.nftUrl}`);
  }
  if (data.submissionUrl) {
    verifyRows.push(`Storage Submission: ${data.submissionUrl}`);
  }
  if (data.mintTxHash) {
    verifyRows.push(`Mint Transaction: https://chainscan-galileo.0g.ai/tx/${data.mintTxHash}`);
  }

  for (const row of verifyRows) {
    const lines = doc.splitTextToSize(row, pw - m * 2);
    doc.setTextColor(60, 50, 140);
    doc.text(lines, m, y);
    y += lines.length * 4 + 1;
  }

  y += 4;
  hline(doc, y);
  y += 5;

  // ── Disclaimer ──
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 150);
  const disclaimer = [
    "This certificate is generated from immutable on-chain data stored on the 0G Network blockchain.",
    "The Merkle Root and Sequence Number are cryptographically verifiable through 0G Storage.",
    "ChainRight provides this document for informational and evidentiary purposes.",
    `Generated: ${new Date().toISOString()}`,
  ];
  for (const line of disclaimer) {
    if (y > ph - 12) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, m, y);
    y += 3.5;
  }

  // ── Footer ──
  y = ph - 14;
  hline(doc, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 50, 140);
  doc.text("ChainRight — Verifiable AI Provenance", pw / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 140);
  doc.text("chainright.xyz | 0G Network | Galileo Testnet", pw / 2, y, { align: "center" });

  // ── Descargar ──
  const filename = `chainright-certificate-${data.tokenId || data.merkleRoot?.slice(2, 10) || "unknown"}.pdf`;
  doc.save(filename);
}
