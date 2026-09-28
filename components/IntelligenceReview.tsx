"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, ArrowRight, ExternalLink } from "lucide-react";
import {
  AGENTS,
  type IntelligenceState,
  type AnalysisRun,
  type AgentResult,
} from "@/lib/intelligence-types";
import { downloadText } from "@/lib/export";
import PublicResearch from "./PublicResearch";
export default function IntelligenceReview({
  companyId,
  name,
  embedded = false,
}: {
  companyId: string;
  name: string;
  embedded?: boolean;
}) {
  const [state, setState] = useState<IntelligenceState | null>(null);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState("");
  const [progress, setProgress] = useState<AgentResult[]>([]);
  const [form, setForm] = useState({ title: "", url: "", body: "" });
  const load = useCallback(async () => {
    const response = await fetch("/api/intelligence", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load saved reviews.");
    const data = await response.json();
    setState(data);
    setConfigured(data.aiConfigured);
    return data as IntelligenceState;
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/intelligence")
      .then((response) => {
        if (!response.ok) throw new Error("Saved reviews could not load.");
        return response.json();
      })
      .then((data) => {
        if (active) {
          setState(data);
          setConfigured(data.aiConfigured);
          window.dispatchEvent(new Event("diligence-updated"));
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const runs = state?.runs.filter((r) => r.companyId === companyId) ?? [];
  const run = runs.find((r) => r.id === selected) ?? runs[0];
  const runningRun = runs.find((r) => r.status === "running");
  const inProgress = busy || Boolean(runningRun);
  useEffect(() => {
    if (!runningRun) return;
    const timer = setInterval(() => {
      void load().catch(() =>
        setError("Progress could not refresh. Your saved work is retained."),
      );
    }, 2500);
    return () => clearInterval(timer);
  }, [runningRun, load]);

  const evidence =
    state?.evidence.filter((e) => e.companyId === companyId) ?? [];
  async function addEvidence(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evidence", companyId, ...form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setForm({ title: "", url: "", body: "" });
      await load();
      setStatus("Evidence saved. Start a new review to include it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  async function start(mode: "sample" | "ai", retryOf?: string) {
    setBusy(true);
    setError("");
    setStatus("");
    setSelected("");
    setProgress(AGENTS.map((a) => ({ id: a.id, status: "queued" })));
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", companyId, mode, retryOf }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("The review stream is unavailable.");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const update = JSON.parse(line);
          if (update.error && !update.id) throw new Error(update.error);
          if (update.id)
            setProgress((prev) =>
              prev.map((a) => (a.id === update.id ? { ...a, ...update } : a)),
            );
        }
        if (done) break;
      }
      const latest = await load();
      window.dispatchEvent(new Event("diligence-updated"));
      const savedRun = latest.runs.find((r) => r.companyId === companyId);
      if (savedRun?.status === "failed")
        setError(
          "No review roles completed. Check the AI connection and try a new review.",
        );
      else
        setStatus(
          savedRun?.status === "partial"
            ? "Partial review saved. Some roles failed; inspect the gaps before continuing."
            : "Review saved. Read the findings and missing evidence before recording a decision.",
        );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Review failed. Your saved sources remain available.",
      );
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  function report(value: AnalysisRun) {
    return `${name}\n${value.mode.toUpperCase()} REVIEW · ${value.createdAt}\nStatus: ${value.status}\n\n${value.agents.map((a) => `${AGENTS.find((d) => d.id === a.id)?.label}\n${a.summary ?? a.error ?? a.status}\n${a.claims?.map((c) => `${c.kind}: ${c.text} [${c.sourceIds.join(", ")}]`).join("\n") ?? ""}\nQuestions: ${a.questions?.join("; ") ?? ""}`).join("\n\n")}\n\nSOURCE PACKET\n${value.evidence.map((e) => `${e.id}: ${e.title}\n${e.url}\n${e.body}`).join("\n\n")}`;
  }
  return (
    <div className={embedded ? "" : "page max-w-5xl"}>
      <header className="page-header">
        <div>
          <h1>{embedded ? "Another reading" : `Understand ${name}`}</h1>
          <p className="page-description">
            The report above is the investment case. This step asks eight roles to write that case again.
          </p>
        </div>
        {run && (
          <button
            className="button secondary"
            onClick={() => downloadText(`${companyId}-review.txt`, report(run))}
          >
            <Download size={16} />
            Download review
          </button>
        )}
      </header>
      <p className="status-note mb-6">
        {name} is sample company data. A new reading does not turn those figures into verified evidence.
      </p>
      {error && (
        <p className="error-note mb-4" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="status-note mb-4" role="status">
          {status}
        </p>
      )}
      <section id="evidence-room" className="panel p-5 mb-6">
        <div className="flex flex-wrap justify-between gap-4 items-start">
          <div>
            <h2 className="text-lg font-semibold">Start with evidence</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {evidence.length} saved sources. A review uses the latest 12. {evidence.length > 12 ? `${evidence.length - 12} older sources stay on file and are left out of the next review.` : "Every saved source fits in the next review."}
            </p>
          </div>
          <button
            className="button secondary"
            disabled={inProgress}
            onClick={() =>
              load()
                .then(() => setStatus("Sources refreshed."))
                .catch((e) => setError(e.message))
            }
          >
            Refresh sources
          </button>
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer py-3 text-sm font-medium">
            Add a source or inspect saved evidence
          </summary>
          <form onSubmit={addEvidence} className="space-y-3 mt-3">
            <label className="block">
              <span className="field-label">Source title</span>
              <input
                className="field"
                required
                maxLength={300}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="field-label">Source URL</span>
              <input
                className="field"
                type="url"
                required
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label className="block">
              <span className="field-label">Relevant evidence excerpt</span>
              <textarea
                className="field"
                rows={4}
                required
                maxLength={12000}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Paste the relevant facts, date and limitations. A link alone is not verified evidence."
              />
            </label>
            <button className="button secondary" disabled={inProgress}>
              Save evidence
            </button>
          </form>
          {evidence.map((e) => (
            <article
              key={e.id}
              className="border-t border-[var(--border)] py-4 mt-3"
            >
              <a
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm underline"
              >
                {e.title}
                <ExternalLink size={13} className="inline ml-2" />
              </a>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {e.provenance === "sample" ? "Fictional prototype evidence" : e.provenance === "public-web" ? "Public web" : "User-supplied"} · {new Date(e.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm whitespace-pre-wrap mt-2">{e.body}</p>
            </article>
          ))}
        </details>
        <details className="border-t border-[var(--border)] mt-4 pt-2">
          <summary className="cursor-pointer py-3 text-sm font-medium">
            Find public research
          </summary>
          <PublicResearch companyId={companyId} compact />
        </details>
      </section>
      <section id="rerun" className="panel p-5 mb-6">
        <h2 className="text-lg font-semibold">Ask the team to read {name} again</h2>
        <p className="text-sm text-[var(--text-muted)] mt-2 max-w-3xl">
          Market, technical, financial, legal, founder, skeptic, portfolio, and the general partner each write a short note. Those notes update the eight-role cards in the report. This is not an investment decision.
        </p>
        <div className="grid gap-3 mt-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <h3 className="text-sm font-semibold">Read the company file</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Uses the profile already on this page. It is a sample reading. It does not look up new sources, and it does not verify the claims.
            </p>
            <button className="button mt-4" disabled={inProgress} onClick={() => start("sample")}>
              {inProgress ? "Reading…" : "Read the file"}
            </button>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <h3 className="text-sm font-semibold">Read with a live model</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {configured
                ? evidence.length
                  ? "Uses the sources saved above. Still a draft. It is not an independent verification."
                  : "Add at least one source above before this can run."
                : "No AI connection is set up, so this cannot run. The file reading still works."}
            </p>
            <button
              className="button secondary mt-4"
              disabled={inProgress || !configured || !evidence.length}
              onClick={() => start("ai")}
            >
              Read with AI
            </button>
          </div>
        </div>
        {run && ["partial", "failed"].includes(run.status) && (
          <button
            className="button secondary mt-4"
            disabled={inProgress}
            onClick={() => start(run.mode, run.id)}
          >
            Finish the roles that did not complete
          </button>
        )}
        {inProgress && (
          <div className="mt-5" aria-live="polite">
            {(busy && progress.length
              ? progress
              : (runningRun?.agents ?? [])
            ).map((a) => (
              <div
                key={a.id}
                className="py-2 flex justify-between text-sm border-t border-[var(--border)]"
              >
                <span>{AGENTS.find((d) => d.id === a.id)?.label}</span>
                <span>{{ queued: "Waiting", running: "Reading", complete: "Done", failed: "Could not finish" }[a.status] ?? a.status}</span>
              </div>
            ))}
          </div>
        )}
        {runs.length > 0 && (
          <label className="block mt-5">
            <span className="field-label">Open an earlier reading</span>
            <select
              className="field"
              value={run?.id ?? ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} ·{" "}
                  {r.mode === "sample" ? "From the company file" : "Live model"} · {r.status === "complete" ? "Finished" : r.status === "partial" ? "Partly finished" : r.status === "running" ? "In progress" : "Did not finish"}
                </option>
              ))}
            </select>
          </label>
        )}
        {run && !inProgress && (
          <p className="text-sm mt-5 text-[var(--text-muted)]">
            {run.mode === "sample" ? "Read from the company file." : "Draft from the live model."} {run.agents.length} notes are in the report above.
          </p>
        )}
        {!state && !error && (
          <p role="status" className="text-sm mt-4">
            Loading earlier readings…
          </p>
        )}
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/committee/${companyId}`} className="button">
          Review the decision
          <ArrowRight size={16} />
        </Link>
        <Link href={`/memo/${companyId}`} className="button secondary">
          Read memo versions
        </Link>
      </div>
    </div>
  );
}
