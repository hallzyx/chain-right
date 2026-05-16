import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import "dotenv/config";

import type {
  ComputeProvider,
  ComputeAccount,
  ComputeStatus,
  ImageGenerationResult,
} from "./types";

// ============================================
// Wrapper para 0G Compute Network
// ============================================
//
// REGLAS OBLIGATORIAS (de AGENTS.md y COMPUTE.md):
//
// 1. SIEMPRE llamar processResponse() DESPUÉS de CADA inferencia
// 2. SIEMPRE usar este ORDEN de parámetros:
//    processResponse(providerAddress, chatID, usageData)
//    ↑ providerAddress PRIMERO — NO lo invertas
// 3. SIEMPRE extraer ChatID del header ZG-Res-Key PRIMERO
//    Solo usar body como fallback para chatbot
// 4. SIEMPRE hacer acknowledgeProviderSigner() antes del primer uso
// 5. SIEMPRE verificar balance antes de hacer requests
// 6. NUNCA usar ethers v5 — siempre v6
//
// ============================================
// WARNING: Si te salteas processResponse(), los fondos no se liquidan.
//          Si invertís el orden de los parámetros, hay un bug SILENCIOSO.
// ============================================

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai";

// ============================================
// Costos y montos de transferencia (visibles para la UI)
// ============================================

/** Monto mínimo para depositar y crear la cuenta principal de Compute (0.1 0G). */
export const COMPUTE_ACCOUNT_MIN_DEPOSIT = "0.1";

/** Monto transferido a cada provider para inicializar/recargar su sub-cuenta (1.0 0G mínimo requerido). */
export const PROVIDER_TRANSFER_AMOUNT = "0.1";

/** Umbral mínimo de saldo del provider antes de recargar. Si el saldo baja de esto, se recarga. */
export const PROVIDER_BALANCE_THRESHOLD = "0.5";

/** Estimación de costo por inferencia (varía por provider, ~0.001-0.005 0G). */
export const ESTIMATED_COST_PER_INFERENCE = "~0.002 0G";

/**
 * Helper: verifica si un error de respuesta del provider es por saldo insuficiente.
 */
function isInsufficientBalanceError(errorText: string): boolean {
  return errorText.includes("insufficient balance") || errorText.includes("minimum reserve");
}

/**
 * Helper: intenta la inferencia y, si falla por saldo insuficiente,
 * transfiere fondos al provider y reintenta una vez.
 */
async function tryInferenceWithRetry(
  broker: any,
  targetProvider: string,
  endpoint: string,
  path: string,
  requestBody: Record<string, unknown>,
  model: string
): Promise<{ response: Response; errorText?: string }> {
  const bodyStr = JSON.stringify(requestBody);
  console.log(`[tryInference] POST ${endpoint}${path}`);
  console.log(`[tryInference] Body size: ${bodyStr.length} bytes`);
  console.log(`[tryInference] Body preview: ${bodyStr.substring(0, 200)}...`);

  const headers = await broker.inference.getRequestHeaders(
    targetProvider,
    bodyStr
  );

  console.log(`[tryInference] Auth headers: ${Object.keys(headers).join(", ")}`);

  let response = await fetch(`${endpoint}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: bodyStr,
  });

  console.log(`[tryInference] Response status: ${response.status}`);
  console.log(`[tryInference] Response headers: ${[...response.headers.entries()].map(([k,v]) => `${k}:${v}`).join("; ")}`);

  // Si falla por saldo insuficiente, transferir y reintentar
  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[tryInference] Error response: ${errorText.substring(0, 500)}`);

    if (isInsufficientBalanceError(errorText)) {
      console.log("Insufficient provider balance, transferring funds and retrying...");
      try {
        await broker.ledger.transferFund(
          targetProvider,
          "inference",
          ethers.parseEther(PROVIDER_TRANSFER_AMOUNT)
        );
        console.log(`Transferred ${PROVIDER_TRANSFER_AMOUNT} 0G to provider ${targetProvider}`);
      } catch (transferErr: any) {
        return {
          response,
          errorText: `Failed to transfer funds to provider: ${transferErr.message}. Your compute ledger may not have enough balance.`,
        };
      }

      // Reintentar con headers frescos
      const retryHeaders = await broker.inference.getRequestHeaders(
        targetProvider,
        JSON.stringify(requestBody)
      );

      response = await fetch(`${endpoint}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...retryHeaders,
        },
        body: JSON.stringify(requestBody),
      });
    } else {
      return { response, errorText };
    }
  }

  return { response };
}

// ============================================
// Helpers
// ============================================

function getWallet(): ethers.Wallet {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not configured in .env");
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(privateKey, provider);
}

async function getBroker() {
  const wallet = getWallet();
  return await createZGComputeNetworkBroker(wallet);
}

// ============================================
// Funciones Públicas
// ============================================

/**
 * Descubre providers disponibles para un tipo de servicio.
 * 
 * @param serviceType 'chatbot', 'text-to-image', o 'speech-to-text'
 * @returns Lista de providers filtrados
 * 
 * @note Los providers se devuelven como tuplas:
 *       [0] = providerAddress
 *       [1] = serviceType
 *       [2] = url
 *       [6] = model
 *       [10] = teeVerified
 */
export async function discoverProviders(
  serviceType: "chatbot" | "text-to-image" | "speech-to-text" | "image-editing" = "text-to-image"
): Promise<ComputeProvider[]> {
  const broker = await getBroker();

  // Listar todos los servicios
  const services = await broker.inference.listService();

  // Filtrar por tipo de servicio y mapear a struct
  const providers: ComputeProvider[] = [];

  for (const s of services) {
    // s es una tupla: [0]=address, [1]=type, [2]=url, [6]=model, [10]=teeVerified
    if (s[1] === serviceType) {
      providers.push({
        address: s[0] as string,
        serviceType: s[1] as string,
        url: s[2] as string,
        model: (s[6] as string) || "unknown",
        teeVerified: s[10] as boolean,
      });
    }
  }

  return providers;
}

/**
 * Verifica si la cuenta de Compute existe para la wallet actual.
 */
export async function checkAccountExists(): Promise<boolean> {
  try {
    const broker = await getBroker();
    const ledger = await broker.ledger.getLedger();
    return ledger !== null && ledger !== undefined;
  } catch {
    return false;
  }
}

/**
 * Crea la cuenta principal de Compute si no existe.
 * Deposita el monto mínimo (0.1 0G) desde la wallet on-chain.
 * @returns Resultado con éxito y mensaje descriptivo.
 */
export async function ensureComputeAccount(): Promise<{ success: boolean; message: string; created: boolean }> {
  try {
    // Check if already exists
    const exists = await checkAccountExists();
    if (exists) {
      return { success: true, message: "Compute account already exists", created: false };
    }

    // Create account with minimum deposit (0.1 0G)
    const broker = await getBroker();
    await broker.ledger.depositFund(0.1);

    return { success: true, message: "Compute account created with 0.1 0G deposit", created: true };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create compute account: ${error.message}`,
      created: false,
    };
  }
}

/**
 * Obtiene el estado completo del sistema 0G Compute.
 * Incluye: balance on-chain, compute ledger, providers disponibles.
 */
export async function getComputeStatus(): Promise<ComputeStatus> {
  const broker = await getBroker();
  const wallet = getWallet();

  // On-chain balance
  const onChainBalance = await wallet.provider!.getBalance(wallet.address);

  // Compute account status
  let accountExists = false;
  let computeBalance = "0";
  let computeTotalBalance = "0";

  try {
    const ledger = await broker.ledger.getLedger();
    accountExists = true;
    computeTotalBalance = ethers.formatEther(ledger[1] as bigint); // total
    computeBalance = ethers.formatEther(ledger[2] as bigint); // available
  } catch {
    accountExists = false;
  }

  // Discover providers by type (each wrapped to prevent cascade failures)
  const [textResult, imageResult, chatResult] = await Promise.allSettled([
    discoverProviders("text-to-image").catch(() => []),
    discoverProviders("image-editing").catch(() => []),
    discoverProviders("chatbot").catch(() => []),
  ]);

  const textProviders = textResult.status === "fulfilled" ? textResult.value : [];
  const imageProviders = imageResult.status === "fulfilled" ? imageResult.value : [];
  const chatProviders = chatResult.status === "fulfilled" ? chatResult.value : [];

  const textToImage = textProviders.length > 0
    ? { available: true, model: textProviders[0].model, address: textProviders[0].address, teeVerified: textProviders[0].teeVerified }
    : { available: false, model: "", address: "", teeVerified: false };

  const imageEditing = imageProviders.length > 0
    ? { available: true, model: imageProviders[0].model, address: imageProviders[0].address, teeVerified: imageProviders[0].teeVerified }
    : { available: false, model: "", address: "", teeVerified: false };

  const chatbot = chatProviders.length > 0
    ? { available: true, model: chatProviders[0].model, address: chatProviders[0].address, teeVerified: chatProviders[0].teeVerified }
    : { available: false, model: "", address: "", teeVerified: false };

  return {
    accountExists,
    walletBalance: ethers.formatEther(onChainBalance),
    computeBalance,
    computeTotalBalance,
    providers: {
      textToImage,
      imageEditing,
      chatbot,
    },
    providerBalances: {},
    costs: {
      accountMinDeposit: COMPUTE_ACCOUNT_MIN_DEPOSIT,
      providerTransfer: PROVIDER_TRANSFER_AMOUNT,
      estimatedPerInference: ESTIMATED_COST_PER_INFERENCE,
    },
  };
}

/**
 * Obtiene el estado de la cuenta (balance).
 */
export async function getAccount(): Promise<ComputeAccount> {
  const broker = await getBroker();
  const ledger = await broker.ledger.getLedger();

  // ledger es una tupla: [0]=owner, [1]=totalBalance, [2]=availableBalance
  return {
    totalBalance: ledger[1] as bigint,
    availableBalance: ledger[2] as bigint,
  };
}

/**
 * Deposita fondos a la main account.
 * @param amount Cantidad en 0G (ej: 0.5)
 */
export async function depositFund(amount: number): Promise<boolean> {
  const broker = await getBroker();
  // SDK de 0G espera number aquí (no bigint/wei)
  await broker.ledger.depositFund(amount);
  return true;
}

/**
 * Transfiere fondos a un provider específico (para inferencia).
 */
export async function transferToProvider(
  providerAddress: string,
  amount: number
): Promise<boolean> {
  const broker = await getBroker();
  const weiAmount = ethers.parseEther(amount.toString());
  await broker.ledger.transferFund(providerAddress, "inference", weiAmount);
  return true;
}

/**
 * Hace acknowledge a un provider (requerido antes del primer uso).
 */
export async function acknowledgeProvider(providerAddress: string): Promise<void> {
  const broker = await getBroker();
  await broker.inference.acknowledgeProviderSigner(providerAddress);
}

// ============================================
// Text-to-Image (Flux Turbo)
// ============================================

/**
 * Genera una imagen con IA via 0G Compute (Flux Turbo).
 * 
 * @param prompt Texto descriptivo de la imagen
 * @param providerAddress Address del provider (opcional - descubre automáticamente)
 * @param size Tamaño de la imagen
 * 
 * @important REGLAS QUE NO TE PODÉS SALTEAR:
 * 
 * 1. Extraer ChatID del HEADER primero:
 *    response.headers.get('ZG-Res-Key') o 'zg-res-key'
 * 
 * 2. processResponse() con ORDEN CORRECTO:
 *    processResponse(providerAddress, chatID, usageData)
 *    ↑ providerAddress PRIMERO. No lo invertas.
 * 
 * 3. Text-to-image NO necesita usageData (pasar undefined o chatID solo)
 */
export async function generateImage(
  prompt: string,
  providerAddress?: string,
  size: "256x256" | "512x512" | "1024x1024" = "1024x1024"
): Promise<ImageGenerationResult> {
  try {
    const broker = await getBroker();

    // ============ PASO 1: Descubrir provider si no se pasó ============
    let targetProvider = providerAddress;

    if (!targetProvider) {
      const providers = await discoverProviders("text-to-image");
      if (providers.length === 0) {
        return {
          success: false,
          zkResKey: "",
          providerAddress: "",
          model: "flux-turbo",
          prompt,
          error: "No text-to-image providers available at this moment",
        };
      }
      // Preferir TEE-verified
      const teeProvider = providers.find(p => p.teeVerified);
      targetProvider = teeProvider ? teeProvider.address : providers[0].address;
    }

    // ============ PASO 2: Preparar y enviar request (con retry si saldo insuficiente) ============
    const { endpoint, model } = await broker.inference.getServiceMetadata(targetProvider);

    const requestBody = {
      model: model || "flux-turbo",
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    };

    const { response, errorText } = await tryInferenceWithRetry(
      broker, targetProvider, endpoint, "/images/generations", requestBody, model || "flux-turbo"
    );

    if (!response.ok) {
      return {
        success: false,
        zkResKey: "",
        providerAddress: targetProvider,
        model: model || "flux-turbo",
        prompt,
        error: `Provider error: ${response.status} ${errorText}`,
      };
    }

    // ============ PASO 3: Extraer ChatID del HEADER (PRIMERO!) ============
    //
    // REGLA OBLIGATORIA: Extraer del header PRIMERO.
    // Solo fallback al body para chatbot (no para imágenes).
    //
    let chatID = response.headers.get("ZG-Res-Key") || response.headers.get("zg-res-key");

    if (!chatID) {
      console.warn("ZG-Res-Key not found in headers — using default value");
    }

    // ============ PASO 4: Parsear respuesta ============
    const data = await response.json();

    // Extraer la imagen en base64
    let imageData: Uint8Array | undefined;
    let imageUrl: string | undefined;

    if (data.data && data.data[0]) {
      if (data.data[0].b64_json) {
        // Base64
        imageData = new Uint8Array(Buffer.from(data.data[0].b64_json, "base64"));
      } else if (data.data[0].url) {
        // URL
        imageUrl = data.data[0].url;
      }
    }

    // ============ PASO 5: processResponse() — OBLIGATORIO ============
    //
    // ORDEN CRÍTICO:
    // processResponse(providerAddress, chatID, usageData)
    //                 ↑ 1RO           ↑ 2DO    ↑ 3RO
    //
    // NUNCA lo invertas. Si lo hacés, hay un bug SILENCIOSO.
    //
    // Para text-to-image: usageData es opcional.
    //
    if (chatID) {
      try {
        await broker.inference.processResponse(
          targetProvider,  // 1RO: providerAddress
          chatID,           // 2DO: chatID
          undefined         // 3RO: usageData (opcional para imágenes)
        );
      } catch (processErr: any) {
        console.error("Error en processResponse:", processErr.message);
        // Continuamos de todas formas — el usuario tiene su imagen
      }
    }

    return {
      success: true,
      imageData,
      imageUrl,
      zkResKey: chatID || "",
      providerAddress: targetProvider,
      model: model || "flux-turbo",
      prompt,
    };
  } catch (error: any) {
    return {
      success: false,
      zkResKey: "",
      providerAddress: providerAddress || "",
      model: "flux-turbo",
      prompt,
      error: `Error generating image: ${error.message}`,
    };
  }
}

// ============================================
// Image Edit (qwen-image-edit-2511)
// ============================================

/**
 * Edita una imagen existente usando IA via 0G Compute (qwen-image-edit-2511).
 *
 * Envía la imagen original + prompt de edición al provider
 * y recibe la imagen editada de vuelta.
 *
 * @param imageBase64 Imagen original en base64 (sin el data: prefix)
 * @param editPrompt Instrucción de edición (ej: "make it cyberpunk style")
 * @param providerAddress Address del provider (opcional — descubre automáticamente)
 *
 * @rules Mismas que generateImage: ZG-Res-Key del header, processResponse() con orden correcto.
 */
export async function editImage(
  imageBase64: string,
  editPrompt: string,
  providerAddress?: string
): Promise<ImageGenerationResult> {
  try {
    const broker = await getBroker();

    // ============ PASO 1: Descubrir provider ============
    let targetProvider = providerAddress;

    if (!targetProvider) {
      const providers = await discoverProviders("image-editing");
      if (providers.length === 0) {
        return {
          success: false,
          zkResKey: "",
          providerAddress: "",
          model: "qwen-image-edit-2511",
          prompt: editPrompt,
          error: "No image-edit providers available at this moment",
        };
      }
      const teeProvider = providers.find((p) => p.teeVerified);
      targetProvider = teeProvider ? teeProvider.address : providers[0].address;
    }

    // ============ PASO 2: Preparar y enviar request con multipart/form-data ============
    // El provider de image-edit requiere multipart/form-data, NO JSON
    const { endpoint, model } = await broker.inference.getServiceMetadata(targetProvider);

    // Convertir base64 a Blob para FormData
    const rawBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;
    const imageBuffer = Buffer.from(rawBase64, "base64");

    const formData = new FormData();
    formData.append("model", model || "qwen/qwen-image-edit-2511");
    formData.append("prompt", editPrompt);
    formData.append("image", new Blob([imageBuffer], { type: "image/png" }), "image.png");
    formData.append("response_format", "b64_json"); // Pedir base64 directo, no URL interna

    console.log("[editImage] Endpoint:", endpoint);
    console.log("[editImage] Model:", model);
    console.log("[editImage] Image size:", imageBuffer.length, "bytes");

    // Para multipart, firmar con string vacío (el body tiene boundary dinámico)
    const authHeaders = await broker.inference.getRequestHeaders(targetProvider, "");

    // Convertir headers a Record<string, string> para fetch
    const fetchHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(authHeaders)) {
      if (typeof value === "string") fetchHeaders[key] = value;
    }

    let response = await fetch(`${endpoint}/images/edits`, {
      method: "POST",
      headers: fetchHeaders, // NO Content-Type — fetch lo pone con el boundary
      body: formData,
    });

    // Si falla por saldo insuficiente, transferir y reintentar
    if (!response.ok) {
      const errorText = await response.text();
      console.log("[editImage] Error response:", errorText.substring(0, 500));

      if (isInsufficientBalanceError(errorText)) {
        console.log("[editImage] Insufficient balance, transferring and retrying...");
        try {
          await broker.ledger.transferFund(
            targetProvider,
            "inference",
            ethers.parseEther(PROVIDER_TRANSFER_AMOUNT)
          );
        } catch (transferErr: any) {
          return {
            success: false,
            zkResKey: "",
            providerAddress: targetProvider,
            model: model || "qwen-image-edit-2511",
            prompt: editPrompt,
            error: `Failed to transfer funds: ${transferErr.message}`,
          };
        }

        // Reintentar con headers frescos
        const retryAuthHeaders = await broker.inference.getRequestHeaders(targetProvider, "");
        const retryFetchHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(retryAuthHeaders)) {
          if (typeof value === "string") retryFetchHeaders[key] = value;
        }
        response = await fetch(`${endpoint}/images/edits`, {
          method: "POST",
          headers: retryFetchHeaders,
          body: formData,
        });
      } else {
        return {
          success: false,
          zkResKey: "",
          providerAddress: targetProvider,
          model: model || "qwen-image-edit-2511",
          prompt: editPrompt,
          error: `Provider error: ${response.status} ${errorText}`,
        };
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        zkResKey: "",
        providerAddress: targetProvider,
        model: model || "qwen-image-edit-2511",
        prompt: editPrompt,
        error: `Provider error after retry: ${response.status} ${errorText}`,
      };
    }

    // ============ PASO 3: Extraer ZG-Res-Key ============
    let chatID = response.headers.get("ZG-Res-Key") || response.headers.get("zg-res-key");

    // ============ PASO 4: Parsear respuesta ============
    const data = await response.json();

    let imageData: Uint8Array | undefined;
    let imageUrl: string | undefined;

    if (data.data && data.data[0]) {
      if (data.data[0].b64_json) {
        imageData = new Uint8Array(Buffer.from(data.data[0].b64_json, "base64"));
      } else if (data.data[0].url) {
        imageUrl = data.data[0].url;
        // Descargar la imagen si es URL del provider
        if (imageUrl) {
          try {
            const imgResp = await fetch(imageUrl);
            if (imgResp.ok) {
              imageData = new Uint8Array(await imgResp.arrayBuffer());
            }
          } catch (e) {
            console.warn("[editImage] Could not download image from URL:", imageUrl);
          }
        }
      }
    }

    // ============ PASO 5: processResponse() OBLIGATORIO ============
    if (chatID) {
      try {
        await broker.inference.processResponse(targetProvider, chatID, undefined);
      } catch (processErr: any) {
        console.error("Error en processResponse:", processErr.message);
      }
    }

    return {
      success: true,
      imageData,
      imageUrl,
      zkResKey: chatID || "",
      providerAddress: targetProvider,
      model: model || "qwen-image-edit-2511",
      prompt: editPrompt,
    };
  } catch (error: any) {
    return {
      success: false,
      zkResKey: "",
      providerAddress: providerAddress || "",
      model: "qwen-image-edit-2511",
      prompt: editPrompt,
      error: `Error editing image: ${error.message}`,
    };
  }
}
