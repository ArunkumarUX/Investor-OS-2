import { getAnalysis } from "./ai-content";
import { companies, portfolio } from "./mock-data";
import { SIGNALS_REVIEWED, marketSignals } from "./market-signals";
import { isMarked, liveHoldings, type Holding } from "./portfolio-book";
import type { StageId } from "./pipeline-data";
import { samplePattern, sampleVerdicts, sampleDossier } from "./sample-workspace";

export type Verdict = { decision: string; confidence: number; at: string; rationale?: string };

type WatchKind = "growth" | "team" | "funding" | "competition";

export function classifyNote(text: string): WatchKind | "regulatory" | "financial" | "market" {
  const lead = text.split("—")[0].trim().toLowerCase();
  if (lead.startsWith("valuation") || lead.startsWith("financial")) return "financial";
  if (lead.startsWith("team") || lead.startsWith("sole-founder") || lead.startsWith("sole founder")) return "team";
  if (lead.startsWith("market") || lead.startsWith("stage") || lead.startsWith("geographic")) return "market";
  if (/competitor|competition|incumbent|crowded/i.test(text)) return "competition";
  if (/hire|ceo|depart|team|board|founder/i.test(text)) return "team";
  if (/raised|round|funding|capital call/i.test(text)) return "funding";
  if (/growth|revenue|deceler|slow|arr|burn|valuat/i.test(text)) return "financial";
  if (/regulat|fda|gdpr|legal|approval/i.test(text)) return "regulatory";
  return "market";
}

function millions(value: string) {
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  if (/k/i.test(value)) return n / 1000;
  if (/b/i.test(value)) return n * 1000;
  return n;
}

function multipleOf(value: string) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function companyPicture(id: string) {
  const company = companies.find((item) => item.id === id);
  if (!company) return null;
  const analysis = getAnalysis(company);
  const holding = portfolio.find((item) => item.id === id);
  const signals = marketSignals.filter((signal) => (signal.sectors as readonly string[]).includes(company.sector));
  const risks = analysis.risks.map((text) => ({ text, kind: classifyNote(text) }));
  const peers = analysis.comparables.map((item) => ({ name: item.name, sector: item.sector, year: item.year }));
  return { company, analysis, holding, signals, risks, peers };
}

export function memoChanges(id: string) {
  const picture = companyPicture(id);
  if (!picture) return [];
  const changes: { title: string; detail: string; effect: string }[] = [];
  for (const alert of picture.holding?.alerts ?? []) {
    const kind = classifyNote(alert);
    changes.push({
      title: alert,
      detail: `Written on the portfolio record for ${picture.company.name}.`,
      effect: kind === "competition" || kind === "team" || kind === "financial" ? "Risk to weigh" : "Noted on the record",
    });
  }
  const signal = picture.signals.find((item) => item.impact === "Watch") ?? picture.signals[0];
  if (signal) {
    changes.push({
      title: signal.title,
      detail: `${signal.publisher} · reviewed ${new Date(`${SIGNALS_REVIEWED}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. ${signal.question}`,
      effect: signal.impact === "Watch" ? "Risk to weigh" : "Context. The thesis is unchanged.",
    });
  }
  return changes;
}

export function bookMemory(decisions: Record<string, Verdict>, stages: Record<string, StageId> = {}) {
  const holdings = liveHoldings(stages);
  const marked = holdings.filter((item) => isMarked(item.multiple));
  const below = marked.filter((item) => (multipleOf(item.multiple) ?? 1) < 1);
  const held = marked.filter((item) => (multipleOf(item.multiple) ?? 0) >= 1 && item.alerts.length === 0 && item.status === "green");
  const flagged = holdings.filter((item) => item.alerts.length > 0);
  const file = {
    ...Object.fromEntries(sampleVerdicts.map((item) => [item.id, item])),
    ...decisions,
  };
  const verdicts = Object.values(file);
  const invested = verdicts.filter((item) => item.decision === "invest").length;
  const passed = verdicts.filter((item) => item.decision === "reject").length;
  const counts = new Map<string, number>();
  holdings.forEach((item) => counts.set(item.sector, (counts.get(item.sector) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const lines = [
    { label: "Previous investments", text: `${holdings.map((item) => item.name).join(", ")}.` },
    {
      label: "What has held",
      text: held.length
        ? `${held.map((item) => `${item.name} at ${item.multiple}`).join(", ")} ${held.length === 1 ? "is" : "are"} above cost with no alert on the record.`
        : "No marked holding is both above cost and free of alerts.",
    },
    {
      label: "What went against the book",
      text: below.length
        ? below.map((item) => `${item.name} is marked at ${item.multiple}${item.alerts.length ? ` — ${item.alerts.join("; ")}` : ""}.`).join(" ")
        : "No marked holding is below cost.",
    },
    {
      label: "Concentration",
      text: top ? `${top[0]} is the largest sector in the book, ${top[1]} of ${holdings.length} companies.` : "The book is empty.",
    },
    {
      label: "Recorded judgment",
      text: `${invested} invest, ${verdicts.filter((item) => item.decision === "watch").length} watch, and ${passed} pass are in the sample file, plus any decision you save. ${samplePattern}`,
    },
  ];
  if (flagged.length) {
    lines.splice(3, 0, { label: "Open alerts", text: flagged.map((item) => `${item.name}: ${item.alerts.join("; ")}`).join(" ") });
  }
  return { holdings, lines };
}

export function watchBoard(stages: Record<string, StageId> = {}) {
  const holdings = liveHoldings(stages);
  const columns: { id: WatchKind; label: string; items: { id: string; name: string; note: string; alert: boolean }[] }[] = [
    { id: "growth", label: "Growth", items: [] },
    { id: "team", label: "Hiring and team", items: [] },
    { id: "funding", label: "Funding", items: [] },
    { id: "competition", label: "Competition", items: [] },
  ];
  for (const holding of holdings) {
    const company = companies.find((item) => item.id === holding.id);
    const push = (id: WatchKind, note: string, alert: boolean) => {
      columns.find((column) => column.id === id)?.items.push({ id: holding.id, name: holding.name, note, alert });
    };
    const file = company ? sampleDossier(company.id) : null;
    const growthAlert = holding.alerts.find((alert) => classifyNote(alert) === "financial" && /growth|revenue|deceler|slow/i.test(alert));
    if (growthAlert) push("growth", growthAlert, true);
    else if (company) push("growth", `On the record: ${company.growth}`, false);
    const teamAlert = holding.alerts.find((alert) => classifyNote(alert) === "team");
    if (teamAlert) push("team", teamAlert, true);
    else if (file) push("team", file.hiring, false);
    const fundingAlert = holding.alerts.find((alert) => classifyNote(alert) === "funding");
    if (fundingAlert) push("funding", fundingAlert, true);
    else if (file) push("funding", file.funding, false);
    const competitionAlert = holding.alerts.find((alert) => classifyNote(alert) === "competition");
    if (competitionAlert) push("competition", competitionAlert, true);
    else if (file) push("competition", `Sample competitors: ${file.competitors.join(", ")}`, false);
  }
  const quiet = holdings.filter((item) => item.alerts.length === 0).map((item) => item.name);
  return { columns, quiet };
}

export function lpBrief(holdings: Holding[]) {
  const flagged = holdings.filter((item) => item.alerts.length > 0);
  const below = holdings.filter((item) => {
    const multiple = multipleOf(item.multiple);
    return multiple !== null && multiple < 1;
  });
  const counts = new Map<string, number>();
  holdings.forEach((item) => counts.set(item.sector, (counts.get(item.sector) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const invested = holdings.reduce((sum, item) => sum + (isMarked(item.invested) ? millions(item.invested) : 0), 0);
  const current = holdings.reduce((sum, item) => sum + (isMarked(item.currentValue) ? millions(item.currentValue) : 0), 0);
  const multiple = invested > 0 ? current / invested : null;
  const insights = [
    `${holdings.length} companies are in the book. ${flagged.length} have an alert on the record.`,
    below.length
      ? `${below.map((item) => `${item.name} is marked at ${item.multiple}`).join("; ")}.`
      : "Every marked multiple is at or above cost.",
    top ? `${top[0]} holds the most companies: ${top[1]} of ${holdings.length}.` : "No sector concentration is available.",
    flagged.length
      ? flagged.map((item) => `${item.name}: ${item.alerts[0]}`).join(" ")
      : "No portfolio alert is on the record.",
  ];
  const letter = [
    "Dear Limited Partners,",
    "",
    "This note is drawn from the current sample book. It is not an audited quarter and it has not been sent.",
    "",
    `The book holds ${holdings.length} companies. Marked cost is $${invested.toFixed(1)}M and marked value is $${current.toFixed(1)}M${multiple ? `, ${multiple.toFixed(2)}× on that snapshot` : ""}. That ratio is a current snapshot, not a period return.`,
    "",
    below.length
      ? `${below.map((item) => `${item.name} is marked at ${item.multiple}. ${item.alerts.join(" ")}`).join(" ")}`
      : "No marked holding is below cost.",
    "",
    flagged.length
      ? `Alerts on the record: ${flagged.map((item) => `${item.name} — ${item.alerts.join("; ")}`).join(". ")}.`
      : "No alerts are on the record.",
  ].join("\n");
  return { insights, letter, invested, current, multiple, flagged: flagged.length };
}
