/**
 * Formateo de mensajes para respuestas del bot de Telegram.
 * Black & Amber Edition.
 */
import type { Provenance } from "../../lib/types";

/**
 * Mensaje de bienvenida cuando el usuario ejecuta /start.
 */
export function formatWelcome(): string {
  return [
    "🔗 <b>ChainRight Verification Agent</b>",
    "",
    "I verify the cryptographic provenance of AI-generated images using the <b>0G decentralized network</b>.",
    "",
    "💬 <b>Talk to me naturally:</b>",
    '• "Verify this image" + send a photo',
    '• "Check if this is authentic" + send a file',
    '• "Is this artwork registered?" + send a document',
    '• "What can you do?"',
    '• "Show my stats"',
    "",
    "📸 <b>How verification works:</b>",
    "• I compute the Merkle Root (SHA-256)",
    "• I query the 0G Chain for on-chain provenance",
    "• I send you the result + links + PDF certificate",
    "",
    "💡 <i>Even changing 1 pixel changes the hash completely.</i>",
    "",
    "🤖 Powered by DeepSeek + 0G Chain",
  ].join("\n");
}

/**
 * Mensaje de ayuda con comandos disponibles.
 */
export function formatHelp(): string {
  return [
    "🛠 <b>Available Commands</b>",
    "",
    "/start — Start the agent",
    "/help  — Show this help",
    "/stats — Your verification statistics",
    "",
    "📸 <b>Just send me an image</b> and I'll verify it.",
  ].join("\n");
}

/**
 * Mensaje mientras se procesa la imagen.
 */
export function formatAnalyzing(): string {
  return [
    "🔍 <b>Analyzing cryptographic fingerprint...</b>",
    "",
    "• Computing Merkle Root (SHA-256)",
    "• Connecting to 0G Chain RPC",
    "• Querying smart contract",
    "",
    "<i>This takes a few seconds...</i>",
  ].join("\n");
}

/**
 * Mensaje de éxito: autenticidad confirmada.
 */
export function formatVerified(
  merkleRoot: string,
  provenance: Provenance,
  blockNumber?: number,
  storageScanUrl?: string,
  chainScanUrl?: string,
  nftUrl?: string
): string {
  const blockInfo = blockNumber
    ? `\n📦 Block: #${blockNumber.toLocaleString()}`
    : "";

  const links: string[] = [];
  if (chainScanUrl) links.push(`⛓️ <a href="${chainScanUrl}">View Mint Tx on ChainScan</a>`);
  if (nftUrl) links.push(`🎨 <a href="${nftUrl}">View NFT on ChainScan</a>`);
  if (storageScanUrl) links.push(`☁️ <a href="${storageScanUrl}">View on StorageScan</a>`);

  const linkSection = links.length > 0 ? "\n\n" + links.join("\n") : "";

  return [
    "✅ <b>AUTHENTICITY CONFIRMED</b>",
    "",
    "This artwork has an immutable record on 0G Chain.",
    "",
    `👤 Creator:     <code>${shortHex(provenance.creator)}</code>`,
    `🤖 AI Model:    ${provenance.model}`,
    `📝 Prompt:      ${truncate(provenance.prompt, 120)}`,
    `🔑 ZK Res Key:  <code>${shortHex(provenance.zkResKey)}</code>`,
    `#️⃣ Sequence:    ${provenance.sequenceNumber || "—"}`,
    `🕐 Timestamp:   ${formatTimestamp(provenance.timestamp)}`,
    "",
    `🔐 <b>Merkle Root:</b>`,
    `<code>${merkleRoot}</code>`,
    blockInfo,
    linkSection,
    "",
    "📄 <i>Generating certificate PDF...</i>",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Mensaje de fallo: no se encontró registro.
 */
export function formatNotVerified(merkleRoot: string): string {
  return [
    "❌ <b>NO RECORD FOUND</b>",
    "",
    "This cryptographic fingerprint does not match any registered artwork on 0G Chain.",
    "",
    `🔐 <b>Computed Merkle Root:</b>`,
    `<code>${merkleRoot}</code>`,
    "",
    "<i>If you changed even 1 pixel, the hash changes completely.</i>",
  ].join("\n");
}

/**
 * Mensaje de error genérico.
 */
export function formatError(message: string): string {
  return [
    "⚠️ <b>Error</b>",
    "",
    message,
    "",
    "<i>Please try again or contact support.</i>",
  ].join("\n");
}

/**
 * Estadísticas del usuario.
 */
export function formatStats(stats: {
  totalScans: number;
  verifiedCount: number;
  lastScan: string;
}): string {
  return [
    "📊 <b>Your Verification Stats</b>",
    "",
    `🔍 Total scans:    <b>${stats.totalScans}</b>`,
    `✅ Verified:       <b>${stats.verifiedCount}</b>`,
    `🕐 Last scan:      ${stats.lastScan}`,
  ].join("\n");
}

// ─── Helpers ───

function shortHex(hex: string): string {
  if (!hex || hex.length < 10) return hex || "—";
  return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "—";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

function formatTimestamp(ts: bigint): string {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
