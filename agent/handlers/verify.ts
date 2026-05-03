/**
 * Handler principal de verificación de imágenes.
 * Recibe una foto de Telegram, computa el Merkle Root
 * y consulta el contrato en 0G Chain.
 */
import type { Bot } from "grammy";
import { InputFile } from "grammy";
import {
  downloadTelegramImage,
  downloadTelegramDocument,
  getBestPhotoFileId,
} from "../utils/telegram";
import {
  formatAnalyzing,
  formatVerified,
  formatNotVerified,
  formatError,
} from "../utils/format";
import { generatePdfBuffer } from "../utils/pdf";
import { recordVerification } from "../memory/kv";
import { appendLog } from "../memory/log";
import { computeMerkleRootFromBuffer } from "../../lib/storage";
import {
  verifyProvenance,
  isContractConfigured,
  getTokenIdAndTxByMerkleRoot,
} from "../../lib/contract";
import type { Provenance } from "../../lib/types";

/** Datos que devuelve la verificación (sin mensajes de Telegram). */
export interface VerifyImageData {
  success: boolean;
  merkleRoot: string;
  verified: boolean;
  provenance?: Provenance;
  chainScanUrl?: string;
  nftUrl?: string;
  storageScanUrl?: string;
  pdfBuffer?: Buffer;
  sourceIsPhoto: boolean;
  error?: string;
}

/**
 * Maneja un mensaje con foto (comprimida por Telegram).
 */
export async function handlePhoto(
  bot: Bot,
  userId: number,
  username: string | undefined,
  photoSizes: { file_id: string; width: number; height: number }[],
  reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown>,
  chatId: number
): Promise<void> {
  await handleVerification(bot, userId, username, photoSizes, reply, "photo", chatId);
}

/**
 * Maneja un mensaje con documento (sin comprimir — ideal para verificación).
 */
export async function handleDocument(
  bot: Bot,
  userId: number,
  username: string | undefined,
  fileId: string,
  fileName: string | undefined,
  mimeType: string | undefined,
  reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown>,
  chatId: number
): Promise<void> {
  const imageMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (mimeType && !imageMimes.includes(mimeType)) {
    await reply(
      formatError(
        `Unsupported file type: ${mimeType}. Please send a PNG, JPG, or WebP image.`
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  // Usamos el file_id directamente como si fuera una foto de un solo tamaño
  const photoSizes = [{ file_id: fileId, width: 0, height: 0 }];
  await handleVerification(bot, userId, username, photoSizes, reply, "document", chatId);
}

/**
 * Lógica común: descarga, hashea, verifica, responde.
 * @param source - "photo" (comprimida) o "document" (bytes originales)
 */
async function handleVerification(
  bot: Bot,
  userId: number,
  username: string | undefined,
  photoSizes: { file_id: string; width: number; height: number }[],
  reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown>,
  source: "photo" | "document",
  chatId: number
): Promise<void> {
  // 1. Obtener el file_id
  const fileId = getBestPhotoFileId(photoSizes);
  if (!fileId) {
    await reply(formatError("Could not extract file from message."), {
      parse_mode: "HTML",
    });
    return;
  }

  // 2. Mensaje de "analizando"
  const statusMsg = await reply(formatAnalyzing(), {
    parse_mode: "HTML",
  });

  // 3. Descargar (document = sin comprimir, photo = comprimida por Telegram)
  const downloaded =
    source === "document"
      ? await downloadTelegramDocument(bot, fileId)
      : await downloadTelegramImage(bot, fileId);

  if (!downloaded) {
    await reply(formatError("Failed to download file. Please try again."), {
      parse_mode: "HTML",
    });
    return;
  }

  // 4. Computar Merkle Root
  const merkleResult = await computeMerkleRootFromBuffer(
    new Uint8Array(downloaded.buffer)
  );

  if (!merkleResult.success || !merkleResult.merkleRoot) {
    await reply(
      formatError(merkleResult.error || "Failed to compute Merkle Root."),
      { parse_mode: "HTML" }
    );
    return;
  }

  const merkleRoot = merkleResult.merkleRoot;

  // 5. Verificar en el contrato
  let verified = false;
  let responseText: string;
  let provenance: Provenance | undefined;

  if (isContractConfigured()) {
    const result = await verifyProvenance(merkleRoot);

    if (result.verified && result.provenance) {
      verified = true;
      provenance = result.provenance;

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
      const sequence = result.provenance.sequenceNumber;

      const storageScanUrl = sequence
        ? `https://storagescan-galileo.0g.ai/submission/${sequence}`
        : `https://storagescan.0g.ai/#/file/${merkleRoot}`;

      // Buscar tokenId y txHash en eventos del contrato
      let chainScanUrl: string | undefined;
      let nftUrl: string | undefined;

      const mintInfo = await getTokenIdAndTxByMerkleRoot(merkleRoot);
      if (mintInfo) {
        chainScanUrl = `https://chainscan-galileo.0g.ai/tx/${mintInfo.txHash}`;
        nftUrl = contractAddress
          ? `https://chainscan-galileo.0g.ai/nft/${contractAddress}/${mintInfo.tokenId}`
          : undefined;
      }

      responseText = formatVerified(
        merkleRoot,
        result.provenance,
        undefined,
        storageScanUrl,
        chainScanUrl,
        nftUrl
      );
    } else {
      responseText = formatNotVerified(merkleRoot);
    }
  } else {
    responseText = [
      "⚠️ <b>Contract not configured</b>",
      "",
      "The on-chain verification contract is not deployed or configured.",
      "",
      `🔐 <b>Computed Merkle Root:</b>`,
      `<code>${merkleRoot}</code>`,
      "",
      "<i>Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env to enable on-chain verification.</i>",
    ].join("\n");
  }

  // 6. Si es photo, agregar warning de compresión
  if (source === "photo") {
    responseText +=
      "\n\n⚠️ <i>Sent as photo — Telegram compresses images. For exact verification, send as a file (document) instead.</i>";
  }

  // 7. Responder con el resultado
  await reply(responseText, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  // 8. Si está verificado, generar y enviar el PDF
  if (verified && provenance) {
    try {
      const pdfBuffer = await generatePdfBuffer({
        merkleRoot,
        creator: provenance.creator,
        model: provenance.model,
        prompt: provenance.prompt,
        sequenceNumber: provenance.sequenceNumber,
        timestamp: new Date(Number(provenance.timestamp) * 1000).toISOString(),
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      });

      await bot.api.sendDocument(chatId, new InputFile(pdfBuffer, "chainright-certificate.pdf"), {
        caption: "📄 Certificate of Authenticity",
      });
    } catch (err) {
      console.error("Failed to send PDF:", err);
    }
  }

  // 9. Persistir en memoria KV y Log
  await recordVerification(userId, username, verified, merkleRoot);
  await appendLog({
    userId,
    username,
    action: "verify",
    merkleRoot,
    verified,
    message: verified
      ? `Authenticity confirmed (${source})`
      : `No record found (${source})`,
  });

  // 9. Borrar el mensaje de "analizando"
  if (statusMsg && typeof statusMsg === "object" && "message_id" in statusMsg) {
    try {
      await bot.api.deleteMessage(
        (statusMsg as { chat: { id: number }; message_id: number }).chat.id,
        (statusMsg as { message_id: number }).message_id
      );
    } catch {
      // Si no se puede borrar, no pasa nada
    }
  }
}

/**
 * Verifica una imagen y devuelve los datos (sin enviar mensajes a Telegram).
 * Usado por el agente autónomo (NLP) para obtener los datos y luego
 * dejar que DeepSeek genere la respuesta final.
 */
export async function verifyImageData(
  bot: Bot,
  userId: number,
  username: string | undefined,
  source: "photo" | "document",
  fileId: string
): Promise<VerifyImageData> {
  // 1. Descargar
  const downloaded =
    source === "document"
      ? await downloadTelegramDocument(bot, fileId)
      : await downloadTelegramImage(bot, fileId);

  if (!downloaded) {
    return {
      success: false,
      merkleRoot: "",
      verified: false,
      sourceIsPhoto: source === "photo",
      error: "Failed to download file.",
    };
  }

  // 2. Computar Merkle Root
  const merkleResult = await computeMerkleRootFromBuffer(
    new Uint8Array(downloaded.buffer)
  );

  if (!merkleResult.success || !merkleResult.merkleRoot) {
    return {
      success: false,
      merkleRoot: "",
      verified: false,
      sourceIsPhoto: source === "photo",
      error: merkleResult.error || "Failed to compute Merkle Root.",
    };
  }

  const merkleRoot = merkleResult.merkleRoot;

  // 3. Verificar en contrato
  let verified = false;
  let provenance: Provenance | undefined;
  let chainScanUrl: string | undefined;
  let nftUrl: string | undefined;
  let storageScanUrl: string | undefined;
  let pdfBuffer: Buffer | undefined;

  if (isContractConfigured()) {
    const result = await verifyProvenance(merkleRoot);

    if (result.verified && result.provenance) {
      verified = true;
      provenance = result.provenance;

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
      const sequence = result.provenance.sequenceNumber;

      storageScanUrl = sequence
        ? `https://storagescan-galileo.0g.ai/submission/${sequence}`
        : `https://storagescan.0g.ai/#/file/${merkleRoot}`;

      const mintInfo = await getTokenIdAndTxByMerkleRoot(merkleRoot);
      if (mintInfo) {
        chainScanUrl = `https://chainscan-galileo.0g.ai/tx/${mintInfo.txHash}`;
        nftUrl = contractAddress
          ? `https://chainscan-galileo.0g.ai/nft/${contractAddress}/${mintInfo.tokenId}`
          : undefined;
      }

      // Generar PDF
      try {
        pdfBuffer = await generatePdfBuffer({
          merkleRoot,
          creator: provenance.creator,
          model: provenance.model,
          prompt: provenance.prompt,
          sequenceNumber: provenance.sequenceNumber,
          timestamp: new Date(Number(provenance.timestamp) * 1000).toISOString(),
          contractAddress,
        });
      } catch (err) {
        console.error("Failed to generate PDF:", err);
      }
    }
  }

  // 4. Persistir
  await recordVerification(userId, username, verified, merkleRoot);
  await appendLog({
    userId,
    username,
    action: "verify",
    merkleRoot,
    verified,
    message: verified ? `Authenticity confirmed (${source})` : `No record found (${source})`,
  });

  return {
    success: true,
    merkleRoot,
    verified,
    provenance,
    chainScanUrl,
    nftUrl,
    storageScanUrl,
    pdfBuffer,
    sourceIsPhoto: source === "photo",
  };
}
