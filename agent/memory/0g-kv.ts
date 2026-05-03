/**
 * 0G Storage KV/Log — Memoria persistente descentralizada.
 *
 * Estrategia (hackathon MVP):
 *   - Archivos locales como cache rápido (agent-state.json, agent-log.json)
 *   - Sync periódico a 0G Storage (uploadBuffer → obtiene Merkle Root)
 *   - Al iniciar, intenta descargar de 0G Storage (si hay Merkle Root previo)
 *   - Si falla 0G, usa el archivo local como fallback
 *
 * Esto demuestra:
 *   ✓ KV: estado clave-valor persistente en 0G Storage
 *   ✓ Log: historial inmutable en 0G Storage
 *   ✓ Recuperación entre reinicios desde la red descentralizada
 */
import * as fs from "fs/promises";
import * as path from "path";
import { uploadBuffer, downloadFile } from "../../lib/storage";

const ROOT_FILE = path.join(process.cwd(), ".0g-kv-root");
const STATE_FILE = path.join(process.cwd(), "agent-state.json");
const LOG_FILE = path.join(process.cwd(), "agent-log.json");

interface StoredRoots {
  stateRoot?: string;
  logRoot?: string;
  lastSync: string;
}

/** Carga los Merkle Roots almacenados localmente. */
async function loadRoots(): Promise<StoredRoots> {
  try {
    const raw = await fs.readFile(ROOT_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { lastSync: "never" };
  }
}

/** Guarda los Merkle Roots localmente. */
async function saveRoots(roots: StoredRoots): Promise<void> {
  try {
    await fs.writeFile(ROOT_FILE, JSON.stringify(roots, null, 2));
  } catch (err) {
    console.error("Failed to save 0G KV roots:", err);
  }
}

/**
 * Intenta cargar el estado desde 0G Storage.
 * Si no hay Merkle Root previo o falla la descarga, devuelve null.
 */
async function loadStateFrom0G(): Promise<Record<string, unknown> | null> {
  const roots = await loadRoots();
  if (!roots.stateRoot) return null;

  try {
    const result = await downloadFile(roots.stateRoot);
    if (result.success && result.data) {
      const text = new TextDecoder().decode(result.data);
      return JSON.parse(text);
    }
  } catch (err) {
    console.warn("Failed to load state from 0G Storage:", err);
  }
  return null;
}

/**
 * Intenta cargar el log desde 0G Storage.
 */
async function loadLogFrom0G(): Promise<unknown[] | null> {
  const roots = await loadRoots();
  if (!roots.logRoot) return null;

  try {
    const result = await downloadFile(roots.logRoot);
    if (result.success && result.data) {
      const text = new TextDecoder().decode(result.data);
      return JSON.parse(text);
    }
  } catch (err) {
    console.warn("Failed to load log from 0G Storage:", err);
  }
  return null;
}

/**
 * Inicializa la memoria persistente desde 0G Storage.
 * Intenta cargar estado previo. Si no existe, usa el local.
 */
export async function initMemory(): Promise<void> {
  console.log("🧠 Initializing 0G Storage memory...");

  // Intentar cargar desde 0G
  const remoteState = await loadStateFrom0G();
  const remoteLog = await loadLogFrom0G();

  if (remoteState) {
    await fs.writeFile(STATE_FILE, JSON.stringify(remoteState, null, 2));
    console.log("   ✅ State loaded from 0G Storage");
  } else {
    console.log("   ℹ️  No previous state on 0G, using local");
  }

  if (remoteLog) {
    await fs.writeFile(LOG_FILE, JSON.stringify(remoteLog, null, 2));
    console.log("   ✅ Log loaded from 0G Storage");
  } else {
    console.log("   ℹ️  No previous log on 0G, using local");
  }
}

/**
 * Sincroniza el estado y log actuales a 0G Storage.
 * Se llama periódicamente o después de cambios importantes.
 */
export async function syncTo0G(): Promise<void> {
  try {
    const roots = await loadRoots();

    // Sync state
    const stateData = await fs.readFile(STATE_FILE);
    const stateResult = await uploadBuffer(new Uint8Array(stateData), "json");

    if (stateResult.success && stateResult.merkleRoot) {
      roots.stateRoot = stateResult.merkleRoot;
      console.log("   📤 State synced to 0G Storage:", stateResult.merkleRoot.slice(0, 16) + "...");
    } else {
      console.warn("   ⚠️  Failed to sync state:", stateResult.error);
    }

    // Sync log
    const logData = await fs.readFile(LOG_FILE);
    const logResult = await uploadBuffer(new Uint8Array(logData), "json");

    if (logResult.success && logResult.merkleRoot) {
      roots.logRoot = logResult.merkleRoot;
      console.log("   📤 Log synced to 0G Storage:", logResult.merkleRoot.slice(0, 16) + "...");
    } else {
      console.warn("   ⚠️  Failed to sync log:", logResult.error);
    }

    roots.lastSync = new Date().toISOString();
    await saveRoots(roots);
  } catch (err) {
    console.error("Failed to sync to 0G Storage:", err);
  }
}

/**
 * Obtiene las URLs de StorageScan para el estado y log actuales.
 * Útil para mostrar al usuario dónde está su memoria persistente.
 */
export async function getMemoryUrls(): Promise<{ stateUrl?: string; logUrl?: string }> {
  const roots = await loadRoots();
  const urls: { stateUrl?: string; logUrl?: string } = {};

  if (roots.stateRoot) {
    urls.stateUrl = `https://storagescan.0g.ai/#/file/${roots.stateRoot}`;
  }
  if (roots.logRoot) {
    urls.logUrl = `https://storagescan.0g.ai/#/file/${roots.logRoot}`;
  }

  return urls;
}
