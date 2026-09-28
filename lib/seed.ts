// Seed records for the Investor OS demo store — created on first API access.
import type { DB, Record } from "./db";
import { companies } from "./mock-data";

function dealSeeds(): Record[] {
  // Every company in the data layer becomes a deal record so the Deal Library
  // and Pipeline share one registry.
  const stageOf: globalThis.Record<string, string> = {
    "nova-ai": "committee",
    "helix-health": "diligence",
    finflow: "diligence",
    atomspace: "contacted",
    "cortex-legal": "contacted",
    "solaris-energy": "discovered",
    edgeml: "discovered",
    medsync: "discovered",
    voiceflow: "invested",
    carbonzero: "passed",
  };

  return companies.map((c) => ({
    id: c.id,
    companyId: c.id,
    name: c.name,
    sector: c.sector,
    stage: stageOf[c.id] ?? ("portfolio" in c && c.portfolio ? "invested" : "discovered"),
    status: "portfolio" in c && c.portfolio ? "portfolio" : "active",
    matchScore: c.matchScore,
    owner: c.id.charCodeAt(0) % 2 === 0 ? "AG" : "SK",
    source: c.id === "solaris-energy" ? "AI discovery" : "Inbound / network",
    createdAt: "2026-09-01T09:00:00.000Z",
  }));
}

function contactSeeds(): Record[] {
  const rows: [string, string, string, string, string][] = [
    ["Sarah Chen", "CEO, Nova AI", "founder", "sarah@nova.ai", "Met at AI Eng World's Fair — strong technical conviction"],
    ["Marcus Webb", "CTO, Nova AI", "founder", "marcus@nova.ai", "Ex-OpenAI; reference checked via 2 mutual contacts"],
    ["Dr. Priya Sharma", "CEO, Helix Health", "founder", "priya@helix.health", "NHS clinician-founder; intro via Oxford network"],
    ["Ahmed Al-Rashid", "CEO, FinFlow", "founder", "ahmed@finflow.ae", "MENA treasury expert; second-time founder"],
    ["Rachel Torres", "CEO, Cortex Legal", "founder", "rachel@cortexlegal.com", "Ex-BigLaw partner with distribution into top firms"],
    ["Hannah Müller", "CEO, Solaris Energy", "founder", "hannah@solaris.energy", "20 years utility sector; EU regulatory fluency"],
    ["Ethan Park", "CEO, DeepLogic AI", "portfolio-founder", "ethan@deeplogic.ai", "Portfolio; Series B negotiation in progress"],
    ["Sofia Lindgren", "CEO, ClearSky Data", "portfolio-founder", "sofia@clearsky.data", "Portfolio; follow-on candidate"],
    ["Vertex Ventures", "Co-investor", "co-investor", "deals@vertex.vc", "Co-led VoiceFlow seed; deal-share partner"],
    ["Pinnacle Endowment", "Limited Partner", "lp", "allocations@pinnacle.org", "$15M commitment; quarterly reporting"],
    ["Al-Rashid Family Office", "Limited Partner", "lp", "invest@alrashid-fo.com", "$10M commitment; MENA network access"],
    ["Nordic Pension Alpha", "Limited Partner", "lp", "alpha@nordicpension.se", "$8M commitment; ESG-mandated"],
    ["TechVenture LP", "Limited Partner", "lp", "ir@techventure.com", "$5M commitment; operator network"],
    ["Gavin Mehta", "Advisor — AI infrastructure", "advisor", "gavin@mehta.ai", "Technical diligence support on EdgeML/AtomSpace"],
    ["Claire Dubois", "Advisor — EU health regulation", "advisor", "claire@euhealth.adv", "Regulatory pathway reviews for HealthTech deals"],
  ];
  return rows.map(([name, title, type, email, note], i) => ({
    id: `con-${i + 1}`,
    name,
    title,
    type,
    email,
    note,
    lastTouch: "2026-09-20",
    createdAt: "2026-09-01T09:00:00.000Z",
  }));
}

function taskSeeds(): Record[] {
  const rows: [string, string, string, string, string][] = [
    ["Request FinFlow cohort retention analysis", "finflow", "SK", "2026-09-27", "open"],
    ["Reference call — FinFlow CFO", "finflow", "AG", "2026-09-26", "open"],
    ["Verify Helix clinical validation dataset", "helix-health", "AG", "2026-09-28", "open"],
    ["Chase Cortex Legal data-room access", "cortex-legal", "SK", "2026-09-26", "open"],
    ["Model Nova AI at $80M vs $95M cap", "nova-ai", "AG", "2026-09-25", "done"],
    ["Draft TerraByte board memo post-CEO exit", "terrabyte", "AG", "2026-09-29", "open"],
    ["Send Q3 LP letter", "", "AG", "2026-09-30", "open"],
  ];
  return rows.map(([title, companyId, owner, due, status], i) => ({
    id: `tsk-${i + 1}`,
    title,
    companyId,
    owner,
    due,
    status,
    createdAt: "2026-09-18T09:00:00.000Z",
  }));
}

function commitmentSeeds(): Record[] {
  const rows: [string, number, number, string][] = [
    ["Pinnacle Endowment Fund", 15_000_000, 10_800_000, "funded"],
    ["Al-Rashid Family Office", 10_000_000, 6_600_000, "funded"],
    ["Nordic Pension Alpha", 8_000_000, 5_280_000, "funded"],
    ["TechVenture LP", 5_000_000, 3_300_000, "funded"],
    ["Kestrel Sovereign Fund", 12_000_000, 0, "signed — first close pending"],
  ];
  return rows.map(([lp, committed, called, status], i) => ({
    id: `cmt-${i + 1}`,
    lp,
    committed,
    called,
    status,
    vintage: "Fund I (2022)",
    createdAt: "2026-09-01T09:00:00.000Z",
  }));
}

function strategySeed(): Record[] {
  return [
    {
      id: "strategy-fund-1",
      fund: "Fund I",
      thesis:
        "AI-native infrastructure and applied-AI companies with a defensible data or workflow moat, seeded through Series A, in the US, UK, EU and select APAC hubs.",
      sectors: ["AI/ML", "FinTech", "HealthTech", "CleanTech", "Infrastructure", "Cybersecurity"],
      stages: ["Pre-seed", "Seed", "Series A"],
      geos: ["USA", "UK", "Europe", "APAC", "Israel"],
      checkSize: "$250K–$3M initial, up to $5M with follow-ons",
      ownership: "Target 8–15% at entry",
      portfolio: "20–25 companies, max 12% single-position",
      exclusions: ["Consumer social", "Pure crypto trading", "Pre-revenue hardware", "Defence/lethal autonomy"],
      holdPeriod: "7–10 years",
      returnTarget: ">3x net TVPI, top-quartile IRR",
      createdAt: "2026-09-01T09:00:00.000Z",
    },
  ];
}

function integrationSeeds(): Record[] {
  const rows: [string, string, string, string][] = [
    ["Claude (Anthropic)", "AI analysis", "connected", "Powers due diligence, committee debate and market research"],
    ["Perplexity / Web search", "Market research", "not-connected", "Live source retrieval for Market Research"],
    ["PitchBook", "Deal data", "not-connected", "Comparable rounds, valuations and exits"],
    ["Crunchbase", "Company data", "not-connected", "Funding history and team tracking"],
    ["Google Drive", "Document store", "not-connected", "Sync data-room documents"],
    ["Slack", "Notifications", "not-connected", "Deal alerts to #deals channel"],
    ["Notion", "Knowledge base", "not-connected", "Export memos and DD reports"],
    ["Stripe Atlas", "Portfolio ops", "not-connected", "Incorporation and banking for portfolio"],
  ];
  return rows.map(([name, category, status, description], i) => ({
    id: `int-${i + 1}`,
    name,
    category,
    status,
    description,
    createdAt: "2026-09-01T09:00:00.000Z",
  }));
}

export function seedDB(): DB {
  return {
    deals: dealSeeds(),
    contacts: contactSeeds(),
    tasks: taskSeeds(),
    commitments: commitmentSeeds(),
    research: [],
    strategy: strategySeed(),
    notifications: [],
    submissions: [],
    integrations: integrationSeeds(),
  };
}
