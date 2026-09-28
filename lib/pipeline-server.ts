import type { DB } from "./db";
import { companies } from "./mock-data";
import { initialDeals, stages, type StageId } from "./pipeline-data";
import { readIntelligence } from "./intelligence";

export interface PipelineMove {
  companyId: string;
  companyName: string;
  from: StageId;
  to: StageId;
  at: string;
  source: "drag" | "committee";
}

export interface PipelineState {
  stages: Record<string, StageId>;
  history: PipelineMove[];
}

const STAGE_IDS = new Set(stages.map((stage) => stage.id));

export function isStageId(value: unknown): value is StageId {
  return typeof value === "string" && STAGE_IDS.has(value as StageId);
}

export function readPipeline(db: DB): PipelineState {
  const row = db.pipeline?.[0];
  const stored = row?.stages;
  const history = row?.history;
  const stagesOnFile: Record<string, StageId> = {};
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [id, stage] of Object.entries(stored)) {
      if (isStageId(stage)) stagesOnFile[id] = stage;
    }
  }
  return {
    stages: stagesOnFile,
    history: Array.isArray(history) ? (history as PipelineMove[]).slice(0, 50) : [],
  };
}

export function writePipeline(db: DB, state: PipelineState): void {
  db.pipeline = [{ id: "pipeline", stages: state.stages, history: state.history.slice(0, 50) }];
}

export function moveStage(
  db: DB,
  input: { companyId: string; to: StageId; from?: StageId; companyName?: string; source?: "drag" | "committee" },
): PipelineState {
  const state = readPipeline(db);
  const company = companies.find((item) => item.id === input.companyId);
  const seed = initialDeals.find((deal) => deal.companyId === input.companyId)?.stageId ?? "discovered";
  const from = input.from && isStageId(input.from) ? input.from : state.stages[input.companyId] ?? seed;
  if (from === input.to && state.stages[input.companyId] === input.to) return state;
  state.stages[input.companyId] = input.to;
  state.history.unshift({
    companyId: input.companyId,
    companyName: input.companyName || company?.name || input.companyId,
    from,
    to: input.to,
    at: new Date().toISOString(),
    source: input.source ?? "drag",
  });
  state.history = state.history.slice(0, 50);
  writePipeline(db, state);
  return state;
}

const VERDICT_STAGE = { invest: "invested", watch: "contacted", reject: "passed" } as const;

export async function pipelineForClient(): Promise<PipelineState> {
  const { readDB } = await import("./db");
  const db = await readDB();
  if (db.pipeline?.[0]) return readPipeline(db);
  const intelligence = await readIntelligence();
  const derived: Record<string, StageId> = {};
  for (const item of intelligence.decisions) {
    if (derived[item.companyId]) continue;
    if (item.verdict === "undo") {
      if (isStageId(item.priorStage)) derived[item.companyId] = item.priorStage;
    } else if (item.verdict === "invest" || item.verdict === "watch" || item.verdict === "reject") {
      derived[item.companyId] = VERDICT_STAGE[item.verdict];
    }
  }
  return { stages: derived, history: [] };
}
