"use server";

import { generateImage } from "@/lib/compute";
import { uploadBuffer, computeMerkleRootFromBuffer } from "@/lib/storage";
import { mintWithProvenance, verifyProvenance, isContractConfigured } from "@/lib/contract";
import { bufferToDataUrl } from "@/lib/utils";
import { discoverProviders } from "@/lib/compute";
import { generateImageWithOpenAI } from "@/lib/openai";

import type { ImageGenerationResult, StorageUploadResult, MintResult, VerificationResult } from "@/lib/types";

// ============================================
// Server Actions para ChainRight
// ============================================
// Estas acciones se llaman desde Client Components.
// Mantienen la lógica de negocio en el servidor (donde están las env vars).
// ============================================

/**
 * Action para generar una imagen con 0G Compute.
 */
export async function actionGenerateImage(
  prompt: string
): Promise<ImageGenerationResult> {
  if (!prompt || prompt.trim().length === 0) {
    return {
      success: false,
      zkResKey: "",
      providerAddress: "",
      model: "flux-turbo",
      prompt: "",
      error: "Prompt cannot be empty",
    };
  }

  console.log("Generating image with prompt:", prompt);

  // 1) Intentar con 0G providers disponibles
  const providers = await discoverProviders("text-to-image");

  if (!providers || providers.length === 0) {
    return {
      success: false,
      fallbackRequired: true,
      fallbackReason:
        "No text-to-image providers available on 0G Compute right now.",
      source: "0g-compute",
      zkResKey: "",
      providerAddress: "",
      model: "flux-turbo",
      prompt,
      error:
        "No text-to-image providers available at this moment",
    };
  }

  // 2) Si hay providers, seguir flujo normal 0G
  const result = await generateImage(prompt.trim());

  // Convertir Uint8Array a data URL para mostrar en el cliente
  if (result.success && result.imageData) {
    result.imageUrl = bufferToDataUrl(result.imageData, "image/png");
  }

  return result;
}

/**
 * Action para ejecutar fallback con OpenAI.
 *
 * IMPORTANTE: esta acción se invoca solamente cuando el usuario
 * acepta explícitamente el modal de fallback.
 */
export async function actionGenerateImageWithFallback(
  prompt: string
): Promise<ImageGenerationResult> {
  if (!prompt || prompt.trim().length === 0) {
    return {
      success: false,
      source: "openai-fallback",
      zkResKey: "",
      providerAddress: "openai",
      model: "gpt-image-1-mini",
      prompt: "",
      error: "Prompt cannot be empty",
    };
  }

  // Perfil económico para demo dentro de tamaños soportados por gpt-image-1-mini
  const result = await generateImageWithOpenAI(prompt.trim(), "auto");

  if (result.success && result.imageData) {
    result.imageUrl = bufferToDataUrl(result.imageData, "image/png");
  }

  return result;
}

/**
 * Action para subir una imagen a 0G Storage.
 */
export async function actionUploadImage(
  base64Data: string,
  fileExtension = "png"
): Promise<StorageUploadResult> {
  try {
    if (!base64Data || typeof base64Data !== "string") {
      return {
        success: false,
        merkleRoot: "",
        error: "Invalid image: empty payload",
      };
    }

    // Convertir base64 a Uint8Array
    // El data URL viene como: "data:image/png;base64,..."
    const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;

    if (!base64 || base64.length < 16) {
      return {
        success: false,
        merkleRoot: "",
        error: "Invalid image: incomplete base64",
      };
    }

    const buffer = Buffer.from(base64, "base64");

    if (!buffer || buffer.length === 0) {
      return {
        success: false,
        merkleRoot: "",
        error: "Invalid image: could not decode base64",
      };
    }

    // ~2MB límite preventivo (evita payloads extremos para demo)
    if (buffer.length > 2 * 1024 * 1024) {
      return {
        success: false,
        merkleRoot: "",
        error: "Image too large for demo flow. Generate a lighter image.",
      };
    }

    const data = new Uint8Array(buffer);

    console.log("Uploading image to 0G Storage...");
    return await uploadBuffer(data, fileExtension);
  } catch (error: any) {
    return {
      success: false,
      merkleRoot: "",
      error: `Upload error: ${error.message}`,
    };
  }
}

/**
 * Action para calcular el Merkle Root de una imagen (sin subirla).
 * Útil para verificación.
 */
export async function actionComputeMerkleRoot(
  base64Data: string
): Promise<{ success: boolean; merkleRoot?: string; error?: string }> {
  try {
    const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    const buffer = Buffer.from(base64, "base64");
    const data = new Uint8Array(buffer);

    const result = await computeMerkleRootFromBuffer(data);
    return {
      success: result.success,
      merkleRoot: result.merkleRoot,
      error: result.error,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Error computing Merkle Root: ${error.message}`,
    };
  }
}

/**
 * Action para mintear un NFT con procedencia.
 */
export async function actionMintNFT(
  merkleRoot: string,
  zkResKey: string,
  prompt: string,
  model: string,
  sequenceNumber: string
): Promise<MintResult> {
  if (!isContractConfigured()) {
    return {
      success: false,
      error: "Contract not configured. Deploy ChainRightERC721 first and set NEXT_PUBLIC_CONTRACT_ADDRESS in .env",
    };
  }

  // Metadata URI por defecto para demo
  const metadataUri = `ipfs://chainright/${merkleRoot}`;

  console.log("Minting NFT...");
  console.log("- Merkle Root:", merkleRoot);
  console.log("- ZG-Res-Key:", zkResKey);
  console.log("- Prompt:", prompt);
  console.log("- Model:", model);
  console.log("- Sequence Number:", sequenceNumber);

  return await mintWithProvenance(
    merkleRoot,
    zkResKey,
    prompt,
    model,
    sequenceNumber,
    metadataUri
  );
}

/**
 * Action para verificar la procedencia de una imagen.
 */
export async function actionVerifyImage(
  base64Data: string
): Promise<VerificationResult> {
  // 1. Calcular Merkle Root
  const merkleResult = await actionComputeMerkleRoot(base64Data);

  if (!merkleResult.success || !merkleResult.merkleRoot) {
    return {
      verified: false,
      merkleRoot: "",
      message: `Error computing hash: ${merkleResult.error}`,
    };
  }

  const merkleRoot = merkleResult.merkleRoot;

  // 2. Verificar en el contrato
  if (isContractConfigured()) {
    const result = await verifyProvenance(merkleRoot);
    return result;
  }

  // 3. Si el contrato no está configurado, devolvemos que no hay registro
  // (pero mostramos el hash calculado)
  return {
    verified: false,
    merkleRoot,
    message: `Computed hash: ${merkleRoot}. Contract not configured - cannot verify on-chain.`,
  };
}

/**
 * Action para verificar procedencia directamente por Merkle Root.
 * Útil para verificar con un hash pegado manualmente (ej: desde un certificado PDF).
 */
export async function actionManualVerify(
  merkleRoot: string
): Promise<VerificationResult> {
  if (!merkleRoot || merkleRoot.length < 10) {
    return {
      verified: false,
      merkleRoot,
      message: "Invalid Merkle Root or too short.",
    };
  }

  if (!isContractConfigured()) {
    return {
      verified: false,
      merkleRoot,
      message: "Contract not configured.",
    };
  }

  return await verifyProvenance(merkleRoot);
}

/** Datos de red y contrato para mostrar en vivo durante la verificación. */
export interface VerificationDetails {
  rpcUrl: string;
  contractAddress: string;
  chainId: number;
  blockNumber: number;
}

/**
 * Action para obtener detalles on-chain en tiempo real.
 * Devuelve RPC, contrato, chain ID y bloque actual — se muestra en la UI
 * durante la verificación para dar trazabilidad completa.
 */
export async function actionGetVerificationDetails(): Promise<VerificationDetails> {
  const { ethers } = await import("ethers");

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000...";

  let chainId = 16602;
  let blockNumber = 0;

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    chainId = Number(network.chainId);
    blockNumber = await provider.getBlockNumber();
  } catch {
    // degradación elegante
  }

  return { rpcUrl, contractAddress, chainId, blockNumber };
}
