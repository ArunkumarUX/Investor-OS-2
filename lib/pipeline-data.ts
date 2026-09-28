import { companies } from "./mock-data";

export type StageId = "discovered" | "contacted" | "diligence" | "committee" | "invested" | "passed";

export interface Stage {
  id: StageId;
  label: string;
  icon: string;
  color: string;
}

export const stages: Stage[] = [
  { id: "discovered", label: "Discovered", icon: "🔍", color: "#42A5FF" },
  { id: "contacted", label: "Contacted", icon: "📬", color: "#B7791F" },
  { id: "diligence", label: "Due Diligence", icon: "🔬", color: "#6D28D9" },
  { id: "committee", label: "Committee", icon: "⚖️", color: "#BE123C" },
  { id: "invested", label: "Invested", icon: "✅", color: "#1E9E52" },
  { id: "passed", label: "Passed", icon: "🚫", color: "#6E6E73" },
];

export interface Deal {
  id: string;
  companyId: string;
  name: string;
  logo: string;
  color: string;
  sector: string;
  stageId: StageId;
  roundSize: string;
  matchScore: number;
  owner: string;
  daysInStage: number;
  note: string;
  movedAt: string;
}

// Single source of truth: every deal card derives name/logo/color/sector/
// round size/match score from companies[] in lib/mock-data.ts.
function byId(id: string) {
  const c = companies.find((x) => x.id === id);
  if (!c) throw new Error(`pipeline-data: unknown company id "${id}"`);
  return c;
}

interface DealSeed {
  companyId: string;
  stageId: StageId;
  owner: string;
  daysInStage: number;
  note: string;
  movedAt: string;
}

const seeds: DealSeed[] = [
  {
    companyId: "nova-ai", stageId: "committee", owner: "AG", daysInStage: 4,
    note: "Bull/Bear debate live — leaning Invest at $80M cap", movedAt: "2026-09-21",
  },
  {
    companyId: "helix-health", stageId: "diligence", owner: "AG", daysInStage: 9,
    note: "Clinical data room open — 3 of 5 agents complete", movedAt: "2026-09-16",
  },
  {
    companyId: "finflow", stageId: "diligence", owner: "SK", daysInStage: 12,
    note: "Cohort analysis requested — CFO reference call Friday", movedAt: "2026-09-13",
  },
  {
    companyId: "atomspace", stageId: "contacted", owner: "AG", daysInStage: 3,
    note: "Intro email sent — founder replied, call scheduled Tue", movedAt: "2026-09-22",
  },
  {
    companyId: "cortex-legal", stageId: "contacted", owner: "SK", daysInStage: 6,
    note: "Awaiting data room access — chase if silent past Fri", movedAt: "2026-09-19",
  },
  {
    companyId: "solaris-energy", stageId: "discovered", owner: "AG", daysInStage: 2,
    note: "AI flagged — strong DNA match on climate thesis", movedAt: "2026-09-23",
  },
  {
    companyId: "edgeml", stageId: "discovered", owner: "SK", daysInStage: 5,
    note: "Edge inference — check overlap with portfolio thesis", movedAt: "2026-09-20",
  },
  {
    companyId: "medsync", stageId: "discovered", owner: "AG", daysInStage: 8,
    note: "Interoperability play — crowded space, verify moat", movedAt: "2026-09-17",
  },
  {
    companyId: "voiceflow", stageId: "invested", owner: "AG", daysInStage: 30,
    note: "Closed follow-on at $380M — board observer seat taken", movedAt: "2026-08-26",
  },
  {
    companyId: "carbonzero", stageId: "passed", owner: "SK", daysInStage: 45,
    note: "Passed — unit economics weak, re-engage if metrics improve", movedAt: "2026-08-11",
  },
];

export const initialDeals: Deal[] = seeds.map((s) => {
  const c = byId(s.companyId);
  return {
    id: `d-${c.id}`,
    companyId: c.id,
    name: c.name,
    logo: c.logo,
    color: c.color,
    sector: c.sector,
    stageId: s.stageId,
    roundSize: c.lastRound,
    matchScore: c.matchScore,
    owner: s.owner,
    daysInStage: s.daysInStage,
    note: s.note,
    movedAt: s.movedAt,
  };
});
