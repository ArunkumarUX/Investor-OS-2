import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, list, create, update, remove, type Collection, type Record as DbRecord } from "@/lib/db";
import { authorizeCollection } from "@/lib/api-guard";

import { validateRecord } from "@/lib/record-validation";

function duplicateSubmission(items: DbRecord[], record: Record<string, unknown>, ignoreId?: string): string | null {
  const email = String(record.email ?? "").trim().toLowerCase();
  const company = String(record.company ?? "").trim().toLowerCase();
  if (!email || !company) return null;
  const match = items.find((item) => item.id !== ignoreId && String(item.email ?? "").trim().toLowerCase() === email && String(item.company ?? "").trim().toLowerCase() === company);
  return match ? "A submission for this company and email is already on file." : null;
}

export const dynamic = "force-dynamic";

function isCollection(v: string): v is Collection {
  return (COLLECTIONS as readonly string[]).includes(v);
}

type Ctx = { params: Promise<{ collection: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection "${collection}"` }, { status: 404 });
  }
  const gate = authorizeCollection(req, collection, "GET");
  if ("error" in gate) return gate.error;
  return NextResponse.json({ items: await list(collection) });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection "${collection}"` }, { status: 404 });
  }
  const gate = authorizeCollection(req, collection, "POST");
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => null);
  if (collection === "submissions" && body && typeof body === "object" && !body.status) body.status = "review";
  const problem = validateRecord(collection, body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (collection === "submissions") {
    const duplicate = duplicateSubmission(await list(collection), body);
    if (duplicate) return NextResponse.json({ error: duplicate }, { status: 409 });
  }
  delete body.id;
  delete body.createdAt;
  delete body.updatedAt;
  const rec = await create(collection, body);
  return NextResponse.json({ item: rec }, { status: 201 });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection "${collection}"` }, { status: 404 });
  }
  const gate = authorizeCollection(req, collection, "PATCH");
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => null);
  const problem = validateRecord(collection, body, true);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const { id, ...patch } = body as Partial<DbRecord> & { id?: string };
  delete patch.createdAt;
  delete patch.updatedAt;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = (await list(collection)).find(item => item.id === String(id));
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const merged = { ...existing, ...patch };
  const mergedProblem = validateRecord(collection, merged, true);
  if (mergedProblem) return NextResponse.json({ error: mergedProblem }, { status: 400 });
  if (collection === "submissions") {
    const duplicate = duplicateSubmission(await list(collection), merged, String(id));
    if (duplicate) return NextResponse.json({ error: duplicate }, { status: 409 });
  }
  const rec = await update(collection, String(id), patch);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: rec });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection "${collection}"` }, { status: 404 });
  }
  const gate = authorizeCollection(req, collection, "DELETE");
  if ("error" in gate) return gate.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await remove(collection, id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
