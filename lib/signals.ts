// Market Signals — data-source registry + SAMPLE signals.
// The signals below are illustrative demo content, NOT live licensed data.
// Each provider is a separate licensed API; wire real calls behind
// /api/signals using each provider's own credentials/endpoint.

export interface DataSource {
  id: string;
  name: string;
  category: string;
  blurb: string;
  color: string;
  initials: string;
  status: "sample" | "connected";
}

export const DATA_SOURCES: DataSource[] = [
  { id: "cbinsights", name: "CB Insights — Signal", category: "Private markets", blurb: "Fundings, valuations, Mosaic health scores and market maps for private companies.", color: "#2a78d6", initials: "CB", status: "sample" },
  { id: "magnitt", name: "MAGNiTT", category: "Emerging venture", blurb: "MENA, Africa, Türkiye and Southeast Asia venture funding and investor data.", color: "#eb6834", initials: "MG", status: "sample" },
  { id: "bloomberg", name: "Bloomberg", category: "Public markets", blurb: "Public comparables, sector indices and real-time market data for benchmarking.", color: "#1a1a19", initials: "BB", status: "sample" },
  { id: "fortune500", name: "Fortune 500", category: "Incumbents", blurb: "Corporate moves, M&A and strategic shifts among the largest incumbents.", color: "#B7791F", initials: "F5", status: "sample" },
  { id: "eiu", name: "Economist Intelligence Unit", category: "Macro & risk", blurb: "Country risk, macro forecasts and regulatory outlook by market.", color: "#2E7D32", initials: "EIU", status: "sample" },
];

export type SignalType = "funding" | "m&a" | "hiring" | "patent" | "macro" | "market";

export interface MarketSignal {
  id: string;
  sourceId: string;
  type: SignalType;
  company: string;
  headline: string;
  detail: string;
  delta: "positive" | "watch" | "negative";
  when: string;
  // analysis layer
  analysis: string;      // what it means, read against our position
  action: string;        // recommended next step
  confidence: "High" | "Medium" | "Low";
  metric?: { label: string; value: string }[];
  relatedId?: string;    // company id in the pipeline, if any
}

export const SAMPLE_SIGNALS: MarketSignal[] = [
  { id: "s1", sourceId: "cbinsights", type: "funding", company: "Nova AI", relatedId: "nova-ai",
    headline: "Comparable raised $60M Series B at $520M", delta: "positive", when: "2h ago",
    detail: "Enterprise AI automation valuations up ~2.1x YoY across the CB Insights market map.",
    analysis: "A direct comparable pricing at $520M re-rates our Nova AI position materially — we hold at an $80M entry, implying meaningful mark-up headroom and a stronger next-round story. It also signals the segment is still attracting late-stage capital despite the broader slowdown.",
    action: "Refresh the Nova AI valuation comps in the deal memo and flag the mark-up to the next IC.",
    confidence: "High",
    metric: [{ label: "Comparable valuation", value: "$520M" }, { label: "Our entry", value: "$80M" }, { label: "Segment YoY", value: "+2.1x" }] },

  { id: "s2", sourceId: "bloomberg", type: "market", company: "AI infrastructure",
    headline: "Sector index +4.3% this week", delta: "positive", when: "5h ago",
    detail: "Public AI-infra names rallied on strong hyperscaler capex guidance.",
    analysis: "Public-market strength in AI infra is a leading indicator for private multiples in adjacent application-layer deals. Supports holding rather than trimming AI exposure this quarter.",
    action: "Hold AI allocation; revisit if the index gives back more than 5%.",
    confidence: "Medium",
    metric: [{ label: "Index week", value: "+4.3%" }] },

  { id: "s3", sourceId: "magnitt", type: "funding", company: "FinFlow", relatedId: "finflow",
    headline: "MENA treasury-tech funding at 3-yr high", delta: "positive", when: "8h ago",
    detail: "UAE fintech deal count up 38% QoQ; FinFlow's segment is heating.",
    analysis: "MAGNiTT data shows FinFlow's home market accelerating — good for its next raise and for exit optionality via regional acquirers, but rising deal count also means more competition for the same customers.",
    action: "Accelerate the FinFlow diligence timeline before pricing moves against us.",
    confidence: "Medium",
    metric: [{ label: "UAE deal count QoQ", value: "+38%" }, { label: "Segment funding", value: "3-yr high" }] },

  { id: "s4", sourceId: "fortune500", type: "m&a", company: "Helix Health", relatedId: "helix-health",
    headline: "Incumbent acquires rival diagnostics startup", delta: "watch", when: "1d ago",
    detail: "A Fortune 500 healthcare group moved into AI diagnostics — validates thesis, raises competition.",
    analysis: "The acquisition validates the AI-diagnostics thesis and creates a credible acquirer for Helix — but it also puts a well-capitalised incumbent into the market, compressing the window to establish a defensible data moat.",
    action: "Pressure-test Helix's moat and regulatory lead in diligence; add a competitive-response question for the founders.",
    confidence: "High",
    metric: [{ label: "New competitor", value: "Fortune 500" }, { label: "Thesis", value: "Validated" }] },

  { id: "s5", sourceId: "eiu", type: "macro", company: "UK / Europe",
    headline: "EIU trims 2026 growth forecast to 1.1%", delta: "watch", when: "1d ago",
    detail: "Softer macro backdrop for European early-stage; watch runway assumptions.",
    analysis: "A weaker growth outlook lengthens sales cycles for European portfolio companies and pressures follow-on timing. Runway assumptions built on 2025 momentum may be optimistic.",
    action: "Stress-test runway for European holdings at flat revenue; hold extra reserves.",
    confidence: "Medium",
    metric: [{ label: "EIU 2026 growth", value: "1.1%" }] },

  { id: "s6", sourceId: "cbinsights", type: "hiring", company: "Nova AI", relatedId: "nova-ai",
    headline: "Headcount +32% in 90 days", delta: "positive", when: "2d ago",
    detail: "Signal headcount data shows aggressive senior eng hiring — execution on track.",
    analysis: "Rapid senior-engineering hiring is a strong execution signal and consistent with the roadmap the founders presented. Watch burn — this pace shortens runway.",
    action: "Confirm the hiring plan against the model's burn assumptions before committing.",
    confidence: "High",
    metric: [{ label: "Headcount 90d", value: "+32%" }] },

  { id: "s7", sourceId: "bloomberg", type: "market", company: "CleanTech", relatedId: "terrabyte",
    headline: "Sector multiples compress 12%", delta: "negative", when: "2d ago",
    detail: "Public cleantech de-rated on rate expectations — re-check TerraByte marks.",
    analysis: "A 12% de-rating in public cleantech flows through to private marks — TerraByte (already a weak position) likely needs a downward mark this quarter.",
    action: "Re-mark TerraByte and prepare the LP note ahead of quarterly reporting.",
    confidence: "Medium",
    metric: [{ label: "Sector multiples", value: "-12%" }] },

  { id: "s8", sourceId: "magnitt", type: "patent", company: "AtomSpace", relatedId: "atomspace",
    headline: "New patent filings in edge inference", delta: "positive", when: "3d ago",
    detail: "Rising IP activity in the segment; moat forming among early movers.",
    analysis: "Increased patent activity suggests a defensible-IP window is opening in edge inference — favourable for AtomSpace if it can file early, but a warning if competitors are ahead.",
    action: "Ask AtomSpace for its IP roadmap and filing status during first diligence.",
    confidence: "Low",
    metric: [{ label: "IP activity", value: "Rising" }] },
];
