// Investor OS — client-side persistence layer (demo mode)
// Closes the loop: pipeline moves, committee decisions, DNA profile all persist
// across reloads via localStorage, with a timestamped audit history.

import type { SavedDecision } from "./intelligence-types";
import { initialDeals, type StageId } from "./pipeline-data";

const KEYS = {
  stages: "ios_deal_stages",
  history: "ios_stage_history",
  decisions: "ios_decisions",
  revisions: "ios_decision_revisions",
  dna: "ios_dna",
  lpSent: "ios_lp_sent",
};

export interface StageMove {
  companyId: string;
  companyName: string;
  from: StageId;
  to: StageId;
  at: string; // ISO timestamp
  source: "drag" | "committee";
}

export interface Decision {
  revision?: string;
  decision: "invest" | "watch" | "reject";
  confidence: number;
  at: string;
  priorStage?: StageId;
  rationale?: string;
}

export interface DNAProfile {
  sectors: string[];
  stages: string[];
  geos: string[];
  checkSize: string;
  savedAt: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// ---- Reactive store: lets client components subscribe without mount effects ----
const listeners = new Set<() => void>();
let cachedSnapshot: string | null = null;
const SERVER_SNAPSHOT = '{"stages":{},"decisions":{},"history":[]}';

function buildSnapshot(): string {
  return JSON.stringify({
    stages: getDealStages(),
    decisions: getDecisions(),
    history: getStageHistory(),
    dna: getDNA(),
  });
}

export interface StoreSnapshot {
  stages: Record<string, StageId>;
  decisions: Record<string, Decision>;
  history: StageMove[];
  dna?: DNAProfile | null;
}

export function subscribeStore(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Client snapshot — cached so useSyncExternalStore sees a stable reference. */
export function getStoreSnapshot(): string {
  if (cachedSnapshot === null) cachedSnapshot = buildSnapshot();
  return cachedSnapshot;
}

/** Server/initial snapshot — constant, so hydration matches the seed state. */
export function getStoreServerSnapshot(): string {
  return SERVER_SNAPSHOT;
}

export function parseSnapshot(raw: string): StoreSnapshot {
  try {
    return JSON.parse(raw) as StoreSnapshot;
  } catch {
    return { stages: {}, decisions: {}, history: [] };
  }
}

function emitStoreChange(): void {
  cachedSnapshot = null;
  listeners.forEach((l) => l());
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearLocalWorkspace(): void {
  if (!isBrowser()) return;
  for (const key of Object.values(KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
  cachedSnapshot = null;
  emitStoreChange();
}

// ---- Deal stages ----
export function getDealStages(): Record<string, StageId> {
  return read<Record<string, StageId>>(KEYS.stages, {});
}

export async function setDealStage(
  companyId: string,
  to: StageId,
  opts: {
    companyName?: string;
    from?: StageId;
    source?: "drag" | "committee";
  } = {},
): Promise<void> {
  const stages = getDealStages();
  const from =
    opts.from ??
    stages[companyId] ??
    initialDeals.find((d) => d.companyId === companyId)?.stageId ??
    "discovered";
  const response = await fetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyId,
      to,
      from,
      companyName: opts.companyName ?? companyId,
      source: opts.source ?? "drag",
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "The stage could not be saved.");
  applyServerPipeline(data);
}

export function getStageHistory(): StageMove[] {
  return read<StageMove[]>(KEYS.history, []);
}

// ---- Committee decisions ----
export function getDecisions(): Record<string, Decision> {
  return read<Record<string, Decision>>(KEYS.decisions, {});
}

const decisionRevisions = new Map<string, string>();
export function applyServerPipeline(state: { stages?: Record<string, StageId>; history?: StageMove[] }): void {
  const stages: Record<string, StageId> = {};
  for (const [id, stage] of Object.entries(state.stages ?? {})) stages[id] = stage;
  const history = (state.history ?? []).slice(0, 50);
  const stagesOk = write(KEYS.stages, stages);
  const historyOk = write(KEYS.history, history);
  emitStoreChange();
  if (!stagesOk || !historyOk) throw new Error("The server saved this move, but this browser could not store it.");
}
export function applyServerDecisions(records: SavedDecision[], options?: { replace?: boolean }): void {
  const latest = new Map<string, SavedDecision>();
  for (const item of records)
    if (!latest.has(item.companyId)) latest.set(item.companyId, item);
  const decisions = options?.replace ? {} : { ...getDecisions() };
  const revisions = options?.replace ? {} : { ...read<Record<string, string>>(KEYS.revisions, {}) };
  for (const [id, item] of latest) {
    if (item.verdict === "undo") {
      delete decisions[id];
      delete revisions[id];
      decisionRevisions.delete(id);
      continue;
    }
    decisionRevisions.set(id, item.revision);
    revisions[id] = item.revision;
    decisions[id] = {
      decision: item.verdict,
      confidence: item.confidence,
      rationale: item.rationale,
      at: item.createdAt,
      priorStage: item.priorStage as StageId,
      revision: item.revision,
    };
  }
  if (options?.replace) {
    for (const id of [...decisionRevisions.keys()]) {
      if (!latest.has(id) || latest.get(id)?.verdict === "undo") decisionRevisions.delete(id);
    }
  }
  write(KEYS.revisions, revisions);
  write(KEYS.decisions, decisions);
  emitStoreChange();
}
export async function refreshServerDecisions(): Promise<void> {
  const response = await fetch("/api/intelligence", { cache: "no-store" });
  if (response.status === 401 || response.status === 403) return;
  if (!response.ok) throw new Error("Saved decisions could not load.");
  const data = await response.json();
  applyServerDecisions(data.decisions ?? [], { replace: true });
  const pipeline = await fetch("/api/pipeline", { cache: "no-store" });
  if (pipeline.ok) applyServerPipeline(await pipeline.json());
  const strategy = await fetch("/api/data/strategy", { cache: "no-store" });
  if (strategy.ok) {
    const body = await strategy.json();
    const row = body.items?.[0] as { sectors?: unknown; stages?: unknown; geos?: unknown; checkSize?: unknown; updatedAt?: string; createdAt?: string } | undefined;
    if (row) hydrateDNA(row);
  }
}
export async function recordDecision(
  companyId: string,
  companyName: string,
  decision: Decision["decision"],
  confidence: number,
  rationale = "",
): Promise<void> {
  const priorStage =
    getDealStages()[companyId] ??
    initialDeals.find((d) => d.companyId === companyId)?.stageId ??
    "committee";
  const response = await fetch("/api/intelligence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "decision",
      companyId,
      verdict: decision,
      confidence,
      rationale,
      priorStage,
      expectedRevision:
        decisionRevisions.get(companyId) ??
        read<Record<string, string>>(KEYS.revisions, {})[companyId] ??
        getDecisions()[companyId]?.revision ??
        null,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Decision was not saved.");
  if (data.pipeline) applyServerPipeline(data.pipeline);
  applyServerDecisions([data.item]);
}
export async function clearDecision(
  companyId: string,
  companyName: string,
): Promise<void> {
  const prior = getDecisions()[companyId];
  if (!prior) throw new Error("No decision to reopen.");
  const response = await fetch("/api/intelligence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "decision",
      companyId,
      verdict: "undo",
      confidence: prior.confidence,
      rationale: "Decision reopened for a new review.",
      expectedRevision:
        decisionRevisions.get(companyId) ?? prior.revision ?? null,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Decision was not reopened.");
  if (data.pipeline) applyServerPipeline(data.pipeline);
  applyServerDecisions([data.item]);
}

// ---- Investment DNA ----
export function getDNA(): DNAProfile | null {
  return read<DNAProfile | null>(KEYS.dna, null);
}

export function saveDNA(dna: Omit<DNAProfile, "savedAt">, savedAt = new Date().toISOString()): DNAProfile {
  const profile: DNAProfile = { ...dna, savedAt };
  const ok = write(KEYS.dna, profile);
  emitStoreChange();
  if (!ok) throw new Error("This browser could not store the strategy.");
  return profile;
}

export function hydrateDNA(row: { sectors?: unknown; stages?: unknown; geos?: unknown; checkSize?: unknown; updatedAt?: string; createdAt?: string }): void {
  const local = getDNA();
  const serverAt = row.updatedAt || row.createdAt || "";
  if (local?.savedAt && serverAt && local.savedAt > serverAt) return;
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
  saveDNA(
    {
      sectors: list(row.sectors),
      stages: list(row.stages),
      geos: list(row.geos),
      checkSize: typeof row.checkSize === "string" ? row.checkSize : "",
    },
    serverAt || new Date().toISOString(),
  );
}

// ---- LP letter ----
export function getLPSent(): string | null {
  return read<string | null>(KEYS.lpSent, null);
}

export function markLPSent(): string {
  const at = new Date().toISOString();
  write(KEYS.lpSent, at);
  return at;
}
