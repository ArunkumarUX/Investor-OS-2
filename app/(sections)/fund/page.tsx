"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, Calendar, Download, Landmark, PieChart, Users, Wallet } from "lucide-react";
import { downloadText } from "@/lib/export";
import { useCollection } from "@/lib/data-client";
import { liveHoldings } from "@/lib/portfolio-book";
import { getStoreServerSnapshot, getStoreSnapshot, parseSnapshot, subscribeStore } from "@/lib/store";
import styles from "./fund.module.css";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const compact = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

type Commitment = { id?: string; lp?: string; committed?: number; called?: number; status?: string; createdAt?: string };

export default function Fund() {
  const { items, loading, error, reload } = useCollection("commitments");
  const rows = items as Commitment[];
  const stages = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot)).stages;
  const holdings = liveHoldings(stages);
  const committed = rows.reduce((sum, row) => sum + Number(row.committed || 0), 0);
  const called = rows.reduce((sum, row) => sum + Number(row.called || 0), 0);
  const uncalled = Math.max(0, committed - called);
  const calledShare = committed ? Math.round((called / committed) * 100) : 0;
  const uncalledShare = committed ? 100 - calledShare : 0;
  const largest = [...rows].sort((a, b) => Number(b.committed || 0) - Number(a.committed || 0))[0];
  const openCall = [...rows].sort((a, b) => (Number(b.committed || 0) - Number(b.called || 0)) - (Number(a.committed || 0) - Number(a.called || 0)))[0];
  const max = Math.max(1, ...rows.map((row) => Number(row.committed || 0)));

  const report = () => {
    const lines = [
      "Fund I · saved commitments",
      "This file is the current commitment record. It is not a quarterly history and it has not been sent.",
      "",
      `Capital committed: ${money(committed)}`,
      `Capital called: ${money(called)}`,
      `Uncalled capital: ${money(uncalled)}`,
      "",
      ...rows.map((row) => `${row.lp}: committed ${money(Number(row.committed || 0))}, called ${money(Number(row.called || 0))}, ${row.status ?? "on file"}`),
    ];
    downloadText("fund-i-commitments.txt", lines.join("\n"));
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1>Fund overview</h1>
          <p>Capital commitments, calls, and the amount still uncalled. Totals come from the saved commitment records.</p>
        </div>
        <div className={styles.tools}>
          <span className={styles.quiet}><Calendar size={14} aria-hidden="true" />Current records</span>
          <button type="button" className={styles.ghost} onClick={report} disabled={!rows.length}><Download size={14} />Download report</button>
          <Link className={styles.go} href="/commitments">Manage commitments <ArrowRight size={14} /></Link>
        </div>
      </header>

      {error && <p className={styles.error} role="alert">Couldn’t load the fund. <button type="button" onClick={reload}>Retry</button></p>}

      <section className={styles.kpis} aria-busy={loading}>
        <article className={styles.kpi}>
          <i style={{ background: "#eff6ff", color: "#2563eb" }}><Landmark size={18} /></i>
          <span>Capital committed</span>
          <b>{loading ? "—" : money(committed)}</b>
          <small>Total promised by investors</small>
          <em>No prior quarter is on file.</em>
        </article>
        <article className={styles.kpi}>
          <i style={{ background: "#ecfdf3", color: "#16a34a" }}><Wallet size={18} /></i>
          <span>Capital called</span>
          <b>{loading ? "—" : money(called)}</b>
          <small>Amount requested from investors</small>
          <span className={styles.meter}><u style={{ width: `${calledShare}%`, background: "#22c55e" }} /></span>
        </article>
        <article className={styles.kpi}>
          <i style={{ background: "#f5f3ff", color: "#7c3aed" }}><PieChart size={18} /></i>
          <span>Uncalled capital</span>
          <b>{loading ? "—" : money(uncalled)}</b>
          <small>Remaining commitment, not cash on hand</small>
          <span className={styles.meter}><u style={{ width: `${uncalledShare}%`, background: "#8b5cf6" }} /></span>
        </article>
      </section>

      <div className={styles.pair}>
        <section className={styles.card}>
          <h2>Capital summary</h2>
          <p className={styles.sub}>Breakdown of committed, called and uncalled capital.</p>
          <div className={styles.summary}>
            <div className={styles.donutBlock}>
              <div className={styles.donut} style={{ background: `conic-gradient(#1d4ed8 0 ${calledShare}%, #c4b5fd ${calledShare}% 100%)` }}>
                <b>{loading ? "—" : compact(committed)}</b>
              </div>
              <span>Total committed</span>
            </div>
            <ul className={styles.legend}>
              <li><i className={styles.dot} style={{ background: "#1d4ed8" }} /><span>Called capital</span><b>{loading ? "—" : `${money(called)} · ${calledShare}%`}</b></li>
              <li><i className={styles.dot} style={{ background: "#c4b5fd" }} /><span>Uncalled capital</span><b>{loading ? "—" : `${money(uncalled)} · ${uncalledShare}%`}</b></li>
            </ul>
          </div>
        </section>
        <section className={styles.card}>
          <header className={styles.chartHead}>
            <div><h2>Capital by investor</h2><p className={styles.sub}>Called and still uncalled on the current record. Not a quarterly history.</p></div>
            <div className={styles.legendInline}><span><i className={styles.dot} style={{ background: "#2563eb" }} />Called</span><span><i className={styles.dot} style={{ background: "#c4b5fd" }} />Uncalled</span></div>
          </header>
          <svg className={styles.chart} viewBox="0 0 560 196" role="img" aria-label="Called and uncalled capital by investor">
            <line x1="16" y1="148" x2="544" y2="148" stroke="#e8eef5" strokeWidth="1" />
            {rows.map((row, index) => {
              const committedN = Number(row.committed || 0);
              const calledN = Number(row.called || 0);
              const slot = 528 / Math.max(rows.length, 1);
              const center = 16 + slot * index + slot / 2;
              const calledH = (calledN / max) * 124;
              const uncalledH = (Math.max(0, committedN - calledN) / max) * 124;
              const label = (row.lp ?? "Investor").split(" ")[0];
              return (
                <g key={row.id ?? row.lp}>
                  <rect x={center - 18} y={148 - calledH} width="14" height={calledH} rx="3" fill="#2563eb" />
                  <rect x={center + 4} y={148 - uncalledH} width="14" height={uncalledH} rx="3" fill="#c4b5fd" />
                  <text x={center} y="170" textAnchor="middle">{label}</text>
                </g>
              );
            })}
          </svg>
          {largest && <p className={styles.note}>{rows.length} investors on file. {largest.lp} is the largest commitment.</p>}
        </section>
      </div>

      <section className={`${styles.card} ${styles.ops}`}>
        <h2>Fund operations</h2>
        <p className={styles.sub}>Key actions to manage commitments, track the book, and keep investors informed.</p>
        <div className={styles.opsGrid}>
          {[
            { href: "/commitments", title: "Review investor commitments", desc: "Update commitments and reconcile called capital.", tint: "#eff6ff", icon: <Users size={16} /> },
            { href: "/portfolio", title: "Review portfolio health", desc: "See company performance and follow-up signals.", tint: "#ecfdf3", icon: <PieChart size={16} /> },
            { href: "/lp", title: "Prepare an investor report", desc: "Review the sample quarterly letter and download a copy.", tint: "#f5f3ff", icon: <Download size={16} /> },
            { href: "/work", title: "Manage the team’s follow-ups", desc: "Assign actions and track them to completion.", tint: "#fff7ed", icon: <ArrowRight size={16} /> },
          ].map((item) => (
            <Link key={item.href} href={item.href} className={styles.op} style={{ background: item.tint }}>
              <span>{item.icon}</span>
              <strong>{item.title} →</strong>
              <p>{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className={styles.split}>
        <section className={styles.card}>
          <header className={styles.chartHead}><h2>Recent records</h2><Link href="/commitments">View all</Link></header>
          <ul className={styles.activity}>
            {rows.map((row) => (
              <li key={row.id ?? row.lp}>
                <span className={styles.badge}><Landmark size={14} /></span>
                <Link href="/commitments">{row.lp}</Link>
                <time>{row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "On file"}</time>
                <Link className={styles.more} href="/commitments" aria-label={`Open ${row.lp}`}><ArrowRight size={14} /></Link>
              </li>
            ))}
          </ul>
          <p className={styles.note}>These are the saved commitment records. They are not a capital-call history.</p>
        </section>
        <section className={styles.card}>
          <header className={styles.chartHead}><h2>Key metrics</h2><Link href="/commitments">View details</Link></header>
          <div className={styles.metrics}>
            <article className={styles.metric}><span>Investors</span><b>{loading ? "—" : rows.length}</b><small>Saved commitment records</small></article>
            <article className={styles.metric}><span>Open commitments</span><b>{loading ? "—" : compact(uncalled)}</b><small>Still uncalled. Not cash on hand.</small></article>
            <article className={styles.metric}><span>Portfolio companies</span><b>{holdings.length}</b><small>Holdings on the current book</small></article>
            <article className={styles.metric}><span>Largest amount still uncalled</span><b>{openCall ? compact(Number(openCall.committed || 0) - Number(openCall.called || 0)) : "—"}</b><small>{openCall ? `${openCall.lp}. No call date is on file.` : "No commitment is on file."}</small></article>
          </div>
        </section>
      </div>
    </div>
  );
}
