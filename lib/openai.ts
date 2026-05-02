import OpenAI from "openai";
import "dotenv/config";

import type { ImageGenerationResult } from "./types";

/**
 * Genera una imagen con OpenAI como fallback.
 *
 * Este método NO debe llamarse automáticamente cuando falla 0G.
 * Solo se ejecuta tras consentimiento explícito del usuario desde el modal.
 */
export async function generateImageWithOpenAI(
  prompt: string,
  size: "auto" | "1024x1024" | "1024x1536" | "1536x1024" = "auto"
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      source: "openai-fallback",
      zkResKey: "",
      providerAddress: "openai",
      model: "gpt-image-1",
      prompt,
      error: "OPENAI_API_KEY not configured in the environment",
    };
  }

  try {
    const client = new OpenAI({ apiKey });

    const result = await client.images.generate({
      // Perfil económico para demo
      model: "gpt-image-1-mini",
      prompt,
      size,
      quality: "low" as any,
      output_format: "jpeg",
      output_compression: 65,
    } as any);

    const b64 = result.data?.[0]?.b64_json;

    if (!b64) {
      return {
        success: false,
        source: "openai-fallback",
        zkResKey: "",
        providerAddress: "openai",
        model: "gpt-image-1-mini",
        prompt,
        error: "OpenAI no devolvió imagen en base64",
      };
    }

    const imageData = new Uint8Array(Buffer.from(b64, "base64"));

    return {
      success: true,
      source: "openai-fallback",
      imageData,
      zkResKey: "openai-fallback", // campo semántico para mantener compatibilidad de UI
      providerAddress: "openai",
      model: "gpt-image-1-mini",
      prompt,
    };
  } catch (error: any) {
    return {
      success: false,
      source: "openai-fallback",
      zkResKey: "",
      providerAddress: "openai",
      model: "gpt-image-1-mini",
      prompt,
      error: `Error OpenAI fallback: ${error.message}`,
    };
  }
}
