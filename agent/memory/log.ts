/**
 * Historial (Log) de verificaciones del agente.
 * Registra cada interacción para auditoría y análisis.
 * Persiste a archivo JSON. Diseñado para respaldarse en 0G Storage.
 */
import * as fs from "fs/promises";
import * as path from "path";

const LOG_FILE = path.join(process.cwd(), "agent-log.json");

interface LogEntry {
  id: string;
  userId: number;
  username?: string;
  action: "verify" | "command";
  merkleRoot?: string;
  verified: boolean;
  timestamp: string;
  message?: string;
}

/** Carga el log desde archivo. */
async function loadLog(): Promise<LogEntry[]> {
  try {
    const raw = await fs.readFile(LOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Guarda el log al archivo. */
async function saveLog(log: LogEntry[]): Promise<void> {
  try {
    await fs.writeFile(LOG_FILE, JSON.stringify(log, null, 2));
  } catch (error) {
    console.error("Failed to save agent log:", error);
  }
}

/**
 * Registra una entrada en el log.
 */
export async function appendLog(entry: Omit<LogEntry, "id" | "timestamp">): Promise<void> {
  const log = await loadLog();
  log.push({
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  });
  await saveLog(log);
}

/**
 * Obtiene las últimas N entradas del log.
 */
export async function getRecentLogs(limit: number = 50): Promise<LogEntry[]> {
  const log = await loadLog();
  return log.slice(-limit).reverse();
}

/**
 * Obtiene logs filtrados por usuario.
 */
export async function getUserLogs(userId: number, limit: number = 20): Promise<LogEntry[]> {
  const log = await loadLog();
  return log
    .filter((entry) => entry.userId === userId)
    .slice(-limit)
    .reverse();
}
