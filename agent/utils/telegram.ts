/**
 * Utilidades para interactuar con la API de Telegram.
 * Descarga imágenes y archivos recibidos por el bot.
 */
import { Bot, InputFile } from "grammy";

/**
 * Descarga una imagen de Telegram y la devuelve como Buffer.
 * Usa el file_id que Telegram incluye en el mensaje.
 *
 * ⚠️ Las fotos enviadas como "photo" son recomprimidas por Telegram.
 * Para verificación exacta, usar "document" (downloadTelegramDocument).
 *
 * @param bot - Instancia del bot de grammY.
 * @param fileId - El file_id de la foto más grande recibida.
 * @returns Buffer con los bytes de la imagen, o null si falla.
 */
export async function downloadTelegramImage(
  bot: Bot,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  return downloadFile(bot, fileId);
}

/**
 * Descarga un documento de Telegram (sin comprimir).
 * Los documentos conservan los bytes originales — ideal para verificación.
 */
export async function downloadTelegramDocument(
  bot: Bot,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  const result = await downloadFile(bot, fileId);
  if (!result) return null;

  try {
    const file = await bot.api.getFile(fileId);
    const fileName = file.file_path?.split("/").pop() || "file";
    return { ...result, fileName };
  } catch {
    return { ...result, fileName: "file" };
  }
}

/** Lógica común de descarga: getFile → fetch → buffer. */
async function downloadFile(
  bot: Bot,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const file = await bot.api.getFile(fileId);
    if (!file.file_path) {
      console.error("No file_path returned from Telegram");
      return null;
    }

    const token = bot.token;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      console.error(`Failed to download: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.file_path.split(".").pop()?.toLowerCase() || "png";
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
    };
    const mimeType = mimeMap[ext] || "application/octet-stream";

    return { buffer, mimeType };
  } catch (error) {
    console.error("Error downloading from Telegram:", error);
    return null;
  }
}

/**
 * Extrae el file_id de la foto de mayor resolución de un mensaje de Telegram.
 * Telegram envía múltiples resoluciones de la misma foto.
 */
export function getBestPhotoFileId(
  photos: { file_id: string; width: number; height: number }[]
): string {
  if (!photos || photos.length === 0) return "";
  // La última foto del array es la de mayor resolución
  return photos[photos.length - 1].file_id;
}
