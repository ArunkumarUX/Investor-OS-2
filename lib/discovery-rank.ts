import { companies } from "./mock-data";
import { marketSignals } from "./market-signals";
import { initialDeals, type StageId } from "./pipeline-data";
import type { DNAProfile } from "./store";

/** Sample thesis scores at or above this are the strong cluster on the company records. */
export const THESIS_FLOOR = 90;

const STAGE_LABEL: Record<StageId, string> = {
  discovered: "Discover",
  contacted: "Connect",
  diligence: "Diligence",
  committee: "Decision",
  invested: "Invested",
  passed: "Passed",
};

type Company = (typeof companies)[number];

export interface RankedDiscovery {
  id: string;
  name: string;
  sector: string;
  stage: string;
  geography: string;
  score: number;
  baseScore: number;
  thesisMatch: boolean;
  why: string[];
  risk: string;
  pipeline: string;
  lastRound: string;
  revenue: string;
  tags: string[];
  logo: string;
  color: string;
  signal: { id: string; publisher: string; metric: string; metricLabel: string; title: string; impact: string } | null;
}

const CHECK_RANGES: Record<string, [number, number]> = {
  "$50K–$250K": [0.05, 0.25],
  "$250K–$1M": [0.25, 1],
  "$1M–$5M": [1, 5],
  "$5M–$15M": [5, 15],
  "$15M+": [15, Number.POSITIVE_INFINITY],
};

function roundMillions(value: string): number | null {
  const match = value.match(/\$([\d.]+)\s*(K|M|B)/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (!Number.isFinite(amount)) return null;
  return unit === "B" ? amount * 1000 : unit === "K" ? amount / 1000 : amount;
}

function fitsCheck(company: Company, checkSize: string): boolean {
  const range = CHECK_RANGES[checkSize];
  if (!range) return true;
  const amount = roundMillions(company.lastRound);
  if (amount == null) return true;
  return amount >= range[0] && amount <= range[1];
}

function hasPreference(dna: DNAProfile | null): boolean {
  return Boolean(dna && (dna.sectors.length || dna.stages.length || dna.geos.length || dna.checkSize));
}

function boost(company: Company, dna: DNAProfile | null) {
  if (!dna) return 0;
  let extra = 0;
  if (dna.sectors.includes(company.sector)) extra += 6;
  if (dna.stages.includes(company.stage)) extra += 4;
  if (dna.geos.includes(company.geography) || dna.geos.includes("Global")) extra += 3;
  if (dna.checkSize && CHECK_RANGES[dna.checkSize] && fitsCheck(company, dna.checkSize)) extra += 5;
  return extra;
}

function matchesThesis(company: Company, dna: DNAProfile | null) {
  if (!hasPreference(dna)) return company.matchScore >= THESIS_FLOOR;
  const sectorOk = !dna!.sectors.length || dna!.sectors.includes(company.sector);
  const stageOk = !dna!.stages.length || dna!.stages.includes(company.stage);
  const geoOk = !dna!.geos.length || dna!.geos.includes(company.geography) || dna!.geos.includes("Global");
  const checkOk = !dna!.checkSize || fitsCheck(company, dna!.checkSize);
  return sectorOk && stageOk && geoOk && checkOk;
}

export function rankDiscoveries(input: { dna: DNAProfile | null; stages?: Record<string, StageId> }): RankedDiscovery[] {
  const stages = input.stages ?? {};
  return companies
    .filter((company) => !("portfolio" in company && company.portfolio))
    .map((company) => {
      const stageId = stages[company.id] ?? initialDeals.find((deal) => deal.companyId === company.id)?.stageId ?? "discovered";
      const signal = marketSignals.find((item) => (item.sectors as readonly string[]).includes(company.sector) && item.impact === "Opportunity")
        ?? marketSignals.find((item) => (item.sectors as readonly string[]).includes(company.sector))
        ?? null;
      return {
        id: company.id,
        name: company.name,
        sector: company.sector,
        stage: company.stage,
        geography: company.geography,
        score: Math.min(99, company.matchScore + boost(company, input.dna)),
        baseScore: company.matchScore,
        thesisMatch: stageId !== "passed" && stageId !== "invested" && matchesThesis(company, input.dna),
        why: company.bulls.slice(0, 2),
        risk: company.risks[0] ?? "",
        pipeline: STAGE_LABEL[stageId],
        lastRound: company.lastRound,
        revenue: company.revenue,
        tags: company.tags.slice(0, 3),
        logo: company.logo,
        color: company.color,
        signal: signal
          ? { id: signal.id, publisher: signal.publisher, metric: signal.metric, metricLabel: signal.metricLabel, title: signal.title, impact: signal.impact }
          : null,
      };
    })
    .filter((company) => company.pipeline !== "Passed" && company.pipeline !== "Invested")
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
