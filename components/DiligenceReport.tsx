"use client";

import { useEffect, useMemo, useState } from "react";
import ReportBoard from "@/components/ReportBoard";
import ReportChat from "@/components/ReportChat";
import { buildDiligenceReport, type Claim } from "@/lib/diligence-report";
import { downloadText } from "@/lib/export";
import { AGENTS } from "@/lib/intelligence-types";
import styles from "@/app/diligence/report.module.css";

function BadgeView({ tone, children }: { tone?: "bad" | "ai" | "ok"; children: string }) {
  return <span className={styles.badge} data-tone={tone}>{children}</span>;
}

function statusTone(status: string): "bad" | "ai" | "ok" | undefined {
  if (status === "VERIFIED") return "ok";
  if (status === "AI DERIVED" || status === "PARTIAL" || status === "ESTIMATED") return "ai";
  if (status === "UNVERIFIED" || status === "DATA REQUIRED" || status === "NOT CHECKED" || status === "CONFLICTING") return "bad";
  return undefined;
}

export default function DiligenceReport({ companyId }: { companyId: string }) {
  const report = buildDiligenceReport(companyId);
  const [filter, setFilter] = useState("ALL");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [runAt, setRunAt] = useState<string | null>(null);
  const [roles, setRoles] = useState<{ id: string; label: string; summary: string }[]>([]);
  const [ask, setAsk] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [amount, setAmount] = useState(2);
  const [years, setYears] = useState(5);
  const [growth, setGrowth] = useState(0.5);
  const [exitMultiple, setExitMultiple] = useState(12);
  const [dilution, setDilution] = useState(0.3);

  useEffect(() => {
    const load = () => {
      fetch("/api/intelligence", { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => {
          const runs = (data.runs ?? []).filter((item: { companyId: string }) => item.companyId === companyId);
          const latest = runs[0];
          setRunAt(latest?.createdAt ?? null);
          setRoles((latest?.agents ?? []).map((agent: { id: string; summary?: string }) => ({
            id: agent.id,
            label: AGENTS.find((item) => item.id === agent.id)?.label ?? agent.id,
            summary: agent.summary ?? "No write-up saved for this role.",
          })));
        })
        .catch(() => undefined);
    };
    load();
    window.addEventListener("diligence-updated", load);
    return () => window.removeEventListener("diligence-updated", load);
  }, [companyId]);

  const scenario = useMemo(() => {
    if (!report?.multiple && report?.company) {
      /* still compute from parsed revenue below */
    }
    const revenue = report ? Number(report.company.revenue.replace(/[^0-9.]/g, "")) / (/k/i.test(report.company.revenue) ? 1000 : 1) : 0;
    const entry = report ? Number(report.company.valuation.replace(/[^0-9.]/g, "")) : 0;
    const ownership = entry + amount > 0 ? amount / (entry + amount) : 0;
    const exitRevenue = revenue * (1 + growth) ** years;
    const exitValue = exitRevenue * exitMultiple;
    const proceeds = exitValue * ownership * (1 - dilution);
    const moic = amount > 0 ? proceeds / amount : 0;
    const irr = years > 0 && moic > 0 ? moic ** (1 / years) - 1 : 0;
    return { ownership, exitRevenue, exitValue, proceeds, moic, irr, entry };
  }, [report, amount, years, growth, exitMultiple, dilution]);

  if (!report) return null;
  const { company } = report;
  const filtered = report.claims.filter((item) => filter === "ALL" || item.status === filter || (filter === "CRITICAL" && item.materiality === "CRITICAL"));
  const runLabel = runAt
    ? new Date(runAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "No diligence run saved yet";

  function answerFor(query: string) {
    const text = query.toLowerCase();
    const claims = report!.claims;
    if (/\bcontradict/.test(text)) {
      const hits = claims.filter((item) => item.contradicting && !/none on file/i.test(item.contradicting));
      if (!hits.length) return "No claim in this file has a second source that contradicts it. The open issue is missing support, not a recorded contradiction.";
      return hits.map((item) => `${item.text}. ${item.contradicting}`).join("\n\n");
    }
    if (/\bpartial|partly\b/.test(text)) {
      const hits = claims.filter((item) => item.status === "PARTIAL");
      return hits.length ? hits.map((item) => `${item.text}. Status: ${item.status}. ${item.evidence}`).join("\n\n") : "No claim is marked partial. What is on file is unverified company reporting.";
    }
    if (/\bunverified\b/.test(text)) {
      const hits = claims.filter((item) => item.status === "UNVERIFIED");
      if (!hits.length) return "No unverified claims are listed.";
      const shown = hits.slice(0, 4).map((item) => `${item.text}. ${item.evidence}`).join("\n\n");
      const more = hits.length > 4 ? `\n\n${hits.length - 4} more are in the claim list.` : "";
      return `${hits.length} claims are unverified.\n\n${shown}${more}`;
    }
    if (/\bverified\b/.test(text)) {
      const hits = claims.filter((item) => item.status === "VERIFIED");
      return hits.length ? hits.map((item) => `${item.text}. ${item.evidence}`).join("\n\n") : "No claim in this report is marked verified. The company file has been read. It has not been independently checked.";
    }
    const words = text.split(/[^a-z0-9+$]+/).filter((word) => word.length > 3);
    const hits = claims.filter((item) => words.some((word) => `${item.text} ${item.evidence} ${item.domain}`.toLowerCase().includes(word)));
    const notes = roles.filter((role) => words.some((word) => role.summary.toLowerCase().includes(word)));
    if (!hits.length && !notes.length) return "This report has no evidence-backed passage for that question. It will not answer from outside the company file.";
    return [
      ...hits.slice(0, 3).map((item) => `${item.text}. Status: ${item.status}. ${item.evidence} Source: ${item.origin}.`),
      ...notes.slice(0, 2).map((role) => `${role.label}. ${role.summary}`),
    ].join("\n\n");
  }

  function askReport(event: React.FormEvent) {
    event.preventDefault();
    sendQuestion(ask);
  }

  function sendQuestion(query: string) {
    const question = query.trim();
    if (!question || !report) return;
    setMessages((current) => [...current, { role: "user", text: question }, { role: "assistant", text: answerFor(question) }]);
    setAsk("");
    setChatOpen(true);
  }

  function exportReport() {
    if (!report) return;
    const lines = [
      `${company.name}`,
      `Due diligence report`,
      `Run: ${runLabel}`,
      ``,
      `Thesis match ${company.matchScore}%`,
      `Company-record assessment ${company.investmentScore}/100`,
      `Evidence confidence ${report.evidenceConfidence}%`,
      `Diligence coverage ${report.coverage}%`,
      `Critical claims verified ${report.verified}/${report.claims.length}`,
      `High-materiality unknowns ${report.unknowns}`,
      ``,
      `Central question`,
      `Can ${company.name} show that its claimed advantage is reproducible, economically meaningful, and durable?`,
      ``,
      ...report.claims.map((item) => `${item.status} · ${item.materiality} · ${item.text}`),
      ``,
      `Built from the company file. Verification status is on each claim. This is not a recorded decision.`,
    ];
    downloadText(`${company.id}-diligence-report.txt`, lines.join("\n"));
  }

  return (
    <ReportBoard report={report} runLabel={runLabel} ask={ask} setAsk={setAsk} onAsk={askReport} onFind={sendQuestion} onExport={exportReport}>
      <div className={styles.deep}>
        <section className={`${styles.block} ${styles.card}`} id="thesis">
          <h2>Investment thesis</h2>
          <div className={styles.item}><strong>Why this could work</strong><p>{report.analysis.market}</p></div>
          <div className={styles.item}><strong>Why this company</strong><p>{report.analysis.founder}</p></div>
          <div className={styles.item}><strong>What must be true</strong>
            <p>The technical advantage survives an independent test. Customers retain and expand. Unit economics stay attractive at scale. A platform vendor does not ship the same capability before distribution exists.</p>
          </div>
          <div className={styles.tree} aria-label="Thesis dependencies">
            <div>Investment thesis</div>
            <div>Technical advantage → {company.bulls[0]} → independent benchmark → not verified</div>
            <div>Commercial traction → {company.revenue} → contracts and statements → unverified</div>
            <div>Defensibility → patent and engineering moat → registry and assignments → not on file</div>
          </div>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="market-detail">
          <h2>Market</h2>
          <div className={styles.figs} style={{ marginTop: 12 }}>
            <article className={styles.fig}><span>TAM</span><strong>{company.market.tam}</strong><BadgeView tone="bad">Company estimate</BadgeView></article>
            <article className={styles.fig}><span>SAM</span><strong>{company.market.sam}</strong><BadgeView tone="bad">Company estimate</BadgeView></article>
            <article className={styles.fig}><span>SOM</span><strong>{company.market.som}</strong><BadgeView tone="bad">Company estimate</BadgeView></article>
          </div>
          <p className={styles.note}>These sizes are not proof the company can be built. No independent market source is attached. Buyer urgency, adoption, and procurement friction are not on file.</p>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="technology">
          <h2>Technology</h2>
          <p className={styles.lead}>{company.bulls[0]}</p>
          <BadgeView tone="bad">Unverified</BadgeView> <BadgeView tone="bad">Critical</BadgeView>
          <table>
            <thead><tr><th>Metric</th><th>Company</th><th>Baseline</th><th>Delta</th><th>Status</th></tr></thead>
            <tbody>
              {["Latency", "Throughput", "Power", "Memory", "Accuracy", "Cost / inference"].map((metric) => (
                <tr key={metric}><td>{metric}</td><td>—</td><td>—</td><td>—</td><td>Data required</td></tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>No benchmark values are filled in. A blank cell is the result. Failure modes still open: the claim may not travel across workloads, a platform vendor may replicate it, and hardware support is undescribed.</p>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="traction-detail">
          <h2>Traction</h2>
          <div className={styles.figs} style={{ marginTop: 12 }}>
            <article className={styles.fig}><span>ARR</span><strong>{company.revenue.replace(" ARR", "")}</strong><BadgeView tone="bad">Company reported</BadgeView></article>
            <article className={styles.fig}><span>YoY growth</span><strong>{company.growth}</strong><BadgeView tone="bad">Company reported</BadgeView></article>
            {["Customers", "NRR", "Pipeline", "Concentration"].map((label) => (
              <article key={label} className={styles.fig}><span>{label}</span><strong>—</strong><BadgeView tone="bad">Data required</BadgeView></article>
            ))}
          </div>
          <p className={styles.note}>Insufficient verified data for trend analysis. A chart is not shown.</p>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="financials">
          <h2>Financial quality</h2>
          <p className={styles.note}>Growth and quality are separate. The file has a growth rate. It does not have margin, retention, churn, concentration, burn, or runway from a ledger. The sample unit-economics line used elsewhere is dummy and is not repeated here as evidence.</p>
          <p>{report.analysis.financial}</p>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="valuation">
          <h2>Valuation and return sensitivity</h2>
          <p className={styles.note}>Scenario · not a forecast. The multiple is calculated from company-reported valuation and revenue. The cases below use the inputs on this screen.</p>
          <div className={styles.filters}>
            <button type="button" onClick={() => { setGrowth(0); setExitMultiple(8); setDilution(0.4); }}>Bear</button>
            <button type="button" onClick={() => { setGrowth(0.5); setExitMultiple(12); setDilution(0.3); }}>Base</button>
            <button type="button" onClick={() => { setGrowth(1); setExitMultiple(18); setDilution(0.2); }}>Upside</button>
          </div>
          <div className={styles.specs}>
            <label>Check $M<input type="number" value={amount} min={0.1} step={0.1} onChange={(event) => setAmount(Number(event.target.value))} /></label>
            <label>Years<input type="number" value={years} min={1} max={12} onChange={(event) => setYears(Number(event.target.value))} /></label>
            <label>Growth<input type="number" value={growth} step={0.1} onChange={(event) => setGrowth(Number(event.target.value))} /></label>
            <label>Exit multiple<input type="number" value={exitMultiple} step={1} onChange={(event) => setExitMultiple(Number(event.target.value))} /></label>
          </div>
          <div className={styles.specs}>
            <div><span>Ownership at entry</span><strong>{(scenario.ownership * 100).toFixed(1)}%</strong></div>
            <div><span>Exit value</span><strong>${scenario.exitValue.toFixed(1)}M</strong></div>
            <div><span>MOIC</span><strong>{scenario.moic.toFixed(2)}×</strong></div>
            <div><span>IRR</span><strong>{(scenario.irr * 100).toFixed(0)}%</strong></div>
          </div>
          <p className={styles.note}>Assumptions now: check ${amount}M into a ${scenario.entry}M headline, {years} years, growth {(growth * 100).toFixed(0)}%, exit {exitMultiple}× revenue, dilution {(dilution * 100).toFixed(0)}% before exit. None of these is an expected outcome.</p>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="competition">
          <h2>Competitive landscape</h2>
          <table>
            <thead><tr><th></th><th>{company.name}</th><th>Platform vendors</th></tr></thead>
            <tbody>
              {["Inference performance", "Distribution", "Enterprise adoption", "Patents"].map((row) => (
                <tr key={row}><td>{row}</td><td>Unknown</td><td>Unknown</td></tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>Cells stay unknown until a source is attached. The company notes this risk: {company.risks[0] ?? "platform competition is not described"}.</p>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="team">
          <h2>Team</h2>
          {company.founders.map((founder) => (
            <div key={founder.name} className={styles.item}>
              <strong>{founder.name} · {founder.role}</strong>
              <p>Claimed background: {founder.bg}</p>
              <BadgeView tone="bad">Unverified</BadgeView>
            </div>
          ))}
          <p className={styles.note}>References, timelines, and prior outcomes are not on file. Key-person dependency cannot be sized from a biography.</p>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="legal">
          <h2>Legal, corporate and IP</h2>
          <table>
            <thead><tr><th>Item</th><th>Status</th><th>Materiality</th></tr></thead>
            <tbody>
              {[
                ["Corporate registration", "Not checked", "Medium"],
                ["Founder IP assignment", "Required", "Critical"],
                ["Patent ownership", "Not a registry search", "High"],
                ["Prior-employer IP", "Review required", "High"],
                ["Cap table", "Data room required", "Critical"],
                ["Customer contracts", "Required", "High"],
                ["Litigation", "Not checked", "High"],
              ].map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>)}
            </tbody>
          </table>
          <p className={styles.note}>No item above is marked clear. A litigation line stays “not checked” until a search is actually run.</p>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="claims">
          <h2>Claim verification</h2>
          <div className={styles.filters}>
            {["ALL", "CRITICAL", "UNVERIFIED", "PARTIAL", "VERIFIED"].map((item) => (
              <button key={item} type="button" data-on={String(filter === item)} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
          <table>
            <thead><tr><th>Claim</th><th>Origin</th><th>Status</th><th>Materiality</th></tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => setClaim(item)}>
                  <td>{item.text}</td><td>{item.origin}</td><td>{item.status}</td><td>{item.materiality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="contradictions">
          <h2>Contradictions</h2>
          <div className={styles.item}>
            <strong>Performance claim</strong>
            <p>Company claim: {company.bulls[0]}. Independent evidence: none located. The headline cannot be generalised. This is an absence of support, not a second benchmark with a lower number.</p>
            <BadgeView tone="bad">Critical</BadgeView>
          </div>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="gaps">
          <h2>What we still don&apos;t know</h2>
          <div className={styles.cols}>
            {report.checks.filter((item) => !item.done).map((item) => (
              <div key={item.label} className={styles.item}><strong>{item.label}</strong><BadgeView tone="bad">{item.materiality}</BadgeView></div>
            ))}
          </div>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="review-detail">
          <h2>Eight-role review</h2>
          <div className={styles.cols}>
            {(roles.length ? roles : [
              { id: "market", label: "Market analyst", summary: "Market size is a company estimate. Accessibility is not verified." },
              { id: "technical", label: "Technical partner", summary: "An independent benchmark is the highest-priority technical requirement." },
              { id: "financial", label: "Financial analyst", summary: "Reported growth is high. Revenue quality is untested." },
              { id: "legal", label: "Legal analyst", summary: "IP ownership and prior-employer exposure are not reviewed." },
              { id: "founder", label: "Founder analyst", summary: "Domain backgrounds are claimed and not reference-checked." },
              { id: "skeptic", label: "Skeptic partner", summary: "The case depends on an unreproduced performance claim." },
              { id: "portfolio", label: "Portfolio manager", summary: "Check size, reserves, and dilution are not modelled against the book." },
              { id: "partner", label: "General partner", summary: "Technical verification and revenue quality dominate the next phase." },
            ]).map((role) => (
              <article key={role.id} className={styles.item}>
                <strong>{role.label}</strong>
                <p>{role.summary.slice(0, 220)}</p>
              </article>
            ))}
          </div>
          <div className={styles.item}>
            <strong>Where the analysts disagree</strong>
            <p>Reported growth can be read as early traction. It can also be read as an unchecked figure. Both readings fit the file. Commercial traction stays low-confidence until cohorts and concentration are in.</p>
          </div>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="queue">
          <h2>What to do next</h2>
          <ol>
            <li>Reproduce the performance claim. Critical. Not started.</li>
            <li>Reconcile reported revenue to statements. Critical.</li>
            <li>Calculate retention and customer concentration. High.</li>
            <li>Check founder histories against references. High.</li>
            <li>Review IP assignments. High.</li>
          </ol>
          <div className={styles.flow} aria-label="Evidence path">
            <div>Sources on file: the company record</div>
            <div>Claims: {report.claims.length}, verified {report.verified}</div>
            <div>Implication: the case is not yet independently supported</div>
          </div>
        </section>

        <section className={`${styles.block} ${styles.card}`} id="ask">
          <h2>Ask this report</h2>
          <form className={styles.ask} onSubmit={askReport}>
            <input value={ask} onChange={(event) => setAsk(event.target.value)} placeholder="Ask about a claim in this report" aria-label="Ask this report" />
            <button className={styles.save} type="submit">Ask</button>
          </form>
          <p className={styles.note}>The answer opens in the chat, using only this report.</p>
          <p className={styles.note}>Portfolio impact: {company.name} is not on the current book. Concentration needs a check size before it can be measured. No figure is estimated here.</p>
          <p className={styles.note}>Report version v1. A second saved run is required before a comparison can be shown. Nothing is overwritten silently.</p>
        </section>

      </div>
      {claim && (
        <aside className={styles.drawer} role="dialog" aria-label="Claim detail">
          <p className={styles.kicker}>{claim.materiality}</p>
          <h3>{claim.text}</h3>
          <p>Origin. {claim.origin}</p>
          <p>Supporting evidence. {claim.evidence}</p>
          <p>Contradicting evidence. {claim.contradicting}</p>
          <p>Implication. {claim.implication}</p>
          <p>Confidence basis. {claim.confidenceNote}</p>
          <BadgeView tone={statusTone(claim.status)}>{claim.status}</BadgeView>
          <button type="button" onClick={() => setClaim(null)}>Close</button>
        </aside>
      )}
      <ReportChat
        companyName={company.name}
        open={chatOpen}
        messages={messages}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        onReset={() => setMessages([])}
        onSend={sendQuestion}
      />
    </ReportBoard>
  );
}
