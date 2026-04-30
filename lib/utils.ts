import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilidad para combinar clases de Tailwind.
 * Útil para clases condicionales y evitar conflictos.
 * 
 * @example
 * cn("px-4 py-2", isActive && "bg-blue-500")
 * cn("px-4", className) // className puede sobreescribir
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un address para mostrar en la UI.
 * Ej: "0x1234...5678"
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formatea un timestamp en segundos a fecha legible.
 */
export function formatTimestamp(timestamp: bigint | number): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convierte bytes32 de Solidity a string hex.
 * Asegura que empiece con 0x.
 */
export function bytes32ToHex(value: string | Uint8Array): string {
  if (typeof value === "string") {
    return value.startsWith("0x") ? value : `0x${value}`;
  }
  return "0x" + Buffer.from(value).toString("hex");
}

/**
 * Convierte un Buffer/Uint8Array a base64 data URL.
 * Útil para mostrar imágenes en <img src={...}>
 */
export function bufferToDataUrl(data: Uint8Array, mimeType = "image/png"): string {
  const base64 = Buffer.from(data).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Modifica UN SOLO PÍXEL de una imagen PNG para demo.
 * Esto cambia COMPLETAMENTE el Merkle Root.
 * 
 * @warning SOLO PARA DEMO - Wow moment
 */
export function modifyOnePixel(imageData: Uint8Array): Uint8Array {
  const modified = new Uint8Array(imageData);
  
  // Buscamos un lugar seguro para modificar (evitamos headers PNG)
  // Simple: modificamos el byte en la posición 100 si existe
  if (modified.length > 100) {
    modified[100] = modified[100] ^ 0x01; // Flip el último bit
  }
  
  return modified;
}

/**
 * Espera X milisegundos. Útil para loading states en demo.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
