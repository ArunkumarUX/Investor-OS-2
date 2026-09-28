import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";
import { isStageId, moveStage, readPipeline } from "@/lib/pipeline-server";
import { readDB } from "@/lib/db";
import { initialDeals, stages } from "@/lib/pipeline-data";
import { companies } from "@/lib/mock-data";
import { activeEngine } from "@/lib/ai-engine";
import {
  analyzeRole,
  changeIntelligence,
  readIntelligence,
  requiredText,
  reviewIsStale,
  safeUrl,
} from "@/lib/intelligence";
import {
  AGENTS,
  type AnalysisRun,
  type AgentResult,
} from "@/lib/intelligence-types";
export const dynamic = "force-dynamic";
export const maxDuration = 600;
const WORKSPACE = ["/pipeline", "/committee", "/research", "/diligence", "/deal", "/memo", "/memory", "/company", "/signals"];

export async function GET(request: Request) {
  const gate = authorize(request, WORKSPACE);
  if ("error" in gate) return gate.error;
  return NextResponse.json({
    ...(await readIntelligence()),
    aiConfigured: activeEngine() !== "none",
  });
}
export async function POST(request: Request) {
  const gate = authorize(request, WORKSPACE);
  if ("error" in gate) return gate.error;
  try {
    if (Number(request.headers.get("content-length")) > 100000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const body = await request.json();
    if (!body || typeof body !== "object")
      throw new Error("Send a JSON object.");
    const companyId = requiredText(body.companyId, "Company", 100);
    if (!companies.some((c) => c.id === companyId))
      throw new Error("Choose a company in this workspace.");
    const now = new Date().toISOString();
    if (body.action === "decision") {
      if (!["invest", "watch", "reject", "undo"].includes(body.verdict))
        throw new Error("Choose a valid verdict.");
      if (
        typeof body.confidence !== "number" ||
        !Number.isFinite(body.confidence) ||
        body.confidence < 0 ||
        body.confidence > 100
      )
        throw new Error("Confidence must be between 0 and 100.");
      const rationale = requiredText(
        body.rationale,
        "Decision rationale",
        5000,
      );
      const item = await changeIntelligence((s, db) => {
        const prior = s.decisions.find((d) => d.companyId === companyId);
        if ((prior?.revision ?? null) !== (body.expectedRevision ?? null))
          throw new Error(
            "The decision changed in another session. Refresh before recording your verdict.",
          );
        if (body.verdict === "undo" && (!prior || prior.verdict === "undo"))
          throw new Error("There is no current decision to undo.");
        const priorStage =
          prior && prior.verdict !== "undo"
            ? prior.priorStage
            : stages.some((s) => s.id === body.priorStage)
              ? body.priorStage
              : (initialDeals.find((d) => d.companyId === companyId)?.stageId ??
                "committee");
        const item = {
          companyId,
          revision: crypto.randomUUID(),
          verdict: body.verdict,
          confidence: body.confidence,
          rationale,
          createdAt: now,
          priorStage,
        };
        s.decisions.unshift(item);
        s.versions.unshift({
          id: crypto.randomUUID(),
          companyId,
          createdAt: now,
          trigger:
            body.verdict === "undo"
              ? "Decision reopened"
              : `Decision: ${body.verdict}`,
          body: rationale,
          sourceIds: [],
        });
        db.captures = (db.captures ?? []).filter(
          (c) => !(c.companyId === companyId && c.kind === "decision"),
        );
        if (body.verdict !== "undo")
          db.captures.unshift({
            id: crypto.randomUUID(),
            companyId,
            kind: "decision",
            body: rationale,
            author: "Workspace user",
            createdAt: now,
            meta: { verdict: body.verdict, confidence: body.confidence },
          });
        const to =
          body.verdict === "undo"
            ? priorStage
            : ({ invest: "invested", watch: "contacted", reject: "passed" } as const)[body.verdict as "invest" | "watch" | "reject"];
        if (isStageId(to)) moveStage(db, { companyId, to, from: isStageId(priorStage) ? priorStage : undefined, source: "committee" });
        return item;
      });
      return NextResponse.json({ item, pipeline: readPipeline(await readDB()) }, { status: 201 });
    }
    if (body.action === "evidence") {
      const item = {
        id: crypto.randomUUID(),
        companyId,
        title: requiredText(body.title, "Source title", 300),
        body: requiredText(body.body, "Evidence excerpt", 12000),
        url: safeUrl(body.url),
        createdAt: now,
        provenance: "user-supplied" as const,
      };
      await changeIntelligence((s) => {
        s.evidence.unshift(item);
      });
      return NextResponse.json({ item }, { status: 201 });
    }
    if (body.action === "event") {
      if (!["risk", "opportunity", "neutral"].includes(body.impact))
        throw new Error("Choose an impact.");
      const item = {
        id: crypto.randomUUID(),
        companyId,
        title: requiredText(body.title, "What changed", 300),
        detail: requiredText(body.detail, "Impact explanation"),
        sourceUrl: safeUrl(body.sourceUrl),
        impact: body.impact as "risk" | "opportunity" | "neutral",
        createdAt: now,
        acknowledged: false,
      };
      await changeIntelligence((s) => {
        s.events.unshift(item);
        s.versions.unshift({
          id: crypto.randomUUID(),
          companyId,
          createdAt: now,
          trigger: `New ${item.impact} event`,
          body: `${item.title}\n\n${item.detail}\n\nSource: ${item.sourceUrl}\n\nUser-reported ${item.impact}; review before changing the thesis.`,
          sourceIds: [item.id],
        });
      });
      return NextResponse.json({ item }, { status: 201 });
    }
    if (body.action === "acknowledge") {
      await changeIntelligence((s) => {
        const item = s.events.find(
          (e) => e.id === body.id && e.companyId === companyId,
        );
        if (!item) throw new Error("Event not found.");
        item.acknowledged = true;
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "forecast") {
      const statement = requiredText(body.statement, "Prediction", 1000);
      if (
        typeof body.probability !== "number" ||
        !Number.isFinite(body.probability) ||
        body.probability < 0 ||
        body.probability > 100
      )
        throw new Error("Probability must be between 0 and 100.");
      if (
        typeof body.due !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(body.due) ||
        !Number.isFinite(Date.parse(body.due)) ||
        new Date(body.due).toISOString().slice(0, 10) !== body.due
      )
        throw new Error("Choose a valid review date.");
      const item = {
        id: crypto.randomUUID(),
        companyId,
        statement,
        probability: body.probability,
        due: body.due,
        createdAt: now,
      };
      await changeIntelligence((s) => {
        s.forecasts.unshift(item);
      });
      return NextResponse.json({ item }, { status: 201 });
    }
    if (body.action === "outcome") {
      if (typeof body.outcome !== "boolean")
        throw new Error("Choose whether the prediction happened.");
      const note = requiredText(body.note, "Outcome evidence", 3000);
      await changeIntelligence((s) => {
        const item = s.forecasts.find(
          (f) => f.id === body.id && f.companyId === companyId,
        );
        if (!item) throw new Error("Prediction not found.");
        if (item.resolvedAt)
          throw new Error("This outcome has already been recorded.");
        item.outcome = body.outcome;
        item.outcomeNote = note;
        item.resolvedAt = now;
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action !== "run") throw new Error("Unknown action.");
    if (!["sample", "ai"].includes(body.mode))
      throw new Error("Choose sample or AI analysis.");
    if (body.mode === "ai" && activeEngine() === "none")
      return NextResponse.json(
        { error: "Configure an AI service in the server environment first." },
        { status: 503 },
      );
    const run = await changeIntelligence((s) => {
      if (
        s.runs.some(
          (r) =>
            r.companyId === companyId &&
            r.status === "running" &&
            !reviewIsStale(r),
        )
      )
        throw new Error("A review is already running for this company.");
      for (const previous of s.runs.filter((r) => reviewIsStale(r))) {
        previous.status = "failed";
        previous.completedAt = now;
        previous.agents = previous.agents.map((a) =>
          a.status === "running" || a.status === "queued"
            ? {
                ...a,
                status: "failed",
                error: "Review interrupted. Start a new review to retry.",
              }
            : a,
        );
      }
      const previous = body.retryOf
        ? s.runs.find(
            (r) =>
              r.id === body.retryOf &&
              r.companyId === companyId &&
              r.mode === body.mode &&
              ["partial", "failed"].includes(r.status),
          )
        : undefined;
      if (body.retryOf && !previous)
        throw new Error("Choose an incomplete review to retry.");
      const packet =
        previous?.evidence ??
        s.evidence.filter((e) => e.companyId === companyId).slice(0, 12);
      if (body.mode === "ai" && !packet.length)
        throw new Error("Add evidence before running AI analysis.");
      const item: AnalysisRun = {
        id: crypto.randomUUID(),
        companyId,
        createdAt: now,
        mode: body.mode,
        status: "running",
        touchedAt: now,
        evidence: structuredClone(packet),
        retryOf: previous?.id,
        agents: AGENTS.map((a) => {
          const completed = previous?.agents.find(
            (old) => old.id === a.id && old.status === "complete",
          );
          return completed && a.id !== "partner"
            ? structuredClone(completed)
            : { id: a.id, status: "queued" };
        }),
      };
      s.runs.unshift(item);
      return item;
    });
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (value: unknown) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
          } catch {
            /* Reader closed; persistence still completes. */
          }
        };
        const beat = setInterval(() => {
          void changeIntelligence((s) => {
            const current = s.runs.find((r) => r.id === run.id);
            if (current?.status === "running") current.touchedAt = new Date().toISOString();
          });
        }, 10000);
        const results: AgentResult[] = run.agents.filter(
          (a) => a.status === "complete",
        );
        const execute = async (id: AgentResult["id"]) => {
          const preserved = run.agents.find(
            (a) => a.id === id && a.status === "complete",
          );
          if (preserved) {
            emit(preserved);
            return;
          }
          await changeIntelligence((s) => {
            s.runs
              .find((r) => r.id === run.id)!
              .agents.find((a) => a.id === id)!.status = "running";
          });
          emit({ id, status: "running" });
          let result: AgentResult;
          try {
            result = await analyzeRole(
              id,
              companyId,
              run.evidence,
              run.mode,
              results,
            );
          } catch (error) {
            result = {
              id,
              status: "failed",
              error:
                error instanceof Error
                  ? error.message
                  : "Analysis could not finish. Retry with a new review.",
            };
          }
          results.push(result);
          await changeIntelligence((s) => {
            const r = s.runs.find((r) => r.id === run.id)!;
            r.agents = r.agents.map((a) => (a.id === id ? result : a));
          });
          emit(result);
        };
        try {
          emit({ runId: run.id, status: "running" });
          for (let i = 0; i < 6; i += 3)
            await Promise.all(AGENTS.slice(i, i + 3).map((a) => execute(a.id)));
          await execute("portfolio");
          await execute("partner");
          await changeIntelligence((s, db) => {
            const r = s.runs.find((r) => r.id === run.id)!;
            const completed = r.agents.filter(
              (a) => a.status === "complete",
            ).length;
            r.status =
              completed === 8 ? "complete" : completed ? "partial" : "failed";
            r.completedAt = new Date().toISOString();
            if (completed === 8)
              db.captures = [
                {
                  id: crypto.randomUUID(),
                  companyId,
                  kind: "diligence",
                  body: `${r.mode === "sample" ? "Sample" : "AI"} eight-role review completed. Evidence packet saved with review ${r.id}.`,
                  author: "Investment team",
                  createdAt: r.completedAt,
                },
                ...(db.captures ?? []),
              ];
            if (completed)
              s.versions.unshift({
                id: crypto.randomUUID(),
                companyId,
                createdAt: r.completedAt,
                trigger: `${r.mode === "sample" ? "Sample" : "AI"} review · ${completed}/8 perspectives`,
                body: r.agents
                  .filter((a) => a.status === "complete")
                  .map(
                    (a) =>
                      `${AGENTS.find((d) => d.id === a.id)!.label}\n${a.summary}\n${a.claims?.map((c) => `${c.kind}: ${c.text} [${c.sourceIds.join(", ")}]`).join("\n")}`,
                  )
                  .join("\n\n"),
                sourceIds: r.evidence.map((e) => e.id),
              });
          });
          emit({ done: true });
        } catch {
          await changeIntelligence((s) => {
            const r = s.runs.find((r) => r.id === run.id);
            if (r) {
              r.status = "failed";
              r.completedAt = new Date().toISOString();
            }
          });
          emit({ error: "Review interrupted; the completed work is saved." });
        } finally {
          clearInterval(beat);
          try {
            controller.close();
          } catch {}
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Request could not be processed.",
      },
      { status: 400 },
    );
  }
}
