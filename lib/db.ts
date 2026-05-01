import * as fs from "fs/promises";
import * as path from "path";

export interface DbUser {
  wallet: string;
  lastLoginAt: string;
}

export interface DbWork {
  id: string;
  wallet: string;
  title: string;
  prompt: string;
  source: "0g-compute" | "openai-fallback";
  model: string;
  imageDataUrl: string;
  merkleRoot: string;
  storageTxHash?: string;
  contractAddress: string;
  tokenId?: string;
  mintTxHash?: string;
  status: "generated" | "stored" | "minted";
  createdAt: string;
}

export interface DbSchema {
  users: DbUser[];
  works: DbWork[];
}

const DB_PATH = path.join(process.cwd(), "db.json");

/**
 * Crea estructura vacía de DB si no existe.
 */
async function ensureDbFile(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    const initial: DbSchema = { users: [], works: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

/**
 * Lee la DB JSON completa.
 */
export async function readDb(): Promise<DbSchema> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as DbSchema;
}

/**
 * Persiste la DB JSON completa.
 */
export async function writeDb(data: DbSchema): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Upsert de usuario por wallet.
 */
export async function upsertUser(wallet: string): Promise<DbUser> {
  const db = await readDb();
  const normalized = wallet.toLowerCase();
  const now = new Date().toISOString();
  const existing = db.users.find((u) => u.wallet.toLowerCase() === normalized);

  if (existing) {
    existing.lastLoginAt = now;
    await writeDb(db);
    return existing;
  }

  const user: DbUser = { wallet, lastLoginAt: now };
  db.users.push(user);
  await writeDb(db);
  return user;
}

/**
 * Guarda una obra en la colección works.
 */
export async function saveWork(work: DbWork): Promise<DbWork> {
  const db = await readDb();
  db.works.unshift(work);
  await writeDb(db);
  return work;
}

/**
 * Lista obras de una wallet.
 */
export async function getWorksByWallet(wallet: string): Promise<DbWork[]> {
  const db = await readDb();
  const normalized = wallet.toLowerCase();
  return db.works.filter((w) => w.wallet.toLowerCase() === normalized);
}
