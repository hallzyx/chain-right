import { ZgFile, Indexer } from "@0gfoundation/0g-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import "dotenv/config";

import type { MerkleResult, StorageUploadResult, StorageDownloadResult } from "./types";

// ============================================
// Wrapper para 0G Storage Network
// ============================================
// 
// REGLAS OBLIGATORIAS (de AGENTS.md y STORAGE.md):
//
// 1. SIEMPRE generar Merkle Tree ANTES de subir
// 2. SIEMPRE cerrar ZgFile en un bloque finally
// 3. SIEMPRE guardar el Merkle Root (única forma de recuperar el archivo)
// 4. download() PUEDE THROW además de devolver errores — siempre try/catch
// 5. En producción, usar verified download (tercer param = true)
//
// ============================================

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://evmrpc-testnet.0g.ai";
const STORAGE_INDEXER =
  process.env.STORAGE_INDEXER ||
  process.env.NEXT_PUBLIC_STORAGE_INDEXER ||
  "https://indexer-storage-testnet-turbo.0g.ai";

/**
 * Normaliza extensión de archivo para upload temporal.
 */
function normalizeFileExtension(ext: string): string {
  const clean = (ext || "png").toLowerCase().replace(".", "");
  if (["png", "jpg", "jpeg", "webp", "json", "txt"].includes(clean)) return clean;
  return "png";
}

/**
 * Chequea balance mínimo para evitar estimateGas confuso en upload.
 */
async function ensureWalletHasBalance(wallet: Wallet): Promise<void> {
  const balance = await wallet.provider?.getBalance(wallet.address);
  if (!balance || balance <= BigInt(0)) {
    throw new Error(
      "Wallet sin balance 0G para upload. Fondeá la misma wallet usada en PRIVATE_KEY."
    );
  }
}

/**
 * Obtiene el cliente Indexer de 0G Storage.
 */
function getIndexer(): Indexer {
  return new Indexer(STORAGE_INDEXER);
}

/**
 * Obtiene una wallet para transacciones de Storage.
 * Usada para uploads que requieren gas.
 */
function getWallet(): Wallet {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY no configurado en .env");
  }
  const provider = new JsonRpcProvider(RPC_URL);
  return new Wallet(privateKey, provider);
}

// ============================================
// Funciones Públicas
// ============================================

/**
 * Calcula el Merkle Root de un archivo (sin subirlo).
 * Útil para verificación.
 * 
 * @param filePath Ruta al archivo local
 * @returns Merkle Root como string hex
 * 
 * @rule SIEMPRE cerrar el file handle en finally
 */
export async function computeMerkleRoot(filePath: string): Promise<MerkleResult> {
  let file: ZgFile | null = null;

  try {
    file = await ZgFile.fromFilePath(filePath);
    const [tree, err] = await file.merkleTree();

    if (err) {
      return {
        success: false,
        error: `Error generando Merkle Tree: ${err.message}`,
      };
    }

    const rootHash = tree?.rootHash();
    if (!rootHash) {
      return {
        success: false,
        error: "Merkle Root no disponible",
      };
    }

    return {
      success: true,
      merkleRoot: rootHash.startsWith("0x") ? rootHash : `0x${rootHash}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Error calculando Merkle Root: ${error.message}`,
    };
  } finally {
    if (file) {
      await file.close();
    }
  }
}

/**
 * Calcula el Merkle Root desde un Buffer/Uint8Array.
 * Útil para verificación de imágenes subidas por el usuario.
 * 
 * @param data Datos binarios de la imagen
 * @returns Merkle Root como string hex
 */
export async function computeMerkleRootFromBuffer(data: Uint8Array): Promise<MerkleResult> {
  // Escribimos el buffer a un archivo temporal (ZgFile requiere path)
  const tempPath = path.join(os.tmpdir(), `chainright-temp-${Date.now()}-${Math.random()}`);

  try {
    await fs.writeFile(tempPath, data);
    return await computeMerkleRoot(tempPath);
  } catch (error: any) {
    return {
      success: false,
      error: `Error escribiendo archivo temporal: ${error.message}`,
    };
  } finally {
    // Limpiamos el archivo temporal
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignoramos errores de limpieza
    }
  }
}

/**
 * Sube un archivo a 0G Storage.
 * 
 * @param filePath Ruta al archivo local
 * @returns Merkle Root y transaction hash
 * 
 * @rules
 * 1. Genera Merkle Tree ANTES de subir
 * 2. Cierra ZgFile en finally
 * 3. Devuelve el Merkle Root (IMPORTANTE: guardarlo)
 */
export async function uploadFile(filePath: string): Promise<StorageUploadResult> {
  let file: ZgFile | null = null;

  try {
    const indexer = getIndexer();
    const wallet = getWallet();

    await ensureWalletHasBalance(wallet);

    file = await ZgFile.fromFilePath(filePath);

    // ============ PASO 1: Generar Merkle Tree ============
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr) {
      return {
        success: false,
        error: `Error generando Merkle Tree: ${treeErr.message}`,
      };
    }

    const merkleRoot = tree?.rootHash();
    if (!merkleRoot) {
      return {
        success: false,
        error: "Merkle Root no disponible",
      };
    }

    // ============ PASO 2: Upload ============
    const [txResult, uploadErr] = await indexer.upload(file as any, RPC_URL, wallet as any);

    if (uploadErr) {
      return {
        success: false,
        error: `Error subiendo archivo: ${uploadErr.message}. Revisá que PRIVATE_KEY sea la wallet fondeada y que NEXT_PUBLIC_RPC_URL/NEXT_PUBLIC_STORAGE_INDEXER sean testnet coherentes.`,
      };
    }

    return {
      success: true,
      merkleRoot: merkleRoot.startsWith("0x") ? merkleRoot : `0x${merkleRoot}`,
      transactionHash:
        typeof txResult === "string"
          ? txResult
          : (txResult as { txHash?: string } | null)?.txHash,
    };
  } catch (error: any) {
    const msg = String(error?.message || "");
    if (msg.includes("execution reverted") || msg.includes("CALL_EXCEPTION")) {
      return {
        success: false,
        error:
          "Upload revertido por contrato de storage (estimateGas). Causa típica: key/rpc/indexer no coherentes o payload inválido. Verificá NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_STORAGE_INDEXER y PRIVATE_KEY de la wallet fondeada.",
      };
    }

    return {
      success: false,
      error: `Error inesperado en upload: ${error.message}`,
    };
  } finally {
    // ============ PASO 3: Cerrar file handle ============
    if (file) {
      await file.close();
    }
  }
}

/**
 * Sube un Buffer/Uint8Array a 0G Storage.
 * Útil para imágenes generadas por el usuario.
 */
export async function uploadBuffer(data: Uint8Array, fileExtension = "png"): Promise<StorageUploadResult> {
  const safeExtension = normalizeFileExtension(fileExtension);
  const tempPath = path.join(os.tmpdir(), `chainright-upload-${Date.now()}.${safeExtension}`);

  if (!data || data.length === 0) {
    return {
      success: false,
      error: "Buffer vacío: no hay datos para subir",
    };
  }

  try {
    await fs.writeFile(tempPath, data);
    return await uploadFile(tempPath);
  } catch (error: any) {
    return {
      success: false,
      error: `Error en uploadBuffer: ${error.message}`,
    };
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignorar
    }
  }
}

/**
 * Descarga un archivo de 0G Storage por Merkle Root.
 * 
 * @param merkleRoot Merkle Root del archivo a descargar
 * @param outputPath Ruta donde guardar el archivo (opcional)
 * @param verified Si se debe verificar el Merkle proof (recomendado para producción)
 * 
 * @rules
 * - download() PUEDE THROW además de devolver errores
 * - Siempre envolver en try/catch
 */
export async function downloadFile(
  merkleRoot: string,
  outputPath?: string,
  verified = true
): Promise<StorageDownloadResult> {
  try {
    const indexer = getIndexer();

    // Si no hay outputPath, usamos un temporal
    const finalPath = outputPath || path.join(os.tmpdir(), `chainright-download-${Date.now()}`);

    // ============ IMPORTANTE ============
    // indexer.download() puede:
    // 1. Devolver un error
    // 2. Lanzar una excepción
    //
    // Siempre envolver en try/catch.
    // ===================================

    const err = await indexer.download(merkleRoot, finalPath, verified);

    if (err) {
      return {
        success: false,
        error: `Error descargando: ${err.message}`,
      };
    }

    // Leemos el archivo descargado
    const data = await fs.readFile(finalPath);

    // Limpiamos si fue temporal
    if (!outputPath) {
      try {
        await fs.unlink(finalPath);
      } catch {
        // Ignorar
      }
    }

    return {
      success: true,
      data: new Uint8Array(data),
      verified,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Error inesperado en download: ${error.message}`,
    };
  }
}
