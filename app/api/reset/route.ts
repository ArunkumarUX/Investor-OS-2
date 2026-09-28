import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";
import { enqueue, writeDB } from "@/lib/db";
import { emptyState } from "@/lib/intelligence";
import { seedDB } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = authorize(request, ["/settings"]);
  if ("error" in gate) return gate.error;
  if (gate.persona.id !== "partner") {
    return NextResponse.json({ error: "Only the managing partner can reset this workspace." }, { status: 403 });
  }
  if (process.env.INVEST_OS_ENABLE_RESET !== "1")
    return NextResponse.json({ error: "Workspace reset is disabled." }, { status: 403 });
  const db = seedDB();
  db["prototype-seed-v1"] = [{ id: "prototype-seed-v1" }];
  db["intelligence-v1"] = [{ id: "intelligence-v1", state: emptyState() }];
  db.pipeline = [{ id: "pipeline", stages: {}, history: [] }];
  await enqueue(() => writeDB(db));
  return NextResponse.json({ ok: true });
}
