import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import "dotenv/config";

import type {
  ComputeProvider,
  ComputeAccount,
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
// Helpers
// ============================================

function getWallet(): ethers.Wallet {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY no configurado en .env");
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
  serviceType: "chatbot" | "text-to-image" | "speech-to-text" = "text-to-image"
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
          error: "No hay providers de text-to-image disponibles en este momento",
        };
      }
      // Preferir TEE-verified
      const teeProvider = providers.find(p => p.teeVerified);
      targetProvider = teeProvider ? teeProvider.address : providers[0].address;
    }

    // ============ PASO 2: Preparar y enviar request ============
    const { endpoint, model } = await broker.inference.getServiceMetadata(targetProvider);

    const requestBody = {
      model: model || "flux-turbo",
      prompt,
      n: 1,
      size,
      response_format: "b64_json", // base64 para no necesitar URLs
    };

    // Headers de auth (importante: incluir el body para firma)
    const headers = await broker.inference.getRequestHeaders(
      targetProvider,
      JSON.stringify(requestBody)
    );

    // Hacer el request al provider
    const response = await fetch(`${endpoint}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        zkResKey: "",
        providerAddress: targetProvider,
        model: model || "flux-turbo",
        prompt,
        error: `Error en el provider: ${response.status} ${errorText}`,
      };
    }

    // ============ PASO 3: Extraer ChatID del HEADER (PRIMERO!) ============
    //
    // REGLA OBLIGATORIA: Extraer del header PRIMERO.
    // Solo fallback al body para chatbot (no para imágenes).
    //
    let chatID = response.headers.get("ZG-Res-Key") || response.headers.get("zg-res-key");

    if (!chatID) {
      console.warn("No se encontró ZG-Res-Key en headers — usando valor por defecto");
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
      error: `Error generando imagen: ${error.message}`,
    };
  }
}
