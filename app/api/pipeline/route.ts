import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";
import { enqueue, readDB, writeDB } from "@/lib/db";
import { companies } from "@/lib/mock-data";
import { isStageId, moveStage, pipelineForClient } from "@/lib/pipeline-server";

export const dynamic = "force-dynamic";

const PATHS = ["/pipeline", "/committee", "/memory", "/dashboard", "/deal", "/company"];

export async function GET(request: Request) {
  const gate = authorize(request, PATHS);
  if ("error" in gate) return gate.error;
  return NextResponse.json(await pipelineForClient());
}

export async function POST(request: Request) {
  const gate = authorize(request, ["/pipeline"]);
  if ("error" in gate) return gate.error;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send a JSON object." }, { status: 400 });
  const companyId = String(body.companyId ?? "");
  if (!companies.some((company) => company.id === companyId)) {
    return NextResponse.json({ error: "Choose a company in this workspace." }, { status: 400 });
  }
  if (!isStageId(body.to)) return NextResponse.json({ error: "Choose a pipeline stage." }, { status: 400 });
  if (body.from !== undefined && !isStageId(body.from)) return NextResponse.json({ error: "Choose a pipeline stage." }, { status: 400 });
  const source = body.source === "committee" ? "committee" : "drag";
  const state = await enqueue(async () => {
    const db = await readDB();
    const next = moveStage(db, {
      companyId,
      to: body.to,
      from: body.from,
      companyName: typeof body.companyName === "string" ? body.companyName : undefined,
      source,
    });
    await writeDB(db);
    return next;
  });
  return NextResponse.json(state);
}
