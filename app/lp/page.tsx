"use client";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Download, Search, Share2 } from "lucide-react";
import { downloadCSV, downloadText } from "@/lib/export";
import { useCollection } from "@/lib/data-client";
import { companies } from "@/lib/mock-data";
import { lpBrief } from "@/lib/operating-picture";
import { liveHoldings, type Holding } from "@/lib/portfolio-book";
import { getStoreServerSnapshot, getStoreSnapshot, parseSnapshot, subscribeStore } from "@/lib/store";
import styles from "./report.module.css";

const money = (n: number) => {
  const digits = Math.abs(n * 10 - Math.round(n * 10)) < 0.001 ? 1 : 2;
  return `$${n.toFixed(digits)}M`;
};

function healthOf(status: Holding["status"]) {
  if (status === "red") return { label: "At risk", color: "#ef4444" };
  if (status === "yellow") return { label: "Watch", color: "#f59e0b" };
  return { label: "Healthy", color: "#22c55e" };
}

export default function LPPortal() {
  const stages = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot)).stages;
  const portfolio = liveHoldings(stages);
  const brief = lpBrief(portfolio);
  const commitments = useCollection("commitments");
  const committed = commitments.items.reduce((sum, row) => sum + Number(row.committed || 0), 0);
  const called = commitments.items.reduce((sum, row) => sum + Number(row.called || 0), 0);
  const uncalled = Math.max(0, committed - called);
  const calledShare = committed ? Math.round((called / committed) * 100) : 0;
  const above = brief.current - brief.invested;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("deeplogic");
  const selected = portfolio.find((item) => item.id === selectedId) ?? portfolio[0];
  const profile = companies.find((item) => item.id === selected?.id);
  const rows = useMemo(() => portfolio.filter((item) => `${item.name} ${item.sector} ${item.stage}`.toLowerCase().includes(query.trim().toLowerCase())), [portfolio, query]);
  const alerts = portfolio.filter((item) => item.alerts.length > 0);
  const largestUncalled = [...commitments.items].sort((a, b) => (Number(b.committed || 0) - Number(b.called || 0)) - (Number(a.committed || 0) - Number(a.called || 0)))[0];

  const download = () => {
    downloadText("fund-i-sample-report.txt", `${brief.letter}\n\nCommitments on file: $${(committed / 1_000_000).toFixed(1)}M committed, $${(called / 1_000_000).toFixed(1)}M called, $${(uncalled / 1_000_000).toFixed(1)}M uncalled.\nThis note has not been sent and is not an audited quarter.`);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tools}>
        <span className={styles.quiet}>Current snapshot · Draft</span>
        <button type="button" className={styles.ghost} onClick={() => void navigator.clipboard.writeText(window.location.href)}><Share2 size={14} />Share</button>
        <button type="button" className={styles.go} onClick={download}><Download size={14} />Download report</button>
      </div>
      <header className={styles.head}>
        <div>
          <h1>LP Intelligence Portal</h1>
          <p className={styles.kicker}>Fund I · written from the current book <span className={styles.draft}>Draft</span></p>
          <p>Not sent, and not an audited quarter. No prior quarter is on file, so this page does not show a change versus last quarter.</p>
        </div>
        <aside className={styles.ready}>
          <strong>Report readiness</strong>
          <p>Company revenue and growth lines are from the company file. They are not independently verified. Commitment totals are the saved records.</p>
        </aside>
      </header>

      <section className={styles.section}>
        <h2>Executive summary</h2>
        <p>Current marked holdings. Not a period return.</p>
      </section>
      <section className={styles.kpis}>
        <article className={styles.kpi}><span>Marked cost</span><b>{money(brief.invested)}</b><small>No prior quarter on file</small></article>
        <article className={styles.kpi}><span>Marked value</span><b>{money(brief.current)}</b><small>Sum of marked holdings</small></article>
        <article className={styles.kpi}><span>MOIC</span><b>{brief.multiple ? `${brief.multiple.toFixed(2)}×` : "—"}</b><small>Value divided by cost</small></article>
        <article className={styles.kpi}><span>Above cost</span><b>{money(above)}</b><small>Value minus cost. Not a gain attribution.</small></article>
        <article className={styles.kpi}><span>Companies</span><b>{portfolio.length}</b><small>On the current book</small></article>
        <article className={styles.kpi}><span>With an alert</span><b>{brief.flagged}</b><small>{portfolio.filter((item) => item.status === "red").length} marked at risk</small></article>
      </section>

      <section className={styles.charts}>
        <article className={styles.card}>
          <h3>Portfolio value</h3>
          <p className={styles.sub}>No quarterly value history is on file.</p>
          <div className={styles.now}>{money(brief.current)}</div>
          <p className={styles.sub}>Marked value today. A line across past quarters would be invented.</p>
        </article>
        <article className={styles.card}>
          <h3>Cost and value</h3>
          <p className={styles.sub}>Snapshot only. The gap is not split into revenue, multiple, or FX.</p>
          <div className={styles.bridge} aria-hidden="true">
            <i style={{ width: `${brief.current ? (brief.invested / brief.current) * 100 : 0}%`, background: "#1d4ed8" }} />
            <i style={{ width: `${brief.current ? (above / brief.current) * 100 : 0}%`, background: "#86efac" }} />
          </div>
          <div className={styles.legend}><span><i className={styles.dot} style={{ background: "#1d4ed8" }} />Cost {money(brief.invested)}</span><span><i className={styles.dot} style={{ background: "#86efac" }} />Above cost {money(above)}</span><span>Value {money(brief.current)}</span></div>
        </article>
        <article className={styles.card}>
          <h3>Capital position</h3>
          <p className={styles.sub}>Saved commitments. Not a history of calls.</p>
          <div className={styles.splitBar}>
            <div><i style={{ height: `${calledShare}%`, background: "#2563eb" }} /><span>Called</span><b>{money(called / 1_000_000)}</b></div>
            <div><i style={{ height: `${100 - calledShare}%`, background: "#c4b5fd" }} /><span>Uncalled</span><b>{money(uncalled / 1_000_000)}</b></div>
          </div>
        </article>
      </section>

      <div className={styles.tableHead}>
        <div className={styles.section}><h2>Portfolio companies</h2><p>Marked cost, marked value, and the company file. Click a row to read it.</p></div>
        <div className={styles.filters}>
          <label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies" aria-label="Search companies" /></label>
          <button type="button" onClick={() => downloadCSV("lp-holdings", ["Company", "Sector", "Stage", "Invested", "Value", "Multiple", "Ownership", "Status", "Alert"], rows.map((item) => [item.name, item.sector, item.stage, item.invested, item.currentValue, item.multiple, item.ownership, healthOf(item.status).label, item.alerts[0] ?? ""]))}>Export</button>
        </div>
      </div>
      <div className={styles.table}>
        <table>
          <thead>
            <tr><th>Company</th><th>Sector</th><th>Stage</th><th>Invested cost</th><th>Fair value</th><th>MOIC</th><th>Growth</th><th>Ownership</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const file = companies.find((company) => company.id === item.id);
              const health = healthOf(item.status);
              return (
                <tr key={item.id} data-on={String(selected?.id === item.id)} onClick={() => setSelectedId(item.id)}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.sector}</td>
                  <td><span className={styles.pill}>{item.stage}</span></td>
                  <td>{item.invested}</td>
                  <td>{item.currentValue}</td>
                  <td>{item.multiple}</td>
                  <td>{file?.growth ?? "—"}</td>
                  <td>{item.ownership}</td>
                  <td className={styles.health} style={{ color: health.color }}>{health.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.file}>Growth is the company file, not an audited figure. Ownership is the marked holding.</p>

      {selected && (
        <section className={styles.detail}>
          <article className={styles.card}>
            <h3>{selected.name}</h3>
            <p className={styles.sub}>{profile?.tagline}</p>
            <span className={styles.health} style={{ color: healthOf(selected.status).color }}>{healthOf(selected.status).label}</span>
            <div className={styles.metrics}>
              <div><span>Fair value</span><b>{selected.currentValue}</b></div>
              <div><span>Invested cost</span><b>{selected.invested}</b></div>
              <div><span>MOIC</span><b>{selected.multiple}</b></div>
              <div><span>Revenue</span><b>{profile?.revenue ?? "Not on file"}</b></div>
              <div><span>Growth</span><b>{profile?.growth ?? "Not on file"}</b></div>
              <div><span>Ownership</span><b>{selected.ownership}</b></div>
            </div>
            <p className={styles.file}>Revenue and growth are the company file. Not independently verified. EBITDA is not on file.</p>
          </article>
          <article className={styles.card}>
            <h3>On the company file</h3>
            <p className={styles.sub}>Notes already written for this company. Not a dated event log.</p>
            <ul className={styles.notes}>
              {(profile?.bulls ?? []).slice(0, 3).map((note) => <li key={note}>{note}</li>)}
              {selected.alerts.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </article>
          <article className={styles.card}>
            <div className={styles.detailHead}>
              <h3>Open the company</h3>
              <Link href={`/company/${selected.id}`}>Open in portfolio →</Link>
            </div>
            <p className={styles.sub}>No valuation history is on file, so this report does not draw one.</p>
            <p className={styles.file}>{selected.alerts[0] ?? "No alert is on this holding."}</p>
          </article>
        </section>
      )}

      <section className={styles.bottom}>
        <article className={styles.card}>
          <h3>Portfolio health and alerts</h3>
          <p className={styles.sub}>{alerts.length} companies have an alert on the record.</p>
          {alerts.map((item) => (
            <Link key={item.id} className={styles.alert} href={`/company/${item.id}`}>
              <strong>{item.name}</strong>
              <p>{item.multiple} · {item.alerts[0]}</p>
            </Link>
          ))}
        </article>
        <article className={styles.card}>
          <h3>What is on the record</h3>
          <p className={styles.sub}>Alerts only. Dates of these notes were not stored.</p>
          <ul className={styles.notes}>
            {alerts.flatMap((item) => item.alerts.map((note) => <li key={item.id + note}><strong>{item.name}</strong> — {note}</li>))}
          </ul>
        </article>
        <article className={styles.card}>
          <h3>Capital and reserves</h3>
          <p className={styles.sub}>Remaining commitment is not cash on hand, and it is not reserved by company.</p>
          <div className={styles.reserves}>
            <div><span>Committed capital</span><b>{commitments.loading ? "—" : money(committed / 1_000_000)}</b></div>
            <div><span>Called capital</span><b>{commitments.loading ? "—" : `${money(called / 1_000_000)} (${calledShare}%)`}</b></div>
            <div><span>Uncalled capital</span><b>{commitments.loading ? "—" : `${money(uncalled / 1_000_000)} (${100 - calledShare}%)`}</b></div>
          </div>
          <div className={styles.bridge} aria-hidden="true">
            <i style={{ width: `${calledShare}%`, background: "#1d4ed8" }} />
            <i style={{ width: `${100 - calledShare}%`, background: "#c4b5fd" }} />
          </div>
          <p className={styles.file}>{largestUncalled ? `${String(largestUncalled.lp)} still has ${money((Number(largestUncalled.committed || 0) - Number(largestUncalled.called || 0)) / 1_000_000)} uncalled. No call date is on file.` : "Commitments are still loading."}</p>
        </article>
      </section>

      <details className={`${styles.card} ${styles.letter}`}>
        <summary>Investor note</summary>
        <pre>{brief.letter}</pre>
      </details>
    </div>
  );
}
