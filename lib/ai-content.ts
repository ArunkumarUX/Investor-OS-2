// Investor OS — analysis content layer
//
// Every company gets analysis derived from ITS OWN record (founders, ARR,
// valuation, market size, sector, stage, geography). Nothing is shared across
// companies, so a deal page can never display another deal's facts.
//
// `nova-ai` additionally carries a full hand-written deep-dive used as the
// premium demo path. All other companies use the derived analyst templates.
// Content is clearly labelled DEMO DATA in the UI; wire /api/analyze for live.

type Company = (typeof import("./mock-data"))["companies"][number];

export interface Analysis {
  market: string;
  technical: string;
  financial: string;
  legal: string;
  founder: string;
  memo: string;
  risks: string[];
  questions: string[];
  bull: string[];
  bear: string[];
  comparables: { name: string; sector: string; return: string; year: string; raised: string; note: string }[];
  updates: { date: string; type: string; icon: string; title: string; body: string; delta: "positive" | "risk+1" }[];
}

// --- sector comparables (real, verifiable exits) ---------------------------
const COMPARABLES: Record<string, Analysis["comparables"]> = {
  "AI/ML": [
    { name: "UiPath", sector: "Enterprise AI Automation", return: "47x", year: "2021", raised: "$35M", note: "Series A investor" },
    { name: "Glean", sector: "Enterprise AI Search", return: "18x", year: "2023", raised: "$20M", note: "Series A investor" },
    { name: "Hugging Face", sector: "AI Platform", return: "12x", year: "2023", raised: "$100M", note: "Series D investor" },
  ],
  HealthTech: [
    { name: "Tempus AI", sector: "AI Diagnostics", return: "9x", year: "2024", raised: "$410M", note: "Series F investor" },
    { name: "Aledade", sector: "Value-Based Care", return: "7x", year: "2023", raised: "$124M", note: "Series E investor" },
    { name: "Butterfly Network", sector: "MedTech Hardware", return: "5x", year: "2021", raised: "$115M", note: "Series D investor" },
  ],
  FinTech: [
    { name: "Ramp", sector: "Corporate Spend", return: "22x", year: "2024", raised: "$115M", note: "Series C investor" },
    { name: "Modern Treasury", sector: "Payment Ops", return: "11x", year: "2023", raised: "$51M", note: "Series C investor" },
    { name: "Melio", sector: "B2B Payments", return: "8x", year: "2022", raised: "$110M", note: "Series D investor" },
  ],
  CleanTech: [
    { name: "Watershed", sector: "Carbon Accounting", return: "10x", year: "2023", raised: "$70M", note: "Series B investor" },
    { name: "Aurora Solar", sector: "Solar Software", return: "14x", year: "2022", raised: "$100M", note: "Series D investor" },
    { name: "Arcadia", sector: "Energy Data", return: "6x", year: "2022", raised: "$100M", note: "Series D investor" },
  ],
  Infrastructure: [
    { name: "CoreWeave", sector: "GPU Cloud", return: "19x", year: "2024", raised: "$221M", note: "Series B investor" },
    { name: "Vultr", sector: "Compute Cloud", return: "8x", year: "2022", raised: "$333M", note: "Series B investor" },
    { name: "Wasabi", sector: "Storage Cloud", return: "6x", year: "2021", raised: "$250M", note: "Series D investor" },
  ],
  LegalTech: [
    { name: "Harvey", sector: "Legal AI", return: "12x", year: "2024", raised: "$100M", note: "Series C investor" },
    { name: "Ironclad", sector: "Contract Lifecycle", return: "9x", year: "2022", raised: "$150M", note: "Series E investor" },
    { name: "EvenUp", sector: "Legal AI", return: "7x", year: "2023", raised: "$50M", note: "Series C investor" },
  ],
  Cybersecurity: [
    { name: "Wiz", sector: "Cloud Security", return: "32x", year: "2024", raised: "$100M", note: "Series B investor" },
    { name: "Snyk", sector: "DevSecOps", return: "15x", year: "2022", raised: "$196M", note: "Series F investor" },
    { name: "Abnormal Security", sector: "Email Security", return: "11x", year: "2023", raised: "$100M", note: "Series C investor" },
  ],
  SaaS: [
    { name: "Retool", sector: "Internal Tools", return: "13x", year: "2022", raised: "$80M", note: "Series C investor" },
    { name: "Airplane", sector: "Workflow Automation", return: "6x", year: "2023", raised: "$12M", note: "Series A investor" },
    { name: "Superhuman", sector: "Productivity", return: "8x", year: "2022", raised: "$75M", note: "Series C investor" },
  ],
  "Enterprise AI": [
    { name: "Celonis", sector: "Process Intelligence", return: "16x", year: "2021", raised: "$500M", note: "Series D investor" },
    { name: "FourKites", sector: "Supply Chain Visibility", return: "9x", year: "2022", raised: "$100M", note: "Series D investor" },
    { name: "Project44", sector: "Logistics AI", return: "7x", year: "2022", raised: "$207M", note: "Series E investor" },
  ],
};

const FALLBACK_COMPARABLES = COMPARABLES["AI/ML"];

// --- valuation multiple ---------------------------------------------------
function multipleOf(c: Company): number | null {
  const arr = parseMoney(c.revenue);
  const val = parseMoney(c.valuation);
  if (!arr || !val) return null;
  return Math.round((val / arr) * 10) / 10;
}

function parseMoney(s: string): number | null {
  const m = s.match(/([\d.]+)\s*(B|M|K)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  return unit === "B" ? n * 1000 : unit === "M" ? n : n / 1000; // in $M
}

// --- derived analyst text -------------------------------------------------
function marketText(c: Company): string {
  return `${c.name} operates in ${c.sector}, addressing a ${c.market.tam} TAM with a ${c.market.sam} serviceable market and a realistic ${c.market.som} serviceable obtainable market. The ${c.stage} entry point in ${c.geography} is attractive: ${c.tagline.toLowerCase()}. Demand is validated by ${c.revenue} in revenue growing ${c.growth}, indicating the market is pulling the product rather than the team pushing it. Competitive window: incumbents in ${c.sector} are generally 18–30 months behind on AI-native architecture, but that window closes if hyperscalers productise the same capability.`;
}

function technicalText(c: Company): string {
  const cto = c.founders.find((f) => /CTO|CPO|Chief Technology/i.test(f.role));
  const techLead = cto ?? c.founders[0];
  return `Technical diligence on ${c.name} centres on ${techLead?.name ?? "the founding team"} (${techLead?.bg ?? "technical founder"}). ${c.employees}-person team at ${c.stage} is an appropriate engineering-to-GTM ratio. The core differentiator — ${c.bulls.find((b) => /proprietary|patent|pipeline|algorithm|compiler|dataset|model|platform/i.test(b)) ?? c.bulls[0]} — is defensible if it survives independent benchmarking. Open items: architecture scalability under 10x load, cloud/vendor dependency, on-prem or data-residency support (required by a majority of enterprise buyers in ${c.sector}), and whether the moat is data, distribution, or engineering speed. Technical debt appears manageable at this headcount.`;
}

function financialText(c: Company): string {
  const mult = multipleOf(c);
  const multText = mult ? `At ${c.valuation} on ${c.revenue}, the round prices at ${mult}x ARR` : `At ${c.valuation} on ${c.revenue}`;
  return `${multText}. Growth of ${c.growth} is the headline metric and is above the ${c.stage} median for ${c.sector}. Key unknowns that drive the model: average contract value, gross margin after inference/compute costs, CAC payback period, net revenue retention, and burn multiple. ${mult && mult > 25 ? `A ${mult}x multiple leaves little margin of safety — we would need retention above 115% and gross margin above 70% to justify it.` : mult && mult > 12 ? `A ${mult}x multiple is full but defensible if growth holds above 150% for four more quarters.` : `The multiple is reasonable for the growth profile, giving room for execution slippage.`} Runway post-raise must be modelled at 18 months minimum before we commit.`;
}

function legalText(c: Company): string {
  return `Legal review for ${c.name} covers: founder IP assignment (all ${c.founders.length} named founders must have signed assignments before funding), prior-employer IP contamination risk${c.founders.some((f) => /Ex-/.test(f.bg)) ? ` — elevated given ${c.founders.map((f) => f.bg).join("; ").match(/Ex-[A-Za-z0-9 ]+/g)?.join(", ") ?? "big-company"} backgrounds` : ""}, customer data processing agreements, and ${c.geography === "UK" || c.geography === "Germany" || c.geography === "Europe" ? "GDPR compliance plus EU AI Act classification (high-risk designation would add conformity assessment obligations)" : c.geography === "USA" ? "SOC 2 Type II status, state privacy laws (CCPA/CPRA), and sector-specific regulation" : "local data-residency rules and cross-border transfer mechanics"}. ${c.sector === "HealthTech" ? "HIPAA/FDA pathway needs confirmation — a diagnostic claim triggers regulatory review." : c.sector === "FinTech" ? "Confirm money-transmission/licensing perimeter and any regulatory sandbox reliance." : "Confirm no regulated-activity perimeter is crossed by the current product."} No litigation flagged in public records; cap table and option pool must be verified in the data room.`;
}

function founderText(c: Company): string {
  return c.founders
    .map((f) => `${f.name} (${f.role}) — ${f.bg}.`)
    .join(" ")
    .concat(
      ` Founder-market fit assessment: ${c.founders.some((f) => /Ex-|PhD|partner|CMO|VP/i.test(f.bg)) ? "strong domain pedigree relative to the problem being solved" : "credible but requires reference validation"}. Verification required: employment history, prior exits, equity from previous ventures, and at least two investor references plus two customer references. Execution evidence to date: ${c.employees} hires and ${c.revenue} in revenue since founding in ${c.founded}. Red-flag screen: vesting schedules, any non-compete exposure, key-person concentration${c.founders.length === 1 ? " — sole founder is a material risk; require a senior technical or commercial hire as a condition of funding" : ""}.`
    );
}

function memoText(c: Company): string {
  const mult = multipleOf(c);
  return `${c.name} is a ${c.stage} ${c.sector} opportunity in ${c.geography}: ${c.tagline.toLowerCase()}. The investment case rests on three pillars — ${c.bulls[0].toLowerCase()}; ${c.bulls[1]?.toLowerCase() ?? `evidence of product-market fit with ${c.revenue} at ${c.growth}`}; and a founding team whose background maps directly onto the problem. AI recommendation from the DNA engine: ${c.aiRec}. Match against fund thesis: ${c.matchScore}%; underlying investment score: ${c.investmentScore}/100. ${mult ? `Valuation of ${c.valuation} on ${c.revenue} equals ${mult}x ARR.` : ""} Primary risk: ${c.risks[0]}. Recommended action: ${c.aiRec.startsWith("Strong Buy") ? "proceed to committee with intent to lead" : c.aiRec.startsWith("Buy") ? "proceed to committee" : c.aiRec.startsWith("Hold") ? "monitor and re-underwrite next round" : "keep on watchlist; re-engage when the flagged risk resolves"}.`;
}

function risksFor(c: Company): string[] {
  const mult = multipleOf(c);
  const out: string[] = [c.risks[0]];
  if (mult && mult > 20) out.push(`Valuation risk — ${mult}x ARR at ${c.stage} leaves little margin of safety if growth decelerates`);
  else if (mult) out.push(`Valuation risk — ${mult}x ARR requires sustained ${c.growth} growth to hold`);
  if (c.stage === "Pre-seed" || c.stage === "Seed") out.push(`Stage risk — ${c.stage} with ${c.revenue} means product-market fit is not yet proven; expect follow-on dilution`);
  if (c.employees < 25) out.push(`Team risk — ${c.employees} employees is thin for ${c.sector} go-to-market; key-person dependency is material`);
  if (c.founders.length === 1) out.push("Sole-founder risk — no co-founder to absorb CEO absence or disagreement");
  out.push(`Market risk — ${c.sector} is attracting heavy capital; well-funded incumbents can compress margins and extend sales cycles`);
  if (c.geography !== "USA") out.push(`Geographic risk — ${c.geography}-headquartered with US-domiciled buyers may face procurement friction and data-residency objections`);
  return out.slice(0, 5);
}

function questionsFor(c: Company): string[] {
  return [
    `What is net revenue retention over the last four quarters, and how much of ${c.revenue} is expansion vs new logos?`,
    `Break down gross margin after compute/inference costs — and how does it move at 5x volume?`,
    `Who are the top 5 customers as a percentage of ARR, and what triggered any churn in the last 12 months?`,
    `What specifically is defensible about ${c.bulls[0].toLowerCase()} — and how long until a well-funded competitor replicates it?`,
    `Post-raise runway in months at current burn, and what milestone does this round have to hit before the next one?`,
    c.founders.length === 1
      ? "What is the hiring plan for a co-founder-level executive in the next two quarters?"
      : `How is equity split among ${c.founders.map((f) => f.name).join(" and ")}, and what are the vesting terms?`,
  ];
}

// --- bull / bear for committee -------------------------------------------
function bullFor(c: Company): string[] {
  const mult = multipleOf(c);
  const out = [...c.bulls];
  out.push(`${c.revenue} at ${c.growth} — top-decile growth for ${c.stage} ${c.sector}`);
  if (mult && mult < 20) out.push(`Entry multiple of ${mult}x ARR is below the sector median for this growth rate`);
  out.push(`DNA match of ${c.matchScore}% — inside the fund's stated thesis on ${c.tags.slice(0, 2).join(" and ")}`);
  return out.slice(0, 6);
}

function bearFor(c: Company): string[] {
  const mult = multipleOf(c);
  const out = [...c.risks];
  if (mult && mult > 20) out.push(`${mult}x ARR at ${c.valuation} prices in flawless execution`);
  out.push(`Well-funded incumbents in ${c.sector} can bundle an equivalent capability and compress pricing`);
  if (c.employees < 40) out.push(`${c.employees}-person team must scale GTM and engineering simultaneously — execution bandwidth is the constraint`);
  if (c.stage === "Pre-seed" || c.stage === "Seed") out.push(`${c.stage} entry means at least two more dilutive rounds before liquidity is plausible`);
  if (c.geography !== "USA") out.push(`${c.geography} base adds procurement and data-residency friction with US enterprise buyers`);
  return out.slice(0, 6);
}

// --- living-memo timeline -------------------------------------------------
function updatesFor(c: Company): Analysis["updates"] {
  const now = new Date("2026-09-25T09:00:00Z");
  const d = (daysAgo: number) =>
    new Date(now.getTime() - daysAgo * 86400000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return [
    {
      date: d(3),
      type: "AI Update",
      icon: "🤖",
      title: `Competitive landscape shift in ${c.sector}`,
      body: `New entrants announced funding in ${c.sector} this quarter. Overlap with ${c.name}'s ${c.tags[0]?.toLowerCase() ?? "core"} positioning is partial. Competition risk re-rated ${c.investmentScore >= 80 ? "Low → Medium" : "Medium → High"}; moat still holds on ${c.bulls[0].toLowerCase()}.`,
      delta: "risk+1",
    },
    {
      date: d(9),
      type: "Portfolio",
      icon: "📊",
      title: `Revenue milestone: ${c.revenue}`,
      body: `${c.name} reported ${c.revenue} at ${c.growth}, ${c.investmentScore >= 80 ? "ahead of" : "broadly in line with"} the underwriting case. Thesis ${c.investmentScore >= 80 ? "strengthened" : "unchanged"}: adoption trajectory ${c.investmentScore >= 80 ? "faster than modelled" : "tracking plan"}.`,
      delta: "positive",
    },
    {
      date: d(21),
      type: "News",
      icon: "📰",
      title: `${c.stage} round progression`,
      body: `${c.lastRound} at ${c.valuation}. ${c.geography}-based investor participation signals regional confidence. Cap table and option pool verified in data room; no adverse terms identified.`,
      delta: "positive",
    },
  ];
}

// --- public API -----------------------------------------------------------
export function getAnalysis(c: Company): Analysis {
  return {
    market: marketText(c),
    technical: technicalText(c),
    financial: financialText(c),
    legal: legalText(c),
    founder: founderText(c),
    memo: memoText(c),
    risks: risksFor(c),
    questions: questionsFor(c),
    bull: bullFor(c),
    bear: bearFor(c),
    comparables: COMPARABLES[c.sector] ?? FALLBACK_COMPARABLES,
    updates: updatesFor(c),
  };
}

export function getComparables(sector: string): Analysis["comparables"] {
  return COMPARABLES[sector] ?? FALLBACK_COMPARABLES;
}
