"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Download, FileText, Plus, Share2 } from "lucide-react";
import { addCapture, fetchCaptures } from "@/lib/api-client";
import { type CaptureItem } from "@/lib/capture";
import { downloadText } from "@/lib/export";
import { companies } from "@/lib/mock-data";
import { subscribeStore, getStoreSnapshot, getStoreServerSnapshot, parseSnapshot } from "@/lib/store";
import styles from "@/app/memo/memo.module.css";

type Company = (typeof companies)[number];

function millions(value: string) {
  const match = value.match(/([\d.]+)\s*(B|M|K)/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  return unit === "B" ? amount * 1000 : unit === "M" ? amount : amount / 1000;
}

export default function LivingMemo({ company, thesis }: { company: Company; thesis: string }) {
  const { id, name, risks } = company;
  const [items, setItems] = useState<CaptureItem[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const { decisions } = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot));
  const decision = decisions[id];
  const place = company.geography === "USA" ? "United States" : company.geography;
  const entry = millions(company.valuation);
  const revenue = millions(company.revenue);
  const multiple = entry && revenue ? (entry / revenue).toFixed(1) : null;
  const updates = items.filter((item) => item.kind === "comment" && item.meta?.memoUpdate);

  useEffect(() => {
    fetchCaptures(id).then(setItems).catch(() => setError("Updates could not load. Refresh to try again.")).finally(() => setLoading(false));
  }, [id]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const item = await addCapture({ companyId: id, kind: "comment", body: text.trim(), meta: { memoUpdate: true } });
      setItems([item, ...items]);
      setText("");
      setStatus("Memo update saved.");
    } catch {
      setError("Could not save. Your update is still here; try again.");
    } finally {
      setBusy(false);
    }
  };

  const memoFile = [
    `MEMO · ${name}`,
    thesis,
    ``,
    `Thesis match ${company.matchScore}%`,
    `Company-record assessment ${company.investmentScore}/100`,
    `Valuation ${company.valuation} on ${company.revenue}${multiple ? ` (${multiple}×)` : ""}`,
    ``,
    `Decision`,
    decision ? `${decision.decision}: ${decision.rationale ?? ""}` : "Not recorded",
    ``,
    `Updates`,
    updates.map((item) => `${item.createdAt}\n${item.body}`).join("\n\n") || "None",
  ].join("\n");

  const positive = [
    "Independent benchmark validates the performance claim",
    "Strong net revenue retention and expansion",
    "Defensible IP position confirmed",
    "Strategic customer deployments announced",
  ];
  const negative = [
    "Performance advantage underperforms",
    "High customer concentration confirmed",
    "Weak gross margins or unit economics",
    risks[0] ? "Platform vendors launch a similar capability" : "A material risk in the file is confirmed",
  ];

  return (
    <div className={styles.board}>
      <div className={styles.bar}>
        <button type="button" onClick={() => void navigator.clipboard.writeText(window.location.href).then(() => setStatus("Link copied.")).catch(() => setError("Link was not copied."))}><Share2 size={14} aria-hidden="true" />Share</button>
        <button type="button" className={styles.download} onClick={() => downloadText(`${id}-memo.txt`, memoFile)}><Download size={14} aria-hidden="true" />Download memo (.txt)</button>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}><img src={`/company-marks/${id}.svg`} alt="" />MEMO · {name.toUpperCase()}</p>
          <h1>The thesis, kept next to the evidence</h1>
          <p className={styles.lead}>
            {name} is a {company.stage} {company.sector} company in {place}. {company.tagline} {company.bulls[0] ? `On file: ${company.bulls[0]}.` : ""} The primary risk on file is that {risks[0] ?? "a material risk is still open"}. Thesis match {company.matchScore}%. Company-record assessment {company.investmentScore}/100{multiple ? `. Valuation ${company.valuation} on ${company.revenue} (${multiple}×), from the company file` : ""}.
          </p>
          <div className={styles.tags}>
            <span>{company.stage}</span>
            <span>{company.sector === "AI/ML" ? "AI Infrastructure" : company.sector}</span>
            {company.tags.includes("Hardware") && <span>Hardware</span>}
            <span>{place}</span>
          </div>
        </div>
        <div className={styles.chip} aria-hidden="true"><span>{name}</span></div>
      </section>

      <div className={styles.scores}>
        <article><em>Thesis Match</em><strong>{company.matchScore}%</strong><span className={styles.rule}><i style={{ width: `${company.matchScore}%`, background: "#22c55e" }} /></span></article>
        <article><em>Record Assessment</em><strong>{company.investmentScore}/100</strong><span className={styles.rule}><i style={{ width: `${company.investmentScore}%`, background: "#3b82f6" }} /></span></article>
      </div>

      <section className={styles.card}>
        <header className={styles.cardHead}>
          <div>
            <h2><FileText size={16} aria-hidden="true" /> Memo version history</h2>
            <p>Saved updates on this memo. A review that has not been saved does not appear here.</p>
          </div>
        </header>
        {loading ? <p className={styles.empty}>Loading updates…</p> : updates.length === 0 ? <p className={styles.empty}>No saved versions yet.</p> : (
          <ul className={styles.versions}>
            {updates.map((item, index) => (
              <li key={item.id} data-latest={String(index === 0)}>
                <i className={styles.dot} />
                <div className={styles.ver}>
                  <p className={styles.when}>{new Date(item.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  <strong>Saved update{index === 0 && <span className={styles.latest}>Latest</span>}</strong>
                  <span>{item.body}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={styles.split}>
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <div>
              <h2>What could change our mind?</h2>
              <p>Evidence that would materially strengthen or weaken the thesis. None of this is confirmed.</p>
            </div>
          </header>
          <div className={styles.mind}>
            <article className={styles.pos}>
              <h3>Would make us more positive</h3>
              <ul>{positive.map((item) => <li key={item}>✓ {item}</li>)}</ul>
            </article>
            <article className={styles.neg}>
              <h3>Would make us more negative</h3>
              <ul>{negative.map((item) => <li key={item}>– {item}</li>)}</ul>
            </article>
          </div>
        </section>
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <div>
              <h2>Latest decision</h2>
              <p>Most recent recorded investment decision.</p>
            </div>
          </header>
          <p>{decision ? `${decision.decision.toUpperCase()} · ${decision.confidence}% · ${new Date(decision.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "No decision recorded yet."}</p>
          {decision?.rationale && <p>{decision.rationale}</p>}
          {!decision && <p>Record a decision to track the rationale, conditions and key assumptions.</p>}
          <div className={styles.actions}>
            <Link className={styles.record} href={`/committee/${id}`}>Record decision <ArrowRight size={14} aria-hidden="true" /></Link>
            <Link className={styles.ghost} href="/memory">View decision history</Link>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <header className={styles.cardHead}>
          <div>
            <h2>Evidence and thesis updates</h2>
            <p>Record what changed, the source, and how it affects the thesis. Updates are saved with a timestamp.</p>
          </div>
        </header>
        {error && <p className="error-note" role="alert">{error}</p>}
        {status && <p className="status-note" role="status">{status}</p>}
        <form className={styles.form} onSubmit={save}>
          <label>
            <textarea required maxLength={5000} value={text} onChange={(event) => setText(event.target.value)} placeholder="What changed? Include a source or document reference and the impact on your thesis." aria-label="New evidence or change in view" />
            <button className={styles.add} disabled={busy || !text.trim()}><Plus size={14} aria-hidden="true" />{busy ? "Saving…" : "Add update"}</button>
          </label>
          <p className={styles.empty}>{loading ? "Loading updates…" : updates.length ? `${updates.length} saved` : "No updates yet. Your original thesis is the starting point."}</p>
        </form>
        {updates.map((item) => (
          <article key={item.id} className={styles.saved}>
            <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
