import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";
import { readDB, writeDB, uid, enqueue, type DB } from "@/lib/db";
import type { CaptureItem, CaptureKind } from "@/lib/capture";

const PATHS = ["/deal", "/diligence", "/pipeline", "/committee", "/memo", "/library", "/company"];

export const dynamic = "force-dynamic";

// Capture items live in the same file-backed store as all other collections.
interface Store {
  captures?: CaptureItem[];
  [key: string]: unknown;
}

async function loadCaptures(): Promise<CaptureItem[]> {
  const db = (await readDB()) as unknown as Store;
  db.captures ??= [];
  return db.captures;
}

async function saveCaptures(items: CaptureItem[]): Promise<void> {
  const db = (await readDB()) as unknown as Store;
  db.captures = items;
  await writeDB(db as unknown as DB);
}

// GET /api/capture            -> all items (newest first)
// GET /api/capture?companyId= -> items for one deal
// GET /api/capture?summary=1  -> per-company item counts
export async function GET(req: NextRequest) {
  const gate = authorize(req, PATHS);
  if ("error" in gate) return gate.error;
  const items = await loadCaptures();
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (searchParams.get("summary")) {
    const summary: Record<string, { total: number; kinds: Record<string, number> }> = {};
    for (const item of items) {
      const bucket = (summary[item.companyId] ??= { total: 0, kinds: {} });
      bucket.total += 1;
      bucket.kinds[item.kind] = (bucket.kinds[item.kind] ?? 0) + 1;
    }
    return NextResponse.json({ summary });
  }

  const filtered = companyId ? items.filter((i) => i.companyId === companyId) : items;
  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ items: filtered });
}

// POST /api/capture -> create one capture item
export async function POST(req: NextRequest) {
  const gate = authorize(req, PATHS);
  if ("error" in gate) return gate.error;
  const body = (await req.json()) as Partial<CaptureItem>;
  if (!body.companyId || !body.kind) {
    return NextResponse.json({ error: "companyId and kind are required" }, { status: 400 });
  }

  const item: CaptureItem = {
    id: uid("cap"),
    companyId: body.companyId,
    kind: body.kind as CaptureKind,
    body: String(body.body ?? ""),
    author: body.author || "You",
    createdAt: new Date().toISOString(),
    meta: body.meta ?? {},
  };

  await enqueue(async () => {
    const items = await loadCaptures();
    items.push(item);
    await saveCaptures(items);
  });
  return NextResponse.json({ item }, { status: 201 });
}

// PATCH /api/capture -> update body/meta (answer a question, tick a task/doc)
export async function PATCH(req: NextRequest) {
  const gate = authorize(req, PATHS);
  if ("error" in gate) return gate.error;
  const { id: itemId, ...patch } = (await req.json()) as Partial<CaptureItem> & { id: string };
  if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const result = await enqueue(async () => {
    const items = await loadCaptures();
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) return null;
    items[idx] = {
      ...items[idx],
      body: patch.body ?? items[idx].body,
      meta: { ...items[idx].meta, ...(patch.meta ?? {}) },
    };
    await saveCaptures(items);
    return items[idx];
  });

  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: result });
}

// DELETE /api/capture?id= -> remove one item
export async function DELETE(req: NextRequest) {
  const gate = authorize(req, PATHS);
  if ("error" in gate) return gate.error;
  const itemId = new URL(req.url).searchParams.get("id");
  if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const removed = await enqueue(async () => {
    const items = await loadCaptures();
    const next = items.filter((i) => i.id !== itemId);
    if (next.length === items.length) return false;
    await saveCaptures(next);
    return true;
  });

  if (!removed) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
