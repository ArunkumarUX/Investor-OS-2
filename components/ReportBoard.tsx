"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle, BookOpen, Cpu, Download, Gavel, LayoutDashboard,
  LineChart, ListChecks, ListTodo, Plus, RefreshCw, Scale, Search, Share2,
  Shield, Target, UserRound, Users, UsersRound, Wallet,
} from "lucide-react";
import type { buildDiligenceReport } from "@/lib/diligence-report";
import styles from "@/app/diligence/report.module.css";

const LINKS = [
  ["snapshot", "Executive Summary", LayoutDashboard],
  ["thesis", "Investment Thesis", Target],
  ["market", "Market Analysis", LineChart],
  ["technology", "Technology", Cpu],
  ["traction", "Traction & Customers", Users],
  ["financials", "Financial Analysis", Wallet],
  ["valuation", "Valuation & Returns", Scale],
  ["team", "Team", UserRound],
  ["legal", "Legal & IP", Shield],
  ["contradictions", "Risks", AlertTriangle],
  ["claims", "Claim Verification", ListChecks],
  ["gaps", "Evidence Gaps", AlertTriangle],
  ["review", "Eight-Role Review", UsersRound],
  ["queue", "Next Diligence", ListTodo],
  ["sources", "Sources", BookOpen],
  ["decision", "Decision", Gavel],
] as const;

const BARS = [
  ["Technology", 58, "#3b82f6"],
  ["Market", 69, "#22c55e"],
  ["Financials", 41, "#f59e0b"],
  ["Team", 78, "#22c55e"],
  ["Legal / IP", 52, "#8b5cf6"],
  ["Competition", 67, "#14b8a6"],
] as const;

const ROLES = [
  ["Market Analyst", 9, "#22c55e"],
  ["Technical Partner", 8, "#3b82f6"],
  ["Financial Analyst", 8, "#8b5cf6"],
  ["Legal Analyst", 8, "#f59e0b"],
  ["Founder Analyst", 8, "#ec4899"],
  ["Skeptic Partner", 7, "#ef4444"],
  ["Portfolio Manager", 9, "#14b8a6"],
  ["General Partner", 10, "#6366f1"],
] as const;

type Report = NonNullable<ReturnType<typeof buildDiligenceReport>>;

export default function ReportBoard({
  report,
  runLabel,
  ask,
  setAsk,
  onAsk,
  onFind,
  onExport,
  children,
}: {
  report: Report;
  runLabel: string;
  ask: string;
  setAsk: (value: string) => void;
  onAsk: (event: React.FormEvent) => void;
  onFind: (question: string) => void;
  onExport: () => void;
  children: ReactNode;
}) {
  const { company } = report;
  const place = company.geography === "USA" ? "United States" : company.geography;
  const multiple = report.multiple ? `${report.multiple.toFixed(1)}x` : "—";
  const [section, setSection] = useState("snapshot");

  function openSection(id: string) {
    setSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={styles.board}>
      <div className={styles.pageBar}>
        <div className={styles.command}>
          <form className={styles.askWrap} onSubmit={onAsk}>
            <Search size={15} aria-hidden="true" />
            <input value={ask} onChange={(event) => setAsk(event.target.value)} placeholder="Ask this report…" aria-label="Ask this report" />
          </form>
          <a href="#evidence-room"><Plus size={14} aria-hidden="true" />Add Evidence</a>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("diligence-play", { detail: company.id }))}><RefreshCw size={14} aria-hidden="true" />Re-run Diligence</button>
          <button type="button" onClick={onExport}><Download size={14} aria-hidden="true" />Export PDF</button>
          <button type="button" onClick={() => void navigator.clipboard.writeText(window.location.href)}><Share2 size={14} aria-hidden="true" />Share</button>
          <Link className={styles.primaryBtn} href={`/committee/${company.id}`}>Record Decision</Link>
        </div>
        <nav className={styles.sectionNav} aria-label="Report sections">
          {LINKS.map(([id, label, Icon]) => id === "decision" ? (
            <Link key={label} href={`/committee/${company.id}`}>
              <Icon size={14} strokeWidth={1.7} aria-hidden="true" />{label}
            </Link>
          ) : (
            <a key={label} href={`#${id}`} data-on={section === id ? "true" : "false"} onClick={(event) => { event.preventDefault(); openSection(id); }}>
              <Icon size={14} strokeWidth={1.7} aria-hidden="true" />{label}
            </a>
          ))}
        </nav>
      </div>
      <div className={styles.canvas}>
        <section className={styles.hero} id="snapshot">
          <div className={styles.heroTop}>
            <div>
              <div className={styles.kickerRow}><span>AI DUE DILIGENCE REPORT</span><span className={styles.complete}>Diligence Complete</span></div>
              <h1>{company.name}</h1>
              <p className={styles.sub}>{company.tagline}</p>
              <div className={styles.tagRow}>
                <span>{company.stage}</span><span>AI/ML</span><span>Hardware</span><span>{place}</span>
              </div>
            </div>
            <div>
              <p className={styles.stamp}>Report generated<br />{runLabel}</p>
              <div className={styles.chips}>
                <div><strong>42</strong><span>Sources reviewed</span></div>
                <div><strong>47</strong><span>Material claims</span></div>
                <div className={styles.chipGreen}><strong>21</strong><span>Verified</span></div>
                <div className={styles.chipAmber}><strong>8</strong><span>Partial</span></div>
                <div><strong>12</strong><span>Unverified</span></div>
                <div className={styles.chipRed}><strong>3</strong><span>Contradictions</span></div>
                <div className={styles.chipRed}><strong>5</strong><span>Critical unknowns</span></div>
              </div>
            </div>
          </div>

          <div className={styles.scores}>
            <article className={styles.score}><em>Thesis Match</em><strong>93%</strong><small>Strong alignment with fund thesis</small><span className={styles.rule}><i style={{ width: "93%", background: "#22c55e" }} /></span></article>
            <article className={styles.score}><em>Company-Record Assessment</em><strong>85/100</strong><small>Based on supplied company information</small><span className={styles.rule}><i style={{ width: "85%", background: "#3b82f6" }} /></span></article>
            <article className={styles.score}><em>Evidence Confidence</em><strong>61%</strong><small>Strength of independent support</small><span className={styles.rule}><i style={{ width: "61%", background: "#f59e0b" }} /></span></article>
            <article className={styles.score}><em>Diligence Coverage</em><strong>74%</strong><small>Completed material checks</small><span className={styles.rule}><i style={{ width: "74%", background: "#8b5cf6" }} /></span></article>
            <article className={styles.score}><em>Critical Claims Verified</em><strong>2/6</strong><span className={styles.dots}>{[1, 1, 0, 0, 0, 0].map((on, index) => <i key={index} data-on={on ? "true" : "false"} />)}</span></article>
            <article className={styles.score}><em>High-Materiality Unknowns</em><strong>5</strong><span className={styles.dots}>{[0, 1, 2, 3, 4].map((index) => <i key={index} data-hot="true" />)}</span></article>
          </div>

          <div className={styles.metricRow}>
            <article className={styles.white}>
              <em>Revenue (ARR)</em>
              <strong>$420K</strong>
              <small>+380% YoY</small>
              <svg className={styles.spark} viewBox="0 0 120 28" width="120" height="28" aria-hidden="true"><polyline fill="none" stroke="#22c55e" strokeWidth="2" points="0,24 24,20 48,16 72,10 96,6 120,2" /></svg>
              <span className={styles.miniBadge}>Company reported</span>
            </article>
            <article className={styles.white}><em>Last Round</em><strong>$5M</strong><small style={{ color: "#64748b" }}>Valuation $35M</small><span className={styles.miniBadge}>Company reported</span></article>
            <article className={styles.white}><em>Valuation / ARR</em><strong>{multiple}</strong><span className={styles.miniBadge} data-tone="ai">AI derived</span></article>
            <article className={styles.white}><em>Stage</em><strong>{company.stage}</strong><span className={styles.miniBadge}>Company reported</span></article>
            <article className={styles.questionCard} id="question">
              <span>The question that matters</span>
              <p>Can {company.name} independently demonstrate that its claimed inference advantage is technically reproducible, economically meaningful and durable against platform competition?</p>
            </article>
          </div>
        </section>

        <div className={styles.caseRow} id="case">
          <section className={`${styles.col} ${styles.support}`}>
            <header><h2>Evidence Supporting the Thesis</h2><a href="#thesis">View all</a></header>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>4 key findings</p>
            {[
              ["Rapid reported traction", "$420K ARR with +380% YoY growth.", "Company reported"],
              ["Relevant technical backgrounds", "Founders with reported Apple Silicon and Qualcomm AI research.", "Partially verified"],
              ["Potential technical differentiation", "Compiler architecture may offer meaningful performance gains.", "Partially verified"],
              ["Strong thesis alignment", "AI infrastructure and hardware exposure fits the investment thesis.", "AI derived"],
            ].map(([title, body, badge], index) => (
              <div key={title} className={styles.finding}>
                <span className={styles.num}>{index + 1}</span>
                <div><strong>{title}</strong><p>{body}</p></div>
                <span className={styles.miniBadge}>{badge}</span>
              </div>
            ))}
          </section>
          <section className={`${styles.col} ${styles.challenge}`}>
            <header><h2>Evidence Challenging the Thesis</h2><a href="#contradictions">View all</a></header>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>3 key findings</p>
            {[
              ["Technical advantage remains unproven", "No independent reproduction of the 100× benchmark.", "Critical"],
              ["High revenue multiple", "$35M / $420K ARR = 83.3×.", "High"],
              ["Platform competition", "Large vendors (Apple, Google, NVIDIA) may build similar in-house.", "High"],
            ].map(([title, body, badge], index) => (
              <div key={title} className={styles.finding}>
                <span className={styles.num}>{index + 1}</span>
                <div><strong>{title}</strong><p>{body}</p></div>
                <span className={styles.miniBadge}>{badge}</span>
              </div>
            ))}
          </section>
          <section className={`${styles.col} ${styles.unknowns}`}>
            <header><h2>Decisive Unknowns</h2><a href="#gaps">View all</a></header>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>5 key items</p>
            {[
              ["Net revenue retention", "Data required"],
              ["Gross margin", "Data required"],
              ["Customer concentration", "Data required"],
              ["Independent technical benchmark", "Required"],
              ["Patent defensibility", "Counsel review"],
            ].map(([title, badge]) => (
              <div key={title} className={styles.finding}>
                <span className={styles.num}>•</span>
                <div><strong>{title}</strong></div>
                <span className={styles.miniBadge}>{badge}</span>
              </div>
            ))}
          </section>
        </div>

        <div className={styles.mid}>
          <section className={styles.white} id="next">
            <h2>Highest-Value Next Action</h2>
            <h3>{`Independently benchmark ${company.name}'s compiler`}</h3>
            <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.45, color: "#475569" }}>The claimed performance advantage is central to differentiation, valuation and competitive durability, and it carries very high information value.</p>
            <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 700 }}>What to test</p>
            <ul className={styles.tests}>
              {["Latency", "Throughput", "Power consumption", "Memory", "Accuracy", "Cost / inference", "Multiple workloads", "Comparable hardware & cloud baseline"].map((item) => <li key={item}>{item}</li>)}
            </ul>
            <a className={styles.goBlue} href="#technology">Start Deep Diligence</a>
          </section>
          <section className={styles.white} id="confidence">
            <header style={{ display: "flex", justifyContent: "space-between" }}><h2>Confidence by Category</h2><span className={styles.valuePill}>Very High</span></header>
            {BARS.map(([label, score, color]) => (
              <div key={label} className={styles.confRow}>
                <span>{label}</span>
                <span className={styles.confTrack}><i style={{ width: `${score}%`, background: color }} /></span>
                <strong>{score}%</strong>
              </div>
            ))}
          </section>
          <section className={styles.white} id="market">
            <h2>Market Opportunity</h2>
            <div className={styles.marketBox}>
              <div className={styles.rings}>
                <p className={styles.ringTam}><b>{company.market.tam}</b><span>Total Market</span></p>
                <div className={styles.ringSam}>
                  <p><b>{company.market.sam}</b><span>Serviceable Market</span></p>
                  <i className={styles.ringSom} />
                </div>
              </div>
              <ul>
                <li><i data-ring="tam" /><div><p><b>{company.market.tam}</b> Total Addressable Market</p><span>Company estimate</span><span>Not independently verified</span></div></li>
                <li><i data-ring="sam" /><div><p><b>{company.market.sam}</b> Serviceable Market</p><span>Company estimate</span><span>Not independently verified</span></div></li>
                <li><i data-ring="som" /><div><p><b>{company.market.som}</b> Obtainable Market</p><span>Company estimate</span><span>Not independently verified</span></div></li>
              </ul>
            </div>
          </section>
        </div>

        <div className={styles.bottom}>
          <section className={styles.white} id="traction">
            <header className={styles.cardHead}><h2>Revenue Growth</h2><span className={styles.miniBadge}>Company reported</span></header>
            <p className={styles.growthCall}><b>+380%</b><span>year over year · $420K ARR</span></p>
            <div className={styles.chart} aria-hidden="true">
              {[["Q1", 32], ["Q2", 46], ["Q3", 64], ["Q4", 100]].map(([label, height]) => (
                <div key={label} className={styles.barCol}><i style={{ height: `${height}%` }} /><span>{label}</span></div>
              ))}
            </div>
            <p className={styles.cardNote}>Quarterly shape is illustrative. Only the annual figure is on file.</p>
          </section>
          <section className={styles.white} id="review">
            <header className={styles.cardHead}><h2>Eight-Role Review</h2><a href="#review-detail">View all</a></header>
            <ul className={styles.roles}>
              {ROLES.map(([label, score, color]) => (
                <li key={label}>
                  <i style={{ background: color }} />
                  <span>{label}</span>
                  <span className={styles.roleTrack}><b style={{ width: `${score * 10}%`, background: color }} /></span>
                  <em>{score}<small>/10</small></em>
                </li>
              ))}
            </ul>
          </section>
          <section className={`${styles.white} ${styles.sourcesCard}`} id="sources">
            <header className={styles.cardHead}><h2>Evidence & Sources</h2></header>
            <div className={styles.sourceRow}>
              <div className={styles.sourceDonut}><span><b>42</b>Sources</span></div>
              <ul className={styles.legend}>
                {([
                  ["ok", "21", "Verified", "Which claims are verified?"],
                  ["partial", "8", "Partial", "Which claims are only partly supported?"],
                  ["open", "12", "Unverified", "Which claims are unverified?"],
                  ["bad", "3", "Contradictions", "Where do the claims contradict?"],
                ] as const).map(([tone, count, label, question]) => (
                  <li key={label}>
                    <button type="button" onClick={() => onFind(question)}>
                      <i data-tone={tone} />
                      <span>{count}</span>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className={`${styles.white} ${styles.recommend}`}>
            <header className={styles.cardHead}><h2>Recommendation</h2><span className={styles.miniBadge} data-tone="ai">Reading only</span></header>
            <p className={styles.verdict}><span>Invest</span><em>10/10</em></p>
            <p>{company.name} combines a large reported market, a proprietary compiler, and founders with relevant technical backgrounds. Platform competition and the revenue multiple remain open.</p>
            <div className={styles.nextInset}>
              <span>Highest-value next action</span>
              <p>Reference calls with Samsung, Apple, and three existing customers.</p>
            </div>
          </section>
        </div>
        {children}
      </div>
    </div>
  );
}
