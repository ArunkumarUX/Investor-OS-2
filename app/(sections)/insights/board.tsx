"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, CircleCheck, CircleX, Clock3, FileText, Lightbulb } from "lucide-react";
import { useCollection } from "@/lib/data-client";
import { companies } from "@/lib/mock-data";
import { initialDeals, stages, type StageId } from "@/lib/pipeline-data";
import { getStoreServerSnapshot, getStoreSnapshot, parseSnapshot, subscribeStore } from "@/lib/store";
import styles from "./insights.module.css";

const STAGE_COLOR: Record<StageId, string> = {
  discovered: "#93c5fd",
  contacted: "#c4b5fd",
  diligence: "#fdba74",
  committee: "#fda4af",
  invested: "#86efac",
  passed: "#cbd5e1",
};

const SECTOR_COLOR = ["#6366f1", "#22c55e", "#3b82f6", "#14b8a6", "#a78bfa", "#f59e0b", "#64748b", "#e11d48"];

function formatDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function monthKey(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-GB", { month: "short" });
}

function daysSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(`${iso.slice(0, 10)}T00:00:00`).getTime()) / 86400000));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function share(count: number, total: number) {
  return total ? `${Math.round((count / total) * 100)}% of deals` : "None on file";
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <span className={styles.spark} aria-hidden="true">
      {values.map((value, index) => (
        <i key={index} style={{ height: value ? `${Math.max(22, (value / max) * 100)}%` : "14%", background: value ? color : "#e8eef5" }} />
      ))}
    </span>
  );
}

export default function DealInsights() {
  const snapshot = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot));
  const submissions = useCollection("submissions");
  const [range, setRange] = useState("6");
  const months = range === "6" ? 6 : 12;

  const deals = useMemo(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1), 1);
    start.setHours(0, 0, 0, 0);
    return initialDeals
      .map((deal) => ({
        ...deal,
        stageId: snapshot.stages[deal.companyId] ?? deal.stageId,
        company: companies.find((item) => item.id === deal.companyId),
      }))
      .filter((deal) => new Date(`${deal.movedAt}T00:00:00`) >= start);
  }, [months, snapshot.stages]);

  const buckets = useMemo(() => {
    const end = new Date();
    return Array.from({ length: months }, (_, index) => {
      const date = new Date(end.getFullYear(), end.getMonth() - (months - 1 - index), 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const items = deals.filter((deal) => monthKey(deal.movedAt) === key);
      const parts = stages.map((stage) => ({ ...stage, count: items.filter((deal) => deal.stageId === stage.id).length })).filter((part) => part.count);
      return { key, label: monthLabel(date.getFullYear(), date.getMonth()), total: items.length, parts };
    });
  }, [deals, months]);

  const peak = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const ceiling = Math.max(5, Math.ceil(peak / 5) * 5);
  const series = (stage: StageId) => buckets.map((bucket) => bucket.parts.find((part) => part.id === stage)?.count ?? 0);
  const sectorsOnFile = [...new Set(deals.map((deal) => deal.sector))].map((sector) => ({
    sector,
    count: deals.filter((deal) => deal.sector === sector).length,
  })).sort((a, b) => b.count - a.count);
  const sectorPeak = Math.max(1, ...sectorsOnFile.map((item) => item.count));
  const stageRows = stages.map((stage) => {
    const group = deals.filter((deal) => deal.stageId === stage.id);
    return { ...stage, count: group.length, days: median(group.map((deal) => daysSince(deal.movedAt))) };
  }).filter((stage) => stage.count);
  const widest = Math.max(1, ...stageRows.map((stage) => stage.count));
  const dayPeak = Math.max(1, ...stageRows.map((stage) => stage.days ?? 0));
  const ranked = [...deals].sort((a, b) => b.matchScore - a.matchScore);
  const invested = deals.filter((deal) => deal.stageId === "invested").length;
  const diligence = deals.filter((deal) => deal.stageId === "diligence").length;
  const passed = deals.filter((deal) => deal.stageId === "passed").length;
  const top = ranked[0];
  const topStage = stages.find((stage) => stage.id === top?.stageId)?.label ?? top?.stageId;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <label className={styles.filter}>
          <Calendar size={14} aria-hidden="true" />
          <select aria-label="Time range" value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
          </select>
        </label>
      </header>

      <div className={styles.stats}>
        <article className={styles.stat}><i className={styles.blue}><FileText size={16} /></i><b>{submissions.loading ? "—" : submissions.items.length}</b><span>Total submissions</span><em>{submissions.items.length ? "Saved on this workspace" : "No prior period on file"}</em><Spark values={buckets.map(() => 0)} color="#93c5fd" /></article>
        <article className={styles.stat}><i className={styles.green}><CircleCheck size={16} /></i><b>{invested}</b><span>Invested</span><em>{share(invested, deals.length)}</em><Spark values={series("invested")} color="#22c55e" /></article>
        <article className={styles.stat}><i className={styles.amber}><Clock3 size={16} /></i><b>{diligence}</b><span>In diligence</span><em>{share(diligence, deals.length)}</em><Spark values={series("diligence")} color="#f59e0b" /></article>
        <article className={styles.stat}><i className={styles.rose}><CircleX size={16} /></i><b>{passed}</b><span>Passed</span><em>{share(passed, deals.length)}</em><Spark values={series("passed")} color="#fb7185" /></article>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2>Deals by month</h2>
              <p className={styles.sub}>Counted in the month of the current stage date. Empty months have no dated move.</p>
            </div>
            <span className={styles.grain}>Monthly</span>
          </div>
          <div className={styles.plot}>
            <div className={styles.axis} aria-hidden="true"><span>{ceiling}</span><span>{Math.round(ceiling / 2)}</span><span>0</span></div>
            <div className={styles.chart} aria-label="Deals by month">
              {buckets.map((bucket) => (
                <div key={bucket.key} className={styles.month}>
                  <div className={styles.stack} title={`${bucket.total} deals`}>
                    {bucket.parts.map((part) => <span key={part.id} style={{ height: `${(part.count / ceiling) * 100}%`, background: STAGE_COLOR[part.id] }} />)}
                  </div>
                  <em>{bucket.label}</em>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.legend}>
            {stages.filter((stage) => deals.some((deal) => deal.stageId === stage.id)).map((stage) => <span key={stage.id}><i style={{ background: STAGE_COLOR[stage.id] }} />{stage.label}</span>)}
          </div>
        </section>
        <section className={styles.card}>
          <h2>Deals by sector</h2>
          <p className={styles.sub}>{submissions.items.length ? "Submissions are saved separately and are not in these bars." : "No submissions to group. These counts are pipeline deals."}</p>
          <ul className={styles.sectors}>
            {sectorsOnFile.map((item, index) => (
              <li key={item.sector}>
                <i className={styles.dot} style={{ background: SECTOR_COLOR[index % SECTOR_COLOR.length] }} />
                <span>{item.sector}</span>
                <span className={styles.track}><span style={{ width: `${(item.count / sectorPeak) * 100}%`, background: SECTOR_COLOR[index % SECTOR_COLOR.length] }} /></span>
                <b>{item.count}</b>
                <em>{deals.length ? `${Math.round((item.count / deals.length) * 100)}%` : "—"}</em>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={styles.three}>
        <section className={styles.card}>
          <h2>Where deals sit</h2>
          <p className={styles.sub}>Current stage. This is not a conversion from submissions.</p>
          <div className={styles.mix}>
            <div className={styles.funnel} aria-hidden="true">
              {stageRows.map((stage) => (
                <div key={stage.id} className={styles.band} style={{ width: `${Math.max(46, (stage.count / widest) * 100)}%`, background: STAGE_COLOR[stage.id], color: "#172033" }}>{stage.count}</div>
              ))}
            </div>
            <ul className={styles.keys}>
              {stageRows.map((stage) => (
                <li key={stage.id}><b>{stage.count}</b><span>{stage.label}</span><em>{deals.length ? `${Math.round((stage.count / deals.length) * 100)}%` : "—"}</em></li>
              ))}
            </ul>
          </div>
        </section>
        <section className={styles.card}>
          <h2>Time in the current stage</h2>
          <p className={styles.sub}>Median days since the recorded move. Time to the next stage is not on file.</p>
          <ul className={styles.rows}>
            {stageRows.map((stage) => (
              <li key={stage.id}>
                <span className={styles.mark} style={{ color: STAGE_COLOR[stage.id] }}><Clock3 size={14} /></span>
                <span>{stage.label}</span>
                <span className={styles.track}><span style={{ width: `${stage.days ? (stage.days / dayPeak) * 100 : 0}%`, background: STAGE_COLOR[stage.id] }} /></span>
                <b>{stage.days === null ? "—" : `${stage.days}d`}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.card}>
          <h2>What the file supports</h2>
          <ul className={styles.insights}>
            <li>
              <FileText size={16} color="#2563eb" />
              <div>
                <strong>{submissions.items.length ? "Submissions stay separate" : "No submission rate"}</strong>
                <span>{submissions.items.length ? `${submissions.items.length} founder submissions are saved. They are not turned into pipeline deals automatically.` : "No founder submissions are saved, so a change versus a previous period is not available."}</span>
              </div>
            </li>
            {top && (
              <li>
                <Lightbulb size={16} color="#7c3aed" />
                <div>
                  <strong>{top.name} leads this list</strong>
                  <span>{top.matchScore}% match, currently {topStage}. Owner on file is {top.owner}.</span>
                </div>
              </li>
            )}
            <li>
              <Clock3 size={16} color="#c2410c" />
              <div>
                <strong>{diligence ? `${diligence} in diligence` : "None in diligence"}</strong>
                <span>{invested ? `${invested} invested in this range.` : "None are invested in this range."} {passed ? `${passed} passed.` : "None passed."} Days are since the stage date, not a measured cycle.</span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h2>Top companies by score</h2>
            <p className={styles.sub}>Pipeline companies in this range, ordered by the match score on the company record.</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Company</th><th>Sector</th><th>Stage</th><th>Score</th><th>Status</th><th>Since</th><th>Lead</th></tr></thead>
            <tbody>
              {ranked.map((deal) => (
                <tr key={deal.id}>
                  <td><Link className={styles.who} href={`/company/${deal.companyId}`}><Image src={`/company-marks/${deal.companyId}.svg`} alt="" width={22} height={22} />{deal.name}</Link></td>
                  <td>{deal.sector}</td>
                  <td>{deal.company?.stage ?? deal.roundSize}</td>
                  <td><span className={styles.meter}><span style={{ width: `${deal.matchScore}%` }} /></span>{deal.matchScore}</td>
                  <td><span className={`${styles.badge} ${deal.stageId === "invested" ? styles.ok : deal.stageId === "passed" ? styles.stop : styles.wait}`}>{stages.find((stage) => stage.id === deal.stageId)?.label}</span></td>
                  <td>{formatDate(deal.movedAt)}</td>
                  <td><span className={styles.owner}><i>{deal.owner}</i></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
