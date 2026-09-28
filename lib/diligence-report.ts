import { companies } from "@/lib/mock-data";
import { getAnalysis } from "@/lib/ai-content";
import { THESIS_FLOOR } from "@/lib/discovery-rank";

export type Badge = "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "CONFLICTING" | "COMPANY REPORTED" | "AI DERIVED" | "NOT CHECKED" | "DATA REQUIRED" | "ESTIMATED";

export type Claim = {
  id: string;
  text: string;
  origin: string;
  evidence: string;
  contradicting: string;
  status: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "CONFLICTING";
  materiality: "CRITICAL" | "HIGH" | "MEDIUM";
  domain: string;
  implication: string;
  confidenceNote: string;
};

export type Check = { label: string; done: boolean; materiality: "CRITICAL" | "HIGH" | "MEDIUM" };

const WEIGHT = { VERIFIED: 1, PARTIAL: 0.5, CONFLICTING: 0.25, UNVERIFIED: 0 } as const;

function millions(value: string) {
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (/k/i.test(value)) return n / 1000;
  if (/b/i.test(value)) return n * 1000;
  return n;
}

export function buildDiligenceReport(companyId: string) {
  const company = companies.find((item) => item.id === companyId);
  if (!company) return null;
  const analysis = getAnalysis(company);
  const revenue = millions(company.revenue);
  const valuation = millions(company.valuation);
  const multiple = revenue && valuation ? valuation / revenue : null;
  const claims: Claim[] = [
    {
      id: "arr",
      text: `${company.revenue} revenue`,
      origin: "Company record",
      evidence: "Stated on the company file. No statements, invoices, or bank records are attached.",
      contradicting: "None on file. Absence of a contradiction is not confirmation.",
      status: "UNVERIFIED",
      materiality: "HIGH",
      domain: "Financials",
      implication: "Commercial traction cannot be weighted until the figure is reconciled.",
      confidenceNote: "Company-reported only.",
    },
    {
      id: "growth",
      text: `${company.growth} growth`,
      origin: "Company record",
      evidence: "Stated on the company file. No cohort bridge is attached.",
      contradicting: "None on file.",
      status: "UNVERIFIED",
      materiality: "HIGH",
      domain: "Financials",
      implication: "The growth rate is not evidence of revenue quality.",
      confidenceNote: "Company-reported only.",
    },
    {
      id: "advantage",
      text: company.bulls[0] ?? "Claimed product advantage",
      origin: "Company record",
      evidence: "The claim appears in the company thesis. No independent benchmark is on file.",
      contradicting: "No second source confirms or narrows the claim.",
      status: "UNVERIFIED",
      materiality: "CRITICAL",
      domain: "Technology",
      implication: "Differentiation and the valuation both depend on this claim.",
      confidenceNote: "Headline claim. Not reproduced.",
    },
    ...company.bulls.slice(1, 3).map((text, index) => ({
      id: `bull-${index}`,
      text,
      origin: "Company record",
      evidence: "Stated by the company. No independent confirmation is attached.",
      contradicting: "None on file.",
      status: "UNVERIFIED" as const,
      materiality: "MEDIUM" as const,
      domain: "Market",
      implication: "Treat as a lead to verify, not as support.",
      confidenceNote: "Company-reported only.",
    })),
    ...company.founders.map((founder) => ({
      id: founder.name,
      text: `${founder.name}, ${founder.role}: ${founder.bg}`,
      origin: "Company record",
      evidence: "Biography as supplied. References and employment records are not attached.",
      contradicting: "None on file.",
      status: "UNVERIFIED" as const,
      materiality: "HIGH" as const,
      domain: "Team",
      implication: "Founder-market fit is claimed, not checked.",
      confidenceNote: "Claimed biography.",
    })),
  ];

  const checks: Check[] = [
    { label: "Company file read", done: true, materiality: "MEDIUM" },
    { label: "Revenue reconciled to statements", done: false, materiality: "CRITICAL" },
    { label: "Independent technical benchmark", done: false, materiality: "CRITICAL" },
    { label: "Net revenue retention", done: false, materiality: "HIGH" },
    { label: "Gross margin after delivery cost", done: false, materiality: "HIGH" },
    { label: "Customer concentration", done: false, materiality: "HIGH" },
    { label: "Founder references", done: false, materiality: "HIGH" },
    { label: "Founder IP assignment", done: false, materiality: "CRITICAL" },
    { label: "Cap table", done: false, materiality: "CRITICAL" },
    { label: "Litigation search", done: false, materiality: "HIGH" },
    { label: "Market size sourced", done: false, materiality: "MEDIUM" },
    { label: "Competitive cells sourced", done: false, materiality: "MEDIUM" },
  ];

  const evidenceConfidence = Math.round((claims.reduce((sum, claim) => sum + WEIGHT[claim.status], 0) / claims.length) * 100);
  const coverage = Math.round((checks.filter((item) => item.done).length / checks.length) * 100);
  const verified = claims.filter((claim) => claim.status === "VERIFIED").length;
  const unknowns = checks.filter((item) => !item.done && item.materiality !== "MEDIUM").length;

  const domainScore = (domain: string) => {
    const rows = claims.filter((claim) => claim.domain === domain);
    if (!rows.length) return 20;
    return Math.round((rows.reduce((sum, claim) => sum + WEIGHT[claim.status], 0) / rows.length) * 100);
  };

  const confidence = [
    { id: "technology", label: "Technology", score: domainScore("Technology"), up: "An independent benchmark on stated workloads.", down: "The headline claim stays unreproduced." },
    { id: "market", label: "Market", score: domainScore("Market"), up: "A sourced market estimate and named buyers.", down: "The size figures stay company estimates." },
    { id: "financials", label: "Financials", score: domainScore("Financials"), up: "Statements, cohorts, and margin.", down: "Revenue stays a single company figure." },
    { id: "team", label: "Team", score: domainScore("Team"), up: "References and employment records.", down: "Biographies stay as supplied." },
    { id: "legal", label: "Legal / IP", score: 0, up: "Assignments, a cap table, and a completed litigation search.", down: "Those items are not on file. Score stays at zero." },
    { id: "competition", label: "Competition", score: 0, up: "Sourced comparison cells.", down: "The map is still the company's own risk note. Score stays at zero." },
  ];

  return {
    company,
    analysis,
    multiple,
    claims,
    checks,
    evidenceConfidence,
    coverage,
    verified,
    unknowns,
    confidence,
    meetsThesis: company.matchScore >= THESIS_FLOOR,
    methodology: {
      match: "Illustrative score on the company file. It is not an independent rating.",
      record: "The assessment number stored on the company file. It is not a new model output.",
      evidence: "Mean support across the claim ledger. Verified counts as 1, partial as 0.5, conflicting as 0.25, unverified as 0.",
      coverage: "Share of the material-check list that has a source beyond the company file.",
      verified: "Claims in the ledger whose status is Verified. Partial does not count.",
      unknowns: "Material checks still open, excluding medium items.",
    },
  };
}
