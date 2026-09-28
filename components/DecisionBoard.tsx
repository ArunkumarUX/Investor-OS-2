"use client";

import type { ReactNode } from "react";
import { Download, Search, Share2 } from "lucide-react";
import type { buildDiligenceReport } from "@/lib/diligence-report";
import styles from "@/app/diligence/report.module.css";

const COMPS = [
  ["A", "Apple", "On-device AI / Hardware", "$3.0T", "Market cap", "28.4x", "NTM Revenue"],
  ["N", "NVIDIA", "AI Hardware / Compute", "$2.8T", "Market cap", "22.1x", "NTM Revenue"],
  ["Q", "Qualcomm", "Edge AI / Chips", "$190B", "Market cap", "12.6x", "NTM Revenue"],
  ["arm", "ARM", "Chip Architecture", "$152B", "Market cap", "18.3x", "NTM Revenue"],
  ["S", "SambaNova", "AI Inference", "$5.0B", "Valuation (est.)", "—", "NTM Revenue"],
] as const;

const CASES_FOR = [
  ["Rapid reported traction", "$420K ARR with +380% YoY growth.", "Company reported"],
  ["Strong technical background", "Founders with reported Apple Silicon and Qualcomm AI research experience.", "Partially verified"],
  ["Potential technical differentiation", "Proprietary compiler may offer meaningful inference-performance gains.", "Partially verified"],
  ["Strong thesis alignment", "AI infrastructure and hardware exposure fits fund thesis.", "AI derived"],
] as const;

const CASES_AGAINST = [
  ["Technical advantage remains unproven", "No independent reproduction of the 100× benchmark.", "Critical"],
  ["High revenue multiple", "$35M valuation / $420K ARR = 83.3×.", "High"],
  ["Platform competition", "Large vendors (Apple, Google, NVIDIA) may build similar in-house capabilities.", "High"],
  ["Revenue quality unvalidated", "NRR, gross margin and customer concentration unknown.", "High"],
] as const;

const RISKS = [
  ["Critical", "Technical advantage does not generalize", "Where do the claims contradict?"],
  ["High", "Large platform vendors replicate capability", "What is the competition risk?"],
  ["High", "Revenue concentration", "Which claims are unverified?"],
  ["Medium", "IP ownership and prior-employer exposure", "What is still unverified about the team?"],
  ["Medium", "Execution risk at scale", "What does the file say about revenue?"],
] as const;

const RETURNS = [
  ["Bear Case", "$400M", "$18M", "1.8×", "12%", "bear"],
  ["Base Case", "$1.2B", "$120M", "5.8×", "32%", "base"],
  ["Upside Case", "$3.5B", "$420M", "20.3×", "58%", "up"],
] as const;

type Report = NonNullable<ReturnType<typeof buildDiligenceReport>>;

export default function DecisionBoard({
  report,
  runLabel,
  ask,
  setAsk,
  onAsk,
  onFind,
  onExport,
  decision,
  children,
}: {
  report: Report;
  runLabel: string;
  ask: string;
  setAsk: (value: string) => void;
  onAsk: (event: React.FormEvent) => void;
  onFind: (question: string) => void;
  onExport: () => void;
  decision: ReactNode;
  children?: ReactNode;
}) {
  const { company } = report;
  const place = company.geography === "USA" ? "United States" : company.geography;

  return (
    <div className={styles.board}>
      <div className={styles.pageBar}>
        <div className={styles.command}>
          <form className={styles.askWrap} onSubmit={onAsk}>
            <Search size={15} aria-hidden="true" />
            <input value={ask} onChange={(event) => setAsk(event.target.value)} placeholder="Ask this report…" aria-label="Ask this report" />
          </form>
          <a href={`/diligence/${company.id}#thesis`}>View Full Report</a>
          <button type="button" onClick={() => void navigator.clipboard.writeText(window.location.href)}><Share2 size={14} aria-hidden="true" />Share</button>
          <button type="button" onClick={onExport}><Download size={14} aria-hidden="true" />Export PDF</button>
        </div>
      </div>
      <div className={styles.canvas}>
        <section className={styles.fitHead} id="snapshot">
          <div className={styles.identity}>
            <img className={styles.mark} src={`/company-marks/${company.id}.svg`} alt="" />
            <div className={styles.identityCopy}>
              <p className={styles.kickerRow}><span>{company.stage}</span><span aria-hidden="true">·</span><span>AI Infrastructure</span><span aria-hidden="true">·</span><span>{place}</span></p>
              <h1>{company.name}</h1>
              <p className={styles.sub}>{company.tagline}</p>
              <div className={styles.tagRow}>
                <span>{company.stage}</span><span>AI Infrastructure</span><span>Hardware</span><span>{place}</span>
              </div>
              <p className={styles.cardNote}>Reading {runLabel}</p>
            </div>
          </div>
          <div className={styles.score4}>
            <article><em>Thesis Match</em><strong>93%</strong><span className={styles.rule}><i style={{ width: "93%" }} /></span></article>
            <article><em>Record Assessment</em><strong>85/100</strong><span className={styles.rule}><i style={{ width: "85%" }} /></span></article>
            <article><em>Evidence Confidence</em><strong>61%</strong><span className={styles.rule}><i style={{ width: "61%" }} /></span></article>
            <article><em>Diligence Coverage</em><strong>74%</strong><span className={styles.rule}><i style={{ width: "74%" }} /></span></article>
          </div>
        </section>

        <div className={styles.casePair}>
          <section className={`${styles.col} ${styles.support}`}>
            <header><h2>The Case For Investment</h2><span>4 key points</span></header>
            <p className={styles.caseLead}>Key reasons to consider investing.</p>
            {CASES_FOR.map(([title, body, badge], index) => (
              <div key={title} className={styles.finding}>
                <span className={styles.num}>{index + 1}</span>
                <div><strong>{title}</strong><p>{body}</p></div>
                <span className={styles.miniBadge} data-tone={badge === "AI derived" ? "ai" : undefined}>{badge}</span>
              </div>
            ))}
          </section>
          <section className={`${styles.col} ${styles.challenge}`}>
            <header><h2>The Case Against Investment</h2><span>4 key points</span></header>
            <p className={styles.caseLead}>Key risks and concerns.</p>
            {CASES_AGAINST.map(([title, body, badge], index) => (
              <div key={title} className={styles.finding}>
                <span className={styles.num}>{index + 1}</span>
                <div><strong>{title}</strong><p>{body}</p></div>
                <span className={styles.miniBadge} data-tone="bad">{badge}</span>
              </div>
            ))}
          </section>
        </div>

        <section className={styles.panel} id="comparables">
          <header className={styles.cardHead}>
            <div><h2>Public Comparables</h2><p>Selected public and private companies for context. Not direct valuation benchmarks, and not a live market feed.</p></div>
          </header>
          <div className={styles.comps}>
            {COMPS.map(([mark, name, line, value, valueLabel, multiple, multipleLabel]) => (
              <article key={name}>
                <i>{mark}</i>
                <strong>{name}</strong>
                <span>{line}</span>
                <b>{value}</b>
                <em>{valueLabel}</em>
                <b>{multiple}</b>
                <em>{multipleLabel}</em>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.split}>
          <section className={styles.panel} id="returns">
            <header className={styles.cardHead}>
              <div><h2>Return Analysis</h2><p>Illustrative scenarios, not forecasts. These are not this fund’s results.</p></div>
            </header>
            <table>
              <thead><tr><th>Scenario</th><th>Exit Value</th><th>Investor Proceeds</th><th>MOIC</th><th>IRR</th></tr></thead>
              <tbody>
                {RETURNS.map(([name, exit, proceeds, moic, irr, tone]) => (
                  <tr key={name} data-tone={tone}>
                    <td>{name}</td><td>{exit}</td><td>{proceeds}</td><td>{moic}</td><td>{irr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className={styles.panel} id="risks">
            <header className={styles.cardHead}><h2>Key Risks</h2><a href={`/diligence/${company.id}#gaps`}>View all</a></header>
            <ul className={styles.riskList}>
              {RISKS.map(([tone, label, question]) => (
                <li key={label}>
                  <button type="button" onClick={() => onFind(question)}>
                    <i data-tone={tone.toLowerCase()}>{tone}</i>
                    <span>{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {decision}
        {children}
      </div>
    </div>
  );
}
