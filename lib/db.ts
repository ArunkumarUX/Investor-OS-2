// Server-side JSON store for Investor OS demo (file-backed, no external DB).
// Collections are whitelisted; each record is a plain object with `id`.

import { promises as fs } from "fs";
import path from "path";

export const COLLECTIONS = [
  "deals",
  "contacts",
  "tasks",
  "commitments",
  "research",
  "strategy",
  "notifications",
  "submissions",
  "integrations",
] as const;

export type Collection = (typeof COLLECTIONS)[number];

export interface Record {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface DB {
  [key: string]: Record[];
}

const FILE = process.env.INVEST_OS_DATA_FILE || path.join(process.cwd(), "data", "store.json");

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---- Write serialization -------------------------------------------------
// Every mutation runs inside this queue so concurrent requests never interleave
// read-modify-write cycles (which previously lost writes under parallel POSTs).
let writeQueue: Promise<unknown> = Promise.resolve();
let memCache: DB | null = null;

export async function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.catch(() => {});
  return result;
}

export async function readDB(): Promise<DB> {
  if (memCache) return structuredClone(memCache);
  try {
    const raw = await fs.readFile(/* turbopackIgnore: true */ FILE, "utf8");
    const parsed = JSON.parse(raw) as DB;
    for (const c of COLLECTIONS) parsed[c] ??= [];
    memCache = parsed;
    return structuredClone(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const { seedDB } = await import("./seed");
    const db = seedDB();
    await writeDB(db);
    return structuredClone(db);
  }
}

export async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const temporary = `${FILE}.${process.pid}.tmp`;
  const handle = await fs.open(temporary, "w", 0o600);
  try {
    await handle.writeFile(JSON.stringify(db, null, 2), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(temporary, FILE);
  memCache = structuredClone(db);
}

/** Drop the in-memory cache (used after external file deletion, e.g. /api/reset). */
export function invalidateCache(): void {
  memCache = null;
}

export async function list(collection: Collection): Promise<Record[]> {
  const db = await readDB();
  return db[collection] ?? [];
}

export async function create(collection: Collection, input: Partial<Record>): Promise<Record> {
  return enqueue(async () => {
    const db = await readDB();
    const rec: Record = {
      ...input,
      id: String(input.id ?? uid(collection.slice(0, 3))),
      createdAt: String(input.createdAt ?? new Date().toISOString()),
      updatedAt: new Date().toISOString(),
    } as Record;
    db[collection] = [...(db[collection] ?? []), rec];
    await writeDB(db);
    return rec;
  });
}

export async function update(
  collection: Collection,
  id: string,
  patch: Partial<Record>
): Promise<Record | null> {
  return enqueue(async () => {
    const db = await readDB();
    const idx = (db[collection] ?? []).findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const merged: Record = {
      ...db[collection][idx],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    } as Record;
    db[collection][idx] = merged;
    await writeDB(db);
    return merged;
  });
}

export async function remove(collection: Collection, id: string): Promise<boolean> {
  return enqueue(async () => {
    const db = await readDB();
    const before = (db[collection] ?? []).length;
    db[collection] = (db[collection] ?? []).filter((r) => r.id !== id);
    if (db[collection].length === before) return false;
    await writeDB(db);
    return true;
  });
}

/** Serialized multi-record create (used by batch capture actions). */
export async function createMany(
  collection: Collection,
  inputs: Partial<Record>[]
): Promise<Record[]> {
  return enqueue(async () => {
    const db = await readDB();
    const now = new Date().toISOString();
    const recs: Record[] = inputs.map((input) => ({
      ...input,
      id: String(input.id ?? uid(collection.slice(0, 3))),
      createdAt: String(input.createdAt ?? now),
      updatedAt: now,
    }) as Record);
    db[collection] = [...(db[collection] ?? []), ...recs];
    await writeDB(db);
    return recs;
  });
}

export { uid };
