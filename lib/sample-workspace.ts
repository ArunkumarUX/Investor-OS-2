import { companies } from "./mock-data";

export type SampleVerdict = {
  id: string;
  decision: "invest" | "watch" | "reject";
  confidence: number;
  at: string;
  rationale: string;
};

/** Illustrative committee file. It is not written into the live decision store. */
export const sampleVerdicts: SampleVerdict[] = [
  { id: "deeplogic", decision: "invest", confidence: 84, at: "2023-03-14T00:00:00.000Z", rationale: "Sample: technical moat and a buyer already in contract." },
  { id: "clearsky-data", decision: "invest", confidence: 79, at: "2023-04-08T00:00:00.000Z", rationale: "Sample: exclusive climate data with utility contracts." },
  { id: "nexus-health", decision: "invest", confidence: 76, at: "2023-08-19T00:00:00.000Z", rationale: "Sample: clinical workflow with a named hospital buyer." },
  { id: "blockvault", decision: "invest", confidence: 71, at: "2024-01-22T00:00:00.000Z", rationale: "Sample: security workflow inside the check size." },
  { id: "carbonzero", decision: "reject", confidence: 66, at: "2025-11-04T00:00:00.000Z", rationale: "Sample pass: hardware capital intensity before revenue scale." },
  { id: "solaris-energy", decision: "watch", confidence: 61, at: "2026-06-02T00:00:00.000Z", rationale: "Sample: wait for the next utility contract before a decision." },
];

export const samplePattern =
  "Sample pattern: the fund has held when the company had a named technical moat and a buyer already in contract. The pass on file is CarbonZero, for capital intensity before scale. The position that went against the book is TerraByte, after a leadership change and a revenue decline.";

const rivals: Record<string, string[]> = {
  "AI/ML": ["Northstar Agents", "Lattice Automation", "Fieldnote AI"],
  HealthTech: ["Harbor Diagnostics", "Clinicloop", "Wardline"],
  FinTech: ["Ledgerwell", "Cashspan", "Treasury Lane"],
  SaaS: ["Operator Stack", "Deskline", "Workflow Harbor"],
  CleanTech: ["Gridroom", "Climate Ledger", "Wattline"],
  Infrastructure: ["Packet Foundry", "Edgeyard", "Runway Compute"],
  LegalTech: ["Clause & Co", "Briefmill", "Docket Lane"],
  Cybersecurity: ["Keyspan", "Cipherwell", "Postmark Security"],
  "Enterprise AI": ["Routeline", "Desk Agents", "Process Foundry"],
};

function hash(id: string) {
  let n = 0;
  for (const char of id) n = (n * 33 + char.charCodeAt(0)) >>> 0;
  return n;
}

export function sampleDossier(id: string) {
  const company = companies.find((item) => item.id === id);
  const n = hash(id || "x");
  const patents = 2 + (n % 11);
  const roles = 3 + (n % 9);
  const acv = 36 + (n % 140);
  const margin = 58 + (n % 22);
  const burn = 90 + (n % 280);
  const runway = 9 + (n % 14);
  const hire = ["VP Sales", "Head of Engineering", "Clinical lead", "CFO"][n % 4];
  return {
    patents: `${patents} sample filings, ${1 + (n % 3)} marked granted`,
    hiring: `${roles} open roles in the sample file. Last hire: ${hire}, March 2026.`,
    funding: company ? `Sample note: still on ${company.lastRound}. No new round is in the file.` : "No round is in the sample file.",
    competitors: rivals[company?.sector ?? ""] ?? ["Peer One", "Peer Two", "Peer Three"],
    economics: `Sample unit economics: ACV $${acv}k · gross margin ${margin}% · burn $${burn}k a month · ${runway} months of runway`,
  };
}

export function sampleMemoNotes(id: string) {
  const file = sampleDossier(id);
  const company = companies.find((item) => item.id === id);
  return [
    { effect: "Sample update", title: file.patents, detail: "Patent count is dummy data for this workspace. It is not a registry search." },
    { effect: "Sample update", title: file.hiring, detail: "Hiring is dummy data for this workspace. It is not a live jobs feed." },
    { effect: "Context. The thesis is unchanged.", title: file.competitors.slice(0, 2).join(" and ") + " are the sample competitors.", detail: company ? `Placed next to ${company.name} so the competition map is filled in. These names are fictional.` : "Fictional names." },
  ];
}

export const sampleMoves = [
  { companyName: "Nova AI", from: "Diligence", to: "Decision", at: "2026-09-23T00:00:00.000Z" },
  { companyName: "Helix Health", from: "Connect", to: "Diligence", at: "2026-09-18T00:00:00.000Z" },
  { companyName: "CarbonZero", from: "Decision", to: "Passed", at: "2025-11-04T00:00:00.000Z" },
];

export const sampleForecasts = [
  { id: "sample-nova", company: "Nova AI", statement: "Nova AI reaches $4M ARR before 31 March 2026.", probability: 70, due: "31 Mar 2026", outcome: "Happened", note: "Sample outcome: the file marks $4.1M ARR." },
  { id: "sample-helix", company: "Helix Health", statement: "Helix Health receives FDA breakthrough designation in 2026.", probability: 55, due: "30 Jun 2026", outcome: "Did not happen", note: "Sample outcome: designation still in process." },
  { id: "sample-terra", company: "TerraByte", statement: "TerraByte holds revenue flat in Q3 2026.", probability: 40, due: "30 Sept 2026", outcome: "Did not happen", note: "Sample outcome: revenue declined 22% in the portfolio file." },
];
