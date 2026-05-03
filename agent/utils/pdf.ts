/**
 * Generación de PDF para el bot de Telegram (sin navegador).
 * Usa jsPDF para generar un buffer que luego se envía como documento.
 */
import { jsPDF } from "jspdf";

/** Datos necesarios para el certificado. */
export interface CertData {
  merkleRoot: string;
  creator: string;
  model: string;
  prompt: string;
  sequenceNumber?: string;
  timestamp: string;
  contractAddress?: string;
}

/**
 * Genera el certificado PDF como Buffer (Node.js, sin navegador).
 */
export async function generatePdfBuffer(data: CertData): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth(); // 210mm
  const ph = doc.internal.pageSize.getHeight(); // 297mm
  const m = 15;
  let y = 20;

  // ── Borde ──
  doc.setDrawColor(245, 158, 11); // Amber
  doc.setLineWidth(0.8);
  doc.roundedRect(m - 3, 12, pw - (m - 3) * 2, ph - 24, 3, 3, "S");

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 158, 11);
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

  hline(doc, y);
  y += 5;

  // ── Metadata ──
  const rows: [string, string][] = [
    ["Creator Wallet", truncate(data.creator, 42)],
    ["AI Model", data.model],
    ["Prompt", truncate(data.prompt, 140)],
    ["Merkle Root", truncate(data.merkleRoot, 64)],
    ["Sequence Number", data.sequenceNumber || "—"],
    ["Registered At", data.timestamp],
    ["Network", "0G Galileo Testnet (Chain ID: 16602)"],
  ];

  if (data.contractAddress) {
    rows.push(["Contract", truncate(data.contractAddress, 42)]);
  }

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

  // ── Disclaimer ──
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 150);
  const disclaimer = [
    "This certificate is generated from immutable on-chain data stored on the 0G Network.",
    "The Merkle Root is cryptographically verifiable through 0G Storage.",
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
  doc.setTextColor(245, 158, 11);
  doc.text("ChainRight — Verifiable AI Provenance", pw / 2, y, { align: "center" });

  // Devolver como Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

function hline(doc: jsPDF, y: number, margin = 15) {
  doc.setDrawColor(100, 100, 120);
  doc.setLineWidth(0.3);
  doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
}

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

function truncate(text: string, maxLen: number): string {
  if (!text) return "—";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
