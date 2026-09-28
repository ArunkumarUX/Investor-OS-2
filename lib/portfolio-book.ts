import { companies, portfolio } from "./mock-data";
import { initialDeals, type StageId } from "./pipeline-data";

export type Holding = (typeof portfolio)[number];

/** Marked holdings, plus any company a recorded Invest decision has moved to Invested. */
export function liveHoldings(stages: Record<string, StageId> = {}): Holding[] {
  const added = initialDeals
    .filter((deal) => (stages[deal.companyId] ?? deal.stageId) === "invested")
    .filter((deal) => !portfolio.some((holding) => holding.id === deal.companyId))
    .map((deal) => {
      const profile = companies.find((company) => company.id === deal.companyId);
      return {
        id: deal.companyId,
        name: deal.name,
        sector: deal.sector,
        stage: profile?.stage ?? "Invested",
        invested: "Not marked",
        ownership: "—",
        currentValue: "Not marked",
        multiple: "—",
        irr: "—",
        investedDate: "",
        status: "yellow" as const,
        alerts: ["Invest decision recorded. Mark cost and value before this position enters fund totals."],
        logo: profile?.logo ?? "•",
      };
    });
  return [...portfolio, ...added];
}

export function isMarked(value: string) {
  return !/not marked|^—$/i.test(value) && Number(value.replace(/[^0-9.]/g, "")) > 0;
}
