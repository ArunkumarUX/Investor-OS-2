"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { isMarked, liveHoldings } from "@/lib/portfolio-book";
import { companies } from "@/lib/mock-data";
import { initialDeals, type StageId } from "@/lib/pipeline-data";
import { subscribeStore, getStoreSnapshot, getStoreServerSnapshot, parseSnapshot } from "@/lib/store";
import { useCollection } from "@/lib/data-client";
import { useAuth, canAccess } from "@/lib/auth";
import { buildCommandInsights, opportunityOpenings, type CommandInsight } from "@/lib/command-insights";
import { rankDiscoveries } from "@/lib/discovery-rank";
import { SIGNALS_REVIEWED } from "@/lib/market-signals";
import styles from "./dashboard.module.css";

const money = (value: string) => Number(value.replace(/[^0-9.]/g, "")) * (/K/i.test(value) ? 0.001 : /B/i.test(value) ? 1000 : 1);
const pad = (n: number) => String(n).padStart(2, "0");
const mark = (name: string) => {
  const parts = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  return letters.toUpperCase();
};
const millions = (n: number) => `$${n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}B` : `${n.toFixed(n % 1 === 0 ? 0 : 1)}M`}`;
const lanes: { id: StageId; label: string }[] = [
  { id: "discovered", label: "Discover" },
  { id: "contacted", label: "Connect" },
  { id: "diligence", label: "Diligence" },
  { id: "committee", label: "Decide" },
];

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function pickInsight(focus: string, insights: CommandInsight[]) {
  if (focus === "health") return insights.find((item) => item.kind === "portfolio") ?? insights[0];
  if (focus === "execution") return insights.find((item) => item.kind === "decide" || item.kind === "followup" || item.kind === "diligence") ?? insights[0];
  return insights[0];
}

function HoldingsChart({ rows }: { rows: { name: string; invested: string; currentValue: string }[] }) {
  let invested = 0;
  let value = 0;
  const curve = rows.map((row) => {
    invested += money(row.invested);
    value += money(row.currentValue);
    return { name: row.name.split(" ")[0], invested, value };
  });
  if (curve.length < 2) return null;
  const ceiling = Math.ceil(Math.max(invested, value, 1) / 10) * 10;
  const left = 36;
  const right = 688;
  const top = 14;
  const base = 158;
  const n = curve.length - 1;
  const xy = (point: { invested: number; value: number }, index: number, key: "invested" | "value") => [
    left + (index / n) * (right - left),
    base - (point[key] / ceiling) * (base - top),
  ];
  const path = (key: "invested" | "value") => curve.map((point, index) => `${index ? "L" : "M"}${xy(point, index, key).join(" ")}`).join(" ");
  const area = `${path("value")} L${right} ${base} L${left} ${base} Z`;
  return <div className={styles.chartWrap}>
    <svg className={styles.chart} viewBox="0 0 700 176" role="img" aria-label={`Cumulative holding value compared with invested capital, by company: ${curve.map((point) => `${point.name} ${point.value.toFixed(1)} million`).join(", ")}. Not a time series.`}>
      <defs>
        <linearGradient id="holdingFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dce7cc" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#dce7cc" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((tick) => {
        const y = base - tick * (base - top);
        return <g key={tick}>
          <line x1={left} x2={right} y1={y} y2={y} className={styles.chartGrid} />
          <text x={left - 6} y={y + 3} className={styles.chartAxis}>${Math.round(ceiling * tick)}</text>
        </g>;
      })}
      <path d={area} fill="url(#holdingFill)" />
      <path d={path("invested")} className={styles.chartInvested} />
      <path d={path("value")} className={styles.chartValue} />
      {curve.map((point, index) => {
        const [x, y] = xy(point, index, "value");
        return <circle key={point.name} cx={x} cy={y} r="3.5" className={styles.chartPoint}><title>{point.name} · ${point.value.toFixed(1)}M value, ${point.invested.toFixed(1)}M invested</title></circle>;
      })}
    </svg>
    <p className={styles.chartLegend}><span>Holding value</span><span>Invested capital</span><span>Cumulative by company, $M. Not a time series.</span></p>
  </div>;
}

function smooth(points: number[][]) {
  if (points.length < 2) return "";
  let path = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    const c1x = current[0] + (next[0] - previous[0]) / 6;
    const c1y = current[1] + (next[1] - previous[1]) / 6;
    const c2x = next[0] - (after[0] - current[0]) / 6;
    const c2y = next[1] - (after[1] - current[1]) / 6;
    path += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${next[0].toFixed(1)} ${next[1].toFixed(1)}`;
  }
  return path;
}

function EchoChart({ values, label, tone, id }: { values: number[]; label: string; tone: "light" | "ink"; id: string }) {
  const width = 160;
  const height = 52;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : 4 + (index / (values.length - 1)) * (width - 8);
    const y = 8 + (1 - value / max) * 26;
    return [x, y];
  });
  const line = smooth(points);
  const echo = smooth(points.map(([x, y]) => [x, Math.min(height - 2, y + 8)]));
  const floor = points.length ? points[points.length - 1][0] : width;
  const start = points[0]?.[0] ?? 0;
  const color = tone === "ink" ? "#217553" : "#dce7cc";
  return <svg className={tone === "light" ? styles.echoWide : styles.echo} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.34" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={`${line} L${floor.toFixed(1)} 46 L${start.toFixed(1)} 46 Z`} fill={`url(#${id})`} />
    <path d={echo} className={styles.echoLine} data-tone={tone} />
    <path d={line} className={styles.echoLine} data-tone={tone} data-main="true" />
  </svg>;
}

function EchoRing({ value, label }: { value: number; label: string }) {
  const turn = 2 * Math.PI;
  const outer = `${(value / 100) * turn * 16} ${turn * 16}`;
  const inner = `${(value / 100) * turn * 12} ${turn * 12}`;
  return <svg className={styles.echoRing} viewBox="0 0 40 40" role="img" aria-label={label}>
    <g transform="rotate(-90 20 20)">
      <circle cx="20" cy="20" r="16" className={styles.echoTrack} />
      <circle cx="20" cy="20" r="16" className={styles.echoArc} data-tone="ghost" strokeDasharray={outer} />
      <circle cx="20" cy="20" r="12" className={styles.echoArc} strokeDasharray={inner} />
    </g>
  </svg>;
}

export default function CommandCenter() {
  const { user } = useAuth();
  const [focus, setFocus] = useState("balanced");
  const snapshot = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot));
  const { items: tasks, loading: tasksLoading, error, reload } = useCollection("tasks");
  const commitments = useCollection("commitments");
  const deals = initialDeals.map((deal) => ({ ...deal, stageId: snapshot.stages[deal.companyId] ?? deal.stageId }));
  const insights = buildCommandInsights({ deals, tasks, commitments: commitments.items, today: todayISO() }).filter((item) => canAccess(user, item.href));
  const next = pickInsight(focus, insights);
  const committee = deals.filter((deal) => deal.stageId === "committee");
  const active = deals.filter((deal) => (["discovered", "contacted", "diligence", "committee"] as StageId[]).includes(deal.stageId));
  const discoveries = rankDiscoveries({ dna: snapshot.dna ?? null, stages: snapshot.stages });
  const thesisMatches = discoveries.filter((company) => company.thesisMatch);
  const leadSource = thesisMatches[0] ?? discoveries[0];
  const portfolio = liveHoldings(snapshot.stages);
  const marked = portfolio.filter((holding) => isMarked(holding.currentValue) && isMarked(holding.invested));
  const totalValue = marked.reduce((sum, holding) => sum + money(holding.currentValue), 0);
  const investedCapital = marked.reduce((sum, holding) => sum + money(holding.invested), 0);
  const flagged = portfolio.filter((holding) => holding.status !== "green" || holding.alerts.length > 0);
  const health = [
    { tone: "ok", n: portfolio.filter((holding) => holding.status === "green").length },
    { tone: "warn", n: portfolio.filter((holding) => holding.status === "yellow").length },
    { tone: "bad", n: portfolio.filter((holding) => holding.status === "red").length },
  ];
  const committed = commitments.items.reduce((sum, row) => sum + Number(row.committed || 0), 0);
  const called = commitments.items.reduce((sum, row) => sum + Number(row.called || 0), 0);
  const calledPct = committed ? Math.round((called / committed) * 100) : 0;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const first = user?.name.split(" ")[0] ?? "investor";
  const today = todayISO();
  const blocked = tasks
    .filter((task) => String(task.status) !== "done" && String(task.due || "") && String(task.due) <= today)
    .map((task) => {
      const companyId = String(task.companyId || "");
      const deal = deals.find((item) => item.companyId === companyId);
      const name = deal?.name ?? companies.find((company) => company.id === companyId)?.name ?? "Follow-up";
      const href = !companyId ? "/work" : deal?.stageId === "committee" ? `/committee/${companyId}` : deal?.stageId === "diligence" ? `/diligence/${companyId}` : deal?.stageId === "invested" || !deal ? "/portfolio" : `/deal/${companyId}`;
      return { id: String(task.id), title: String(task.title), name, due: String(task.due), href };
    })
    .filter((item) => canAccess(user, item.href));
  const queue = (committee.length ? committee : deals.filter((deal) => deal.stageId === "diligence")).slice(0, 4);
  const flow = lanes.map((lane) => {
    const rows = deals.filter((deal) => deal.stageId === lane.id);
    const longest = rows.slice().sort((a, b) => b.daysInStage - a.daysInStage)[0];
    return { ...lane, count: rows.length, longest };
  });
  const peak = Math.max(...flow.map((lane) => lane.count), 1);
  const bottleneck = flow.slice().sort((a, b) => b.count - a.count)[0];
  const openings = opportunityOpenings(deals)
    .map((item) => ({ ...item, href: canAccess(user, item.href) ? item.href : "/signals" }))
    .filter((item) => canAccess(user, "/signals") && canAccess(user, item.href));
  const reviewed = new Date(`${SIGNALS_REVIEWED}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const cards = [
    { tone: "signal", k: "Sourcing", fig: leadSource ? `${leadSource.score}%` : "—", chart: thesisMatches.length > 1 ? <EchoChart id="echo-discover" tone="light" values={thesisMatches.slice(0, 4).map((company) => company.score)} label={thesisMatches.map((company) => `${company.name} ${company.score} percent`).join(", ")} /> : <EchoRing value={leadSource?.score ?? 0} label={`Thesis match ${leadSource?.score ?? 0} percent`} />, head: leadSource?.name ?? "No thesis matches", line: leadSource ? `${pad(thesisMatches.length)} ${thesisMatches.length === 1 ? "company matches" : "companies match"} your thesis · ${leadSource.why[0] ?? "Open Discover"}` : "Set a strategy or source a company.", href: "/discovery", cta: "Discover" },
    { tone: "alert", k: "Portfolio", fig: pad(flagged.length), chart: <EchoChart id="echo-book" tone="light" values={health.map((band) => band.n)} label={`Holdings by status: ${health.map((band) => `${band.n} ${band.tone}`).join(", ")}`} />, head: flagged.length ? `${flagged.length === 1 ? "company needs" : "companies need"} attention` : "All holdings within plan", line: flagged[0] ? `${flagged[0].name} · ${flagged[0].alerts[0] ?? "marked for review"}` : `${portfolio.length} holdings, no alert this period.`, href: "/portfolio", cta: "Portfolio" },
    { tone: "decide", k: "Decisions", fig: pad(committee.length), chart: <EchoChart id="echo-flow" tone="light" values={flow.map((lane) => lane.count)} label={flow.map((lane) => `${lane.label} ${lane.count}`).join(", ")} />, head: committee.length ? "awaiting a decision" : "Committee queue clear", line: committee[0] ? `${committee[0].name} · ${committee[0].note}` : "Advance diligence to refill the queue.", href: committee[0] ? `/committee/${committee[0].companyId}` : "/committee", cta: "Decisions" },
  ].filter((card) => canAccess(user, card.href.split("/").slice(0, 2).join("/") || card.href));

  return <div className={styles.command}>
    <header className={styles.heading}>
      <div>
        <p className={styles.kickerLine}>{hello}, {first} · {date}</p>
        <h1>Command Center<span className={styles.titleDot} aria-hidden="true" /></h1>
      </div>
      {canAccess(user, "/dna") && <Link className={styles.quietButton} href="/dna"><SlidersHorizontal size={16} />Investment strategy</Link>}
    </header>

    <section className={styles.stage} aria-labelledby="brief-title">
      <div className={styles.stageTop}>
        <div>
          <h2 id="brief-title">{next?.title ?? "Where things stand."}</h2>
          <p>{next ? next.evidence : "Nothing is blocked. The picture below is what to watch."}</p>
        </div>
        <label className={styles.focusPick}>Focus
          <select value={focus} onChange={(event) => setFocus(event.target.value)} aria-label="Focus">
            <option value="balanced">The full picture</option>
            <option value="health">Portfolio health</option>
            <option value="execution">Deal execution</option>
          </select>
        </label>
      </div>
      <div className={styles.briefGrid}>
        {cards.map((card) => <Link key={card.k} href={card.href} className={styles.briefCard} data-tone={card.tone}>
          <span className={styles.briefK}>{card.k}</span>
          <span className={styles.briefFig}>{card.fig}</span>
          <span className={styles.briefChart}>{card.chart}</span>
          <span className={styles.briefHead}>{card.head}</span>
          <span className={styles.briefCopy}>{card.line}</span>
          <span className={styles.briefGo}>{card.cta} <ArrowUpRight size={14} /></span>
        </Link>)}
      </div>
    </section>

    {canAccess(user, "/fund") && <section className={styles.rail} aria-label="Capital position">
      <div className={styles.railFigs}>
        <div><span>Committed</span><strong>{commitments.items.length ? millions(committed / 1_000_000) : "—"}</strong></div>
        <div><span>Called</span><strong>{commitments.items.length ? millions(called / 1_000_000) : "—"}</strong></div>
        <div><span>Uncalled</span><strong>{commitments.items.length ? millions((committed - called) / 1_000_000) : "—"}</strong></div>
        <div><span>In motion</span><strong>{pad(active.length)}</strong></div>
        <Link href="/fund">Fund <ArrowUpRight size={14} /></Link>
      </div>
      <div className={styles.railBar} role="img" aria-label={`${calledPct} percent of committed capital called`}><i style={{ width: `${Math.min(100, calledPct)}%` }} /></div>
      <p>{commitments.items.length ? <><b>{calledPct}%</b> of commitments called</> : "Commitments are still loading."} · {active.length} companies still in the pipeline</p>
    </section>}
    {error && <p role="alert" className={styles.note}>Follow-ups couldn’t load. <button onClick={reload}>Try again</button></p>}

    {openings.length > 0 && <section className={styles.signals} aria-labelledby="signals-title">
      <div className={styles.signalsHead}>
        <div>
          <h2 id="signals-title">Opportunity signals</h2>
          <p>Research reviewed {reviewed}. Each opening is paired with the closest company still in motion.</p>
        </div>
        <Link href="/signals">All signals <ArrowUpRight size={14} /></Link>
      </div>
      <div className={styles.signalGrid}>
        {openings.map((item) => <article key={item.id} className={styles.signalCard}>
          <div className={styles.signalMeta}>
            <span className={styles.signalPub} data-pub={item.publisher === "Fortune" ? "fortune" : "cb"}>{item.publisher}</span>
            <span>Potential opportunity</span>
          </div>
          <div className={styles.signalTop}>
            <p className={styles.signalMetric}><strong>{item.metric}</strong><span>{item.metricLabel}</span></p>
            <EchoChart id={`echo-${item.id}`} tone="ink" values={item.mix.map((row) => row.n)} label={`Companies in these sectors by stage: ${item.mix.map((row) => `${row.label} ${row.n}`).join(", ")}`} />
          </div>
          <h3>{item.title}</h3>
          <p className={styles.signalQuestion}>{item.question}</p>
          <Link href={item.href}>{item.action} <ArrowUpRight size={14} /></Link>
        </article>)}
      </div>
    </section>}

    <div className={styles.stageRow}>
      {canAccess(user, "/portfolio") && <section className={styles.hero} aria-labelledby="value-title">
        <div className={styles.heroTop}><div><h2 id="value-title">Portfolio, in perspective</h2><p>Illustrative holding values · USD millions</p></div><Link href="/portfolio" aria-label="Open portfolio"><ArrowUpRight size={18} /></Link></div>
        <div className={styles.valueRow}><strong>${totalValue.toFixed(1)}<span>M</span></strong><div><b>{investedCapital ? (totalValue / investedCapital).toFixed(2) : "—"}×</b><span>value / invested</span></div></div>
        <p className={styles.valueNote}>{marked.length ? `$${Math.abs(totalValue - investedCapital).toFixed(1)}M ${totalValue >= investedCapital ? "above" : "below"} invested capital` : "No marked holdings yet"} <span>· Current snapshot, not a period return</span></p>
        <HoldingsChart rows={marked} />
        <div className={styles.heroFoot}>
          <div><span>Capital invested</span><strong>${investedCapital.toFixed(1)}M</strong></div>
          <div><span>Portfolio companies</span><strong>{portfolio.length}</strong></div>
          <div><span>Flagged for review</span><strong>{pad(flagged.length)}</strong></div>
        </div>
      </section>}
      {next && <aside className={styles.priority}>
        <p>{focus === "health" ? "Start with what threatens portfolio value." : focus === "execution" ? "Move the right work forward." : "Clarity starts with what needs you."}</p>
        <h2>Suggested next step</h2>
        <div className={styles.priorityRecord}><span>{mark(companies.find((company) => next.title.includes(company.name))?.name ?? next.label)}</span><div><h3>{next.title}</h3><small>{next.label}</small></div></div>
        <p>{next.benefit}</p>
        <Link href={next.href}>{next.action} <ArrowUpRight size={16} /></Link>
      </aside>}
    </div>

    {(canAccess(user, "/work") || canAccess(user, "/committee")) && <div className={styles.pair}>
      {canAccess(user, "/work") && <section className={styles.panel} aria-labelledby="blocked-title">
        <div className={styles.panelHead}><div><h2 id="blocked-title">What is waiting on you</h2><p>Open follow-ups due today or earlier.</p></div><Link href="/work">Tasks <ArrowUpRight size={14} /></Link></div>
        {tasksLoading && <p className={styles.note}>Follow-ups are loading.</p>}
        {!tasksLoading && blocked.length === 0 && <p className={styles.clear}>Nothing is overdue. The assigned work is still ahead of its date.</p>}
        {blocked.length > 0 && <ul className={styles.queue}>{blocked.map((item) => <li key={item.id}><Link href={item.href}><span>{mark(item.name)}</span><div><strong>{item.title}</strong><small>{item.name} · due {new Date(`${item.due}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></div></Link></li>)}</ul>}
      </section>}
      {canAccess(user, "/committee") && <section className={styles.panel} aria-labelledby="queue-title">
        <div className={styles.panelHead}><div><h2 id="queue-title">{committee.length ? "Ready for a decision" : "Working toward a decision"}</h2><p>{committee.length ? "In front of the committee now." : "Still in diligence."}</p></div><Link href="/committee">Decisions <ArrowUpRight size={14} /></Link></div>
        {queue.length === 0 && <p className={styles.clear}>No company is waiting on a decision.</p>}
        {queue.length > 0 && <ul className={styles.queue}>{queue.map((deal) => <li key={deal.companyId}><Link href={deal.stageId === "committee" ? `/committee/${deal.companyId}` : `/diligence/${deal.companyId}`}><span>{mark(deal.name)}</span><div><strong>{deal.name}</strong><small>{deal.daysInStage} days in stage · {deal.note}</small></div></Link></li>)}</ul>}
      </section>}
    </div>}

    {canAccess(user, "/pipeline") && <section className={styles.funnel} aria-labelledby="funnel-title">
      <div className={styles.panelHead}><div><h2 id="funnel-title">From sourcing to a decision</h2><p>{active.length} companies still in motion.</p></div><Link href="/pipeline">Pipeline <ArrowUpRight size={14} /></Link></div>
      <ol className={styles.flow}>{flow.map((lane, index) => <li key={lane.id}><Link href="/pipeline" data-tight={lane.id === bottleneck?.id && lane.count > 0 ? "true" : undefined}><span>{pad(index + 1)}</span><strong>{lane.label}</strong><b>{pad(lane.count)}</b><small>{lane.longest ? `${lane.longest.name} · ${lane.longest.daysInStage} days` : "None here"}</small><i style={{ width: `${Math.max(8, Math.round((lane.count / peak) * 100))}%` }} /></Link></li>)}</ol>
      {bottleneck && bottleneck.count > 0 && <p className={styles.note}><b>{bottleneck.label}</b> holds the most companies right now.</p>}
    </section>}
  </div>;
}
