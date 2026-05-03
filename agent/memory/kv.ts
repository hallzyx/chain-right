/**
 * Memoria KV (Key-Value) del agente.
 * Persiste estado del agente y de usuarios en un archivo JSON.
 * Diseñado para respaldarse en 0G Storage periódicamente.
 */
import * as fs from "fs/promises";
import * as path from "path";

const STATE_FILE = path.join(process.cwd(), "agent-state.json");

interface AgentState {
  users: Record<string, UserState>;
  global: {
    totalScans: number;
    totalVerified: number;
    startedAt: string;
  };
}

interface UserState {
  userId: number;
  username?: string;
  totalScans: number;
  verifiedCount: number;
  lastScan: string;
  lastMerkleRoot?: string;
}

/** Carga el estado desde el archivo, o crea uno nuevo. */
async function loadState(): Promise<AgentState> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      users: {},
      global: {
        totalScans: 0,
        totalVerified: 0,
        startedAt: new Date().toISOString(),
      },
    };
  }
}

/** Guarda el estado al archivo. */
async function saveState(state: AgentState): Promise<void> {
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Failed to save agent state:", error);
  }
}

/** Obtiene o crea el estado de un usuario. */
async function getUserState(userId: number, username?: string): Promise<UserState> {
  const state = await loadState();
  if (!state.users[userId]) {
    state.users[userId] = {
      userId,
      username,
      totalScans: 0,
      verifiedCount: 0,
      lastScan: "Never",
    };
    await saveState(state);
  } else if (username && state.users[userId].username !== username) {
    state.users[userId].username = username;
    await saveState(state);
  }
  return state.users[userId];
}

/**
 * Registra una verificación en el estado del usuario.
 */
export async function recordVerification(
  userId: number,
  username?: string,
  verified: boolean = false,
  merkleRoot?: string
): Promise<void> {
  const state = await loadState();

  // Usuario
  const user = state.users[userId] || {
    userId,
    username,
    totalScans: 0,
    verifiedCount: 0,
    lastScan: "Never",
  };
  user.totalScans++;
  if (verified) user.verifiedCount++;
  user.lastScan = new Date().toISOString();
  if (merkleRoot) user.lastMerkleRoot = merkleRoot;
  if (username) user.username = username;
  state.users[userId] = user;

  // Global
  state.global.totalScans++;
  if (verified) state.global.totalVerified++;

  await saveState(state);
}

/**
 * Obtiene estadísticas de un usuario.
 */
export async function getUserStats(
  userId: number
): Promise<{ totalScans: number; verifiedCount: number; lastScan: string }> {
  const user = await getUserState(userId);
  return {
    totalScans: user.totalScans,
    verifiedCount: user.verifiedCount,
    lastScan: user.lastScan === "Never" ? "Never" : new Date(user.lastScan).toLocaleString(),
  };
}

/**
 * Obtiene estadísticas globales del agente.
 */
export async function getGlobalStats(): Promise<AgentState["global"]> {
  const state = await loadState();
  return state.global;
}
