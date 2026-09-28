export const AGENTS = [
  {
    id: "market",
    label: "Market analyst",
    focus: "Demand, competition and market timing",
  },
  {
    id: "technical",
    label: "Technical partner",
    focus: "Architecture, engineering and defensibility",
  },
  {
    id: "financial",
    label: "Financial analyst",
    focus: "Revenue quality, valuation and unit economics",
  },
  {
    id: "legal",
    label: "Legal analyst",
    focus: "Documented IP, contracts and legal questions for counsel",
  },
  {
    id: "founder",
    label: "Founder analyst",
    focus: "Verifiable professional experience and execution",
  },
  {
    id: "skeptic",
    label: "Skeptic partner",
    focus: "Counter-evidence, assumptions and falsification",
  },
  {
    id: "portfolio",
    label: "Portfolio manager",
    focus: "Concentration, monitoring and follow-up triggers",
  },
  {
    id: "partner",
    label: "General partner",
    focus: "Synthesize the case and explain what remains unknown",
  },
] as const;
export type AgentId = (typeof AGENTS)[number]["id"];
export interface Evidence {
  id: string;
  companyId: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  provenance: "public-web" | "user-supplied" | "sample";
}
export interface Claim {
  text: string;
  kind: "observation" | "inference" | "unknown";
  sourceIds: string[];
}
export interface AgentResult {
  id: AgentId;
  status: "queued" | "running" | "complete" | "failed";
  summary?: string;
  claims?: Claim[];
  questions?: string[];
  error?: string;
}
export interface AnalysisRun {
  retryOf?: string;
  id: string;
  companyId: string;
  createdAt: string;
  completedAt?: string;
  mode: "sample" | "ai";
  status: "running" | "complete" | "partial" | "failed";
  touchedAt?: string;
  evidence: Evidence[];
  agents: AgentResult[];
}
export interface Forecast {
  id: string;
  companyId: string;
  statement: string;
  probability: number;
  due: string;
  createdAt: string;
  outcome?: boolean;
  outcomeNote?: string;
  resolvedAt?: string;
}
export interface ThesisEvent {
  id: string;
  companyId: string;
  title: string;
  detail: string;
  sourceUrl: string;
  impact: "risk" | "opportunity" | "neutral";
  createdAt: string;
  acknowledged: boolean;
}
export interface MemoVersion {
  id: string;
  companyId: string;
  createdAt: string;
  trigger: string;
  body: string;
  sourceIds: string[];
}
export interface IntelligenceState {
  watches: WatchTopic[];
  monitorHeartbeat?: string;
  decisions: SavedDecision[];
  evidence: Evidence[];
  runs: AnalysisRun[];
  forecasts: Forecast[];
  events: ThesisEvent[];
  versions: MemoVersion[];
}
export interface PublicResult {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  context: string;
}
export interface SavedDecision {
  companyId: string;
  revision: string;
  verdict: "invest" | "watch" | "reject" | "undo";
  confidence: number;
  rationale: string;
  createdAt: string;
  priorStage: string;
}

export interface WatchTopic {
  location?: string;
  id: string;
  companyId: string;
  query: string;
  enabled: boolean;
  createdAt: string;
  lastChecked?: string;
  seenIds: string[];
  error?: string;
}
