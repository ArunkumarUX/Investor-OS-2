"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import DecisionBoard from "@/components/DecisionBoard";
import ReportChat from "@/components/ReportChat";
import { buildDiligenceReport } from "@/lib/diligence-report";
import { downloadText } from "@/lib/export";
import { AGENTS } from "@/lib/intelligence-types";
import {
  clearDecision,
  getDecisions,
  getStoreServerSnapshot,
  getStoreSnapshot,
  parseSnapshot,
  recordDecision,
  refreshServerDecisions,
  subscribeStore,
} from "@/lib/store";
import styles from "@/app/diligence/report.module.css";

export default function DecisionScreen({ companyId }: { companyId: string }) {
  const report = buildDiligenceReport(companyId);
  const snapshot = useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot);
  const prior = report ? parseSnapshot(snapshot).decisions[report.company.id] : undefined;
  const [runAt, setRunAt] = useState<string | null>(null);
  const [roles, setRoles] = useState<{ id: string; label: string; summary: string }[]>([]);
  const [ask, setAsk] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [choice, setChoice] = useState<"invest" | "watch" | "reject" | null>(null);
  const [rationale, setRationale] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [conditions, setConditions] = useState("");
  const [owner, setOwner] = useState("");
  const [confidence, setConfidence] = useState(70);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

  if (!report) {
    return (
      <div className="page">
        <h1>Company not found</h1>
        <p>This decision page is not on file.</p>
        <a href="/committee">Back to reviews</a>
      </div>
    );
  }
  const { company } = report;
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

  function sendQuestion(query: string) {
    const question = query.trim();
    if (!question || !report) return;
    setMessages((current) => [...current, { role: "user", text: question }, { role: "assistant", text: answerFor(question) }]);
    setAsk("");
    setChatOpen(true);
  }

  function askReport(event: React.FormEvent) {
    event.preventDefault();
    sendQuestion(ask);
  }

  async function save() {
    if (!choice || !rationale.trim() || !owner.trim() || saving) return;
    setSaving(true);
    setError("");
    const verdict = choice;
    try {
      await recordDecision(
        company.id,
        company.name,
        verdict,
        confidence,
        `Rationale: ${rationale.trim()}\nAssumptions: ${assumptions.trim() || "None recorded."}\nConditions: ${conditions.trim() || "None recorded."}\nOwner: ${owner.trim()}`,
      );
      setSaved(`${verdict} saved for ${owner.trim()}. The buttons are not an AI recommendation.`);
      setChoice(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The decision could not be saved.";
      if (/another session|Refresh before/i.test(message)) {
        try {
          await refreshServerDecisions();
          if (getDecisions()[company.id]?.decision === verdict) {
            setSaved(`${verdict} saved for ${owner.trim()}. The buttons are not an AI recommendation.`);
            setChoice(null);
            return;
          }
        } catch {
          /* show the original conflict */
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function exportReport() {
    const lines = [
      `${company.name}`,
      `Decision reading`,
      `Run: ${runLabel}`,
      ``,
      `Built from the company file. This file is not a recorded decision unless Save Decision was used.`,
    ];
    downloadText(`${company.id}-decision.txt`, lines.join("\n"));
  }

  return (
    <>
      <DecisionBoard
        report={report}
        runLabel={runLabel}
        ask={ask}
        setAsk={setAsk}
        onAsk={askReport}
        onFind={sendQuestion}
        onExport={exportReport}
        decision={
          <section className={styles.decide} id="decision">
            <header className={styles.cardHead}>
              <div>
                <h2>Record Your Investment Decision</h2>
                <p>Document the evidence, rationale and key conditions. No investment is executed from this screen.</p>
              </div>
            </header>
            <div className={styles.decideGrid}>
              <div>
                <h3>Your Decision</h3>
                <div className={styles.decideChoices}>
                  {([
                    ["invest", "Invest", "Proceed with investment"],
                    ["watch", "Watch", "Continue monitoring"],
                    ["reject", "Pass", "Do not proceed"],
                  ] as const).map(([item, label, hint]) => (
                    <button key={item} type="button" data-choice={item} data-on={String(choice === item)} onClick={() => setChoice(item)}>
                      <strong>{label}</strong>
                      <span>{hint}</span>
                    </button>
                  ))}
                </div>
                <label className={styles.field}>Decision Rationale
                  <textarea maxLength={2000} rows={4} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Record the evidence, key risk, and what would change your mind." aria-label="Rationale" />
                  <em>{rationale.length.toLocaleString("en-GB")}/2,000</em>
                </label>
                <label className={styles.field}>Conditions (optional)
                  <input value={conditions} onChange={(event) => setConditions(event.target.value)} placeholder="e.g. follow-on milestones, board rights, technical validation, data room review" aria-label="Conditions" />
                </label>
              </div>
              <div>
                <div className={styles.confHead}><h3>Decision Confidence</h3><strong>{confidence}%</strong></div>
                <input className={styles.confSlider} type="range" min={0} max={100} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} aria-label="Decision confidence" />
                <div className={styles.confScale}><span>Low</span><span>Moderate</span><span>High</span></div>
                <h3>Key Investment Assumptions</h3>
                <ul className={styles.assume}>
                  <li>The performance claim is checked against a source outside the company file</li>
                  <li>Revenue quality and customer concentration are acceptable</li>
                  <li>Margins and retention support the round</li>
                  <li>Ownership of the product is documented</li>
                </ul>
                <p className={styles.cardNote}>Suggested prompts. None of these is confirmed.</p>
                <label className={styles.field}>Decision Owner
                  <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Name and role" aria-label="Decision owner" />
                </label>
                <label className={styles.field}>Assumptions to record
                  <textarea rows={2} value={assumptions} onChange={(event) => setAssumptions(event.target.value)} placeholder="Key assumptions" aria-label="Key assumptions" />
                </label>
              </div>
            </div>
            <footer className={styles.decideFoot}>
              <button className={styles.saveWide} type="button" disabled={saving || !choice || !rationale.trim() || !owner.trim()} onClick={() => void save()}>{saving ? "Saving…" : "Save Decision"}</button>
              <button className={styles.shareBtn} type="button" onClick={() => void navigator.clipboard.writeText(window.location.href).then(() => setSaved("Link copied.")).catch(() => setError("Link was not copied."))}>Share with team</button>
            </footer>
            <p className={styles.note}>{choice ? "Saving records your judgment. It does not move money." : "No option is selected until you choose one. Saving records your judgment. It does not move money."}</p>
            {prior && <p className={styles.note}>Saved earlier: {prior.decision} · {prior.confidence}%. {prior.rationale || "No rationale recorded."}</p>}
            {prior && <button className={styles.shareBtn} type="button" disabled={saving} onClick={() => { setSaving(true); void clearDecision(company.id, company.name).then(() => setSaved("Decision reopened.")).catch((cause) => setError(cause instanceof Error ? cause.message : "Decision could not be reopened.")).finally(() => setSaving(false)); }}>Undo recorded decision</button>}
            {saved && <p className={styles.note}>{saved}</p>}
            {error && <p className={styles.note}>{error}</p>}
          </section>
        }
      />
      <ReportChat
        companyName={company.name}
        open={chatOpen}
        messages={messages}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        onReset={() => setMessages([])}
        onSend={sendQuestion}
      />
    </>
  );
}
