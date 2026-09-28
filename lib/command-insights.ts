import { companies, portfolio } from "./mock-data";
import { marketSignals } from "./market-signals";
import type { Deal, StageId } from "./pipeline-data";

export type InsightKind = "decide" | "diligence" | "portfolio" | "market" | "capital" | "followup";

export interface CommandInsight {
  id: string;
  kind: InsightKind;
  label: string;
  title: string;
  evidence: string;
  benefit: string;
  action: string;
  href: string;
  priority: number;
}

interface TaskLike {
  id?: string;
  title?: unknown;
  companyId?: unknown;
  due?: unknown;
  status?: unknown;
}

interface CommitmentLike {
  id?: string;
  lp?: unknown;
  committed?: unknown;
  called?: unknown;
  status?: unknown;
}

const ACTIVE: StageId[] = ["discovered", "contacted", "diligence", "committee"];
const STAGE_RANK: Record<StageId, number> = {
  committee: 4,
  diligence: 3,
  contacted: 2,
  discovered: 1,
  invested: 0,
  passed: 0,
};
const STAGE_LABEL: Record<StageId, string> = {
  discovered: "Discover",
  contacted: "Connect",
  diligence: "Diligence",
  committee: "Decision",
  invested: "Invested",
  passed: "Passed",
};

function company(id: string) {
  return companies.find((c) => c.id === id);
}

function pretty(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (!year || !month || !day) return iso;
  return `${day} ${months[month - 1]} ${year}`;
}

function millions(value: number) {
  if (value >= 1_000_000) {
    const millionsValue = value / 1_000_000;
    return `$${millionsValue % 1 === 0 ? millionsValue.toFixed(0) : millionsValue.toFixed(1)}M`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

function destination(deal: Deal | undefined, companyId: string) {
  if (deal?.stageId === "committee") return `/committee/${companyId}`;
  if (deal?.stageId === "diligence") return `/diligence/${companyId}`;
  if (deal?.stageId === "invested") return "/portfolio";
  if (companyId) return `/deal/${companyId}`;
  return "/work";
}

function followupBenefit(title: string, name: string) {
  if (/cohort/i.test(title)) return "Cohort retention is the evidence that shows whether the growth is repeatable.";
  if (/reference call/i.test(title)) return "This call is the check the diligence note is waiting on.";
  if (/data-room|data room/i.test(title)) return "The data room is what turns a conversation into evidence you can judge.";
  if (/clinical/i.test(title)) return "The clinical dataset is what makes the accuracy claim something you can rely on.";
  if (/board memo/i.test(title)) return "The memo is how you walk into the board meeting with a position.";
  if (/LP letter/i.test(title)) return "The letter is how investors hear the quarter from you.";
  return name
    ? `Finishing this keeps ${name} from waiting on a step already assigned.`
    : "Finishing this keeps the next review on the date you set.";
}

function bestMatch(deals: Deal[], sectors: readonly string[], skipCommittee = false) {
  const matches = deals
    .filter((deal) => ACTIVE.includes(deal.stageId) && sectors.includes(deal.sector))
    .sort((a, b) => STAGE_RANK[b.stageId] - STAGE_RANK[a.stageId]);
  if (skipCommittee) return matches.find((deal) => deal.stageId !== "committee") ?? matches[0];
  return matches[0];
}

/** Opportunity-impact research, each tied to the furthest live company in those sectors. */
export function opportunityOpenings(deals: Deal[]) {
  return marketSignals
    .filter((signal) => signal.impact === "Opportunity")
    .map((signal) => {
      const deal = bestMatch(deals, signal.sectors, true);
      return {
        id: signal.id,
        publisher: signal.publisher,
        topic: signal.topic,
        title: signal.title,
        metric: signal.metric,
        metricLabel: signal.metricLabel,
        question: signal.question,
        company: deal?.name ?? null,
        href: deal ? destination(deal, deal.companyId) : "/signals",
        action: deal ? `Test this on ${deal.name}` : "Open market signals",
        mix: (["discovered", "contacted", "diligence", "committee"] as StageId[]).map((id) => ({
          label: STAGE_LABEL[id] === "Decision" ? "Decide" : STAGE_LABEL[id],
          n: deals.filter((item) => item.stageId === id && (signal.sectors as readonly string[]).includes(item.sector)).length,
        })),
      };
    });
}

export function buildCommandInsights(input: {
  deals: Deal[];
  tasks: TaskLike[];
  commitments?: CommitmentLike[];
  today?: string;
}): CommandInsight[] {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const insights: CommandInsight[] = [];

  for (const deal of input.deals.filter((item) => item.stageId === "committee")) {
    const profile = company(deal.companyId);
    insights.push({
      id: `decide-${deal.id}`,
      kind: "decide",
      label: "Decision",
      title: `${deal.name} is in front of you`,
      evidence: `${deal.note}. ${profile?.risks[0] ? `Open risk: ${profile.risks[0]}` : ""}`.trim(),
      benefit: profile?.bulls[0]
        ? `A yes or no now uses the case already built: ${profile.bulls[0]}`
        : "A yes or no now uses the case already built.",
      action: "Open the decision room",
      href: `/committee/${deal.companyId}`,
      priority: 100,
    });
  }

  for (const holding of portfolio) {
    const alert = holding.alerts[0];
    if (!alert || (holding.status !== "red" && holding.status !== "yellow")) continue;
    insights.push({
      id: `portfolio-${holding.id}`,
      kind: "portfolio",
      label: holding.status === "red" ? "Portfolio risk" : "Off plan",
      title: `${holding.name}: ${alert}`,
      evidence: `${holding.stage} · ${holding.currentValue} marked value on ${holding.invested} invested (${holding.multiple}).${holding.alerts[1] ? ` Also noted: ${holding.alerts[1]}.` : ""}`,
      benefit:
        holding.status === "red"
          ? "Reviewing it before the board meeting is how you decide whether to support, restructure, or hold."
          : "Checking the gap against plan now is how you catch a slowdown before the next report.",
      action: `Review ${holding.name}`,
      href: "/portfolio",
      priority: holding.status === "red" ? 90 : 52,
    });
  }

  const watches = marketSignals.filter((signal) => signal.impact === "Watch");
  for (const signal of watches) {
    const deal = bestMatch(input.deals, signal.sectors);
    if (!deal) continue;
    insights.push({
      id: `watch-${signal.id}`,
      kind: "market",
      label: "Risk to weigh",
      title: signal.title,
      evidence: `${signal.publisher} · ${signal.metric} ${signal.metricLabel.toLowerCase()}. This reaches ${deal.name}, now in ${STAGE_LABEL[deal.stageId]}.`,
      benefit: signal.question,
      action: `Use this on ${deal.name}`,
      href: destination(deal, deal.companyId),
      priority: deal.stageId === "committee" || deal.stageId === "diligence" ? 84 : 64,
    });
  }

  const openings = marketSignals
    .filter((signal) => signal.impact === "Opportunity")
    .map((signal) => ({ signal, deal: bestMatch(input.deals, signal.sectors, true) }))
    .filter((item) => item.deal)
    .sort((a, b) => STAGE_RANK[b.deal!.stageId] - STAGE_RANK[a.deal!.stageId]);
  const opening = openings[0];
  const openingDeal = opening?.deal;
  if (opening && openingDeal) {
    insights.push({
      id: `open-${opening.signal.id}`,
      kind: "market",
      label: "Opening to test",
      title: opening.signal.title,
      evidence: `${opening.signal.publisher} · ${opening.signal.metric} ${opening.signal.metricLabel.toLowerCase()}. Closest live company: ${openingDeal.name}.`,
      benefit: opening.signal.question,
      action: `Test this on ${openingDeal.name}`,
      href: destination(openingDeal, openingDeal.companyId),
      priority: 70,
    });
  }

  for (const row of input.commitments ?? []) {
    const committed = Number(row.committed || 0);
    const called = Number(row.called || 0);
    const status = String(row.status ?? "");
    if (committed <= 0 || called > 0 || !/pending|signed/i.test(status)) continue;
    insights.push({
      id: `capital-${row.id}`,
      kind: "capital",
      label: "Capital",
      title: `${String(row.lp)} is signed and not yet called`,
      evidence: `${millions(committed)} committed · nothing called · ${status}.`,
      benefit: "Calling it is what turns a signed commitment into capital you can deploy.",
      action: "Review the commitment",
      href: "/commitments",
      priority: 78,
    });
  }

  for (const task of input.tasks) {
    if (String(task.status) === "done") continue;
    const due = String(task.due ?? "");
    if (!due || due > today) continue;
    const companyId = String(task.companyId ?? "");
    const deal = input.deals.find((item) => item.companyId === companyId);
    const profile = company(companyId);
    const name = profile?.name ?? deal?.name ?? "";
    const overdue = due < today;
    insights.push({
      id: `task-${String(task.id)}`,
      kind: "followup",
      label: overdue ? "Overdue" : "Due today",
      title: String(task.title),
      evidence: [name && `${name}${deal ? `, ${STAGE_LABEL[deal.stageId]}` : ""}.`, `Due ${pretty(due)}.`, deal?.note].filter(Boolean).join(" "),
      benefit: followupBenefit(String(task.title), name),
      action: name ? `Open ${name}` : "Open follow-ups",
      href: destination(deal, companyId),
      priority: (overdue ? 80 : 58) + (deal && (deal.stageId === "diligence" || deal.stageId === "committee") ? 4 : 0),
    });
  }

  for (const deal of input.deals.filter((item) => item.stageId === "diligence" && item.daysInStage >= 7)) {
    const profile = company(deal.companyId);
    insights.push({
      id: `diligence-${deal.id}`,
      kind: "diligence",
      label: "Diligence",
      title: `${deal.name} has sat in diligence for ${deal.daysInStage} days`,
      evidence: deal.note,
      benefit: profile?.risks[0]
        ? `Still unresolved: ${profile.risks[0]}`
        : "Closing the open checks is what makes the next decision defensible.",
      action: "Continue diligence",
      href: `/diligence/${deal.companyId}`,
      priority: 48,
    });
  }

  const ranked = insights.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
  const picked: CommandInsight[] = [];
  const seen = new Set<string>();
  const take = (match: (item: CommandInsight) => boolean) => {
    const next = ranked.find((item) => !seen.has(item.id) && match(item));
    if (!next) return;
    picked.push(next);
    seen.add(next.id);
  };
  take((item) => item.kind === "decide");
  take((item) => item.kind === "portfolio" && item.priority >= 80);
  take((item) => item.kind === "market" && item.label === "Risk to weigh");
  take((item) => item.kind === "followup");
  take((item) => item.kind === "capital");
  take((item) => item.kind === "market" && item.label === "Opening to test");
  return picked.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
}
