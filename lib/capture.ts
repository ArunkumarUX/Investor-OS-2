// Investor OS — capture layer
// Everything a human needs to record during a deal: comments, pitch materials,
// founder Q&A, tasks, documents, meeting notes, IC votes and decisions.

export type CaptureKind =
  | "comment"
  | "pitch"
  | "question"
  | "answer"
  | "task"
  | "meeting"
  | "vote"
  | "document"
  | "video"
  | "diligence"
  | "decision";

export interface PitchMeta {
  deckUrl?: string;
  videoUrl?: string;
  askAmount?: string;
  valuation?: string;
  summary?: string;
  founderNotes?: string;
  scores?: { team: number; product: number; market: number; traction: number; timing: number };
}

export interface VoteMeta {
  member?: string;
  verdict?: "invest" | "watch" | "reject";
  confidence?: number;
  rationale?: string;
}

export interface TaskMeta {
  owner?: string;
  due?: string;
  status?: "open" | "done";
}

export interface DocMeta {
  status?: "requested" | "received" | "reviewed" | "missing";
}

export interface VideoMeta {
  url?: string;
  source?: "link" | "upload";
}

export interface MeetingMeta {
  date?: string;
  attendees?: string;
  followUps?: string;
}

export interface QuestionMeta {
  status?: "open" | "answered";
  answer?: string;
  answeredAt?: string;
}

export interface CaptureItem {
  id: string;
  companyId: string;
  kind: CaptureKind;
  body: string;
  author: string;
  createdAt: string;
  meta?: PitchMeta & VoteMeta & TaskMeta & DocMeta & MeetingMeta & QuestionMeta & VideoMeta & { memoUpdate?: boolean };
}

export interface CaptureStore {
  items: CaptureItem[];
}

// ---- Document checklist (standard VC data-room set) ----------------------
export const CORE_DOCS = [
  "Pitch deck",
  "Cap table",
  "Financial model",
  "Customer contracts (top 5)",
  "IP / patent assignments",
  "Data room index",
  "Founders' background checks",
  "Legal / incorporation docs",
];

// ---- Deal completeness: what "100/100" means -----------------------------
export interface ChecklistRow {
  key: string;
  label: string;
  points: number;
  done: boolean;
  detail?: string;
}

export interface Completeness {
  score: number;
  rows: ChecklistRow[];
}

export function computeCompleteness(items: CaptureItem[]): Completeness {
  const byKind = (k: CaptureKind) => items.filter((i) => i.kind === k);
  const opts = {
    diligenceRun: byKind("diligence").length > 0,
    decision: byKind("decision").length > 0,
  };

  const pitch = byKind("pitch")[0];
  const hasDeck = Boolean(pitch?.meta?.deckUrl?.trim());
  const hasPitchSummary = Boolean(pitch?.meta?.summary?.trim() || (pitch?.body ?? "").trim().length > 20);
  const hasRubric = Boolean(
    pitch?.meta?.scores && Object.values(pitch.meta.scores).some((n) => Number(n) > 0)
  );

  const questions = byKind("question");
  const answered = questions.filter((q) => q.meta?.status === "answered" || q.meta?.answer?.trim());
  const docs = byKind("document");
  const docsReceived = docs.filter((d) =>
    ["received", "reviewed"].includes(String(d.meta?.status ?? ""))
  );
  const meetings = byKind("meeting");
  const comments = byKind("comment");
  const votes = byKind("vote");
  const tasks = byKind("task");
  const tasksDone = tasks.filter((t) => t.meta?.status === "done");

  const rows: ChecklistRow[] = [
    {
      key: "deck",
      label: "Pitch deck captured",
      points: 8,
      done: hasDeck,
      detail: hasDeck ? pitch?.meta?.deckUrl : "Add a deck link or upload reference",
    },
    {
      key: "pitch-summary",
      label: "Pitch summary written",
      points: 8,
      done: hasPitchSummary,
      detail: hasPitchSummary ? "Recorded" : "Summarise the founder pitch in your words",
    },
    {
      key: "rubric",
      label: "Scoring rubric completed",
      points: 8,
      done: hasRubric,
      detail: hasRubric ? "Team / product / market / traction / timing scored" : "Score the 5 dimensions 1–10",
    },
    {
      key: "questions",
      label: "≥3 diligence questions asked",
      points: 10,
      done: questions.length >= 3,
      detail: `${questions.length}/3 asked`,
    },
    {
      key: "answers",
      label: "≥2 founder answers captured",
      points: 10,
      done: answered.length >= 2,
      detail: `${answered.length}/2 answered`,
    },
    {
      key: "docs",
      label: `Data room docs received (${docsReceived.length}/${CORE_DOCS.length})`,
      points: 14,
      done: docsReceived.length >= CORE_DOCS.length,
      detail: docsReceived.length >= CORE_DOCS.length ? "All core docs in" : `${CORE_DOCS.length - docsReceived.length} outstanding`,
    },
    {
      key: "meeting",
      label: "≥1 founder meeting note",
      points: 8,
      done: meetings.length >= 1,
      detail: `${meetings.length} recorded`,
    },
    {
      key: "comments",
      label: "≥3 team comments / observations",
      points: 10,
      done: comments.length >= 3,
      detail: `${comments.length}/3`,
    },
    {
      key: "diligence",
      label: "AI due diligence run",
      points: 8,
      done: Boolean(opts.diligenceRun),
      detail: opts.diligenceRun ? "Review saved" : "Launch the DD room",
    },
    {
      key: "tasks",
      label: "Follow-up tasks logged & progressing",
      points: 6,
      done: tasks.length >= 1 && tasksDone.length >= 1,
      detail: `${tasksDone.length}/${tasks.length || 0} done`,
    },
    {
      key: "votes",
      label: "≥2 investment committee votes",
      points: 6,
      done: votes.length >= 2,
      detail: `${votes.length}/2 votes`,
    },
    {
      key: "decision",
      label: "Final decision recorded",
      points: 4,
      done: Boolean(opts.decision),
      detail: opts.decision ? "Logged to investment memory" : "Decide in committee",
    },
  ];

  const score = rows.reduce((acc, r) => acc + (r.done ? r.points : 0), 0);
  return { score, rows };
}

export function completenessLabel(score: number): string {
  if (score >= 95) return "Launch ready";
  if (score >= 75) return "Strong";
  if (score >= 50) return "In progress";
  if (score > 0) return "Early";
  return "Not started";
}

/* ------------------------------------------------------------------ */
/* Sequential workflow: 5 gated stages, 0 -> 100, in order.            */
/* A stage unlocks only once every stage before it is complete.         */
/* ------------------------------------------------------------------ */
export interface WorkflowStage {
  id: string;
  label: string;
  short: string;
  rowKeys: string[];
}

export const WORKFLOW: WorkflowStage[] = [
  { id: "source", label: "Sourcing", short: "Source", rowKeys: ["deck", "pitch-summary"] },
  { id: "screen", label: "Screen & Score", short: "Screen", rowKeys: ["rubric"] },
  { id: "diligence", label: "Due Diligence", short: "Diligence", rowKeys: ["questions", "answers", "docs", "meeting", "diligence"] },
  { id: "committee", label: "Committee", short: "Committee", rowKeys: ["comments", "tasks", "votes"] },
  { id: "decision", label: "Decision", short: "Decision", rowKeys: ["decision"] },
];

export interface StageState extends WorkflowStage {
  index: number;
  pts: number;
  earned: number;
  total: number;
  doneCount: number;
  done: boolean;
  current: boolean;
  locked: boolean;
}

export interface WorkflowState {
  stages: StageState[];
  currentIndex: number; // -1 when every stage is complete
}

export function computeWorkflow(c: Completeness): WorkflowState {
  const byKey: Record<string, ChecklistRow> = Object.fromEntries(c.rows.map((r) => [r.key, r]));
  const base = WORKFLOW.map((st, index) => {
    const rows = st.rowKeys.map((k) => byKey[k]).filter(Boolean);
    const pts = rows.reduce((n, r) => n + r.points, 0);
    const earned = rows.reduce((n, r) => n + (r.done ? r.points : 0), 0);
    const doneCount = rows.filter((r) => r.done).length;
    const done = rows.length > 0 && doneCount === rows.length;
    return { ...st, index, pts, earned, total: rows.length, doneCount, done };
  });
  const currentIndex = base.findIndex((s) => !s.done);
  const stages: StageState[] = base.map((s) => ({
    ...s,
    current: s.index === currentIndex,
    locked: currentIndex !== -1 && s.index > currentIndex,
  }));
  return { stages, currentIndex };
}

/** First not-yet-done checklist row within a given stage (drives "Continue"). */
export function nextRowInStage(c: Completeness, stageId: string): ChecklistRow | undefined {
  const st = WORKFLOW.find((s) => s.id === stageId);
  if (!st) return undefined;
  const byKey: Record<string, ChecklistRow> = Object.fromEntries(c.rows.map((r) => [r.key, r]));
  return st.rowKeys.map((k) => byKey[k]).find((r) => r && !r.done);
}
