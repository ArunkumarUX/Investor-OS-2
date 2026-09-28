"use client";
import { useCallback, useEffect, useState } from "react";
import { companies } from "@/lib/mock-data";
import type { IntelligenceState, Forecast } from "@/lib/intelligence-types";
import { sampleForecasts } from "@/lib/sample-workspace";
export default function IntelligenceMemory() {
  const [state, setState] = useState<IntelligenceState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    companyId: companies[0].id,
    statement: "",
    probability: 70,
    due: "",
  });
  const load = useCallback(async () => {
    const response = await fetch("/api/intelligence");
    if (!response.ok) throw new Error("Could not load predictions.");
    setState(await response.json());
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/intelligence")
      .then((response) => {
        if (!response.ok) throw new Error("Saved information could not load.");
        return response.json();
      })
      .then((data) => {
        if (active) setState(data);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forecast", ...form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setForm({ ...form, statement: "" });
      await load();
      setMessage("Prediction saved with its original probability.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel p-5 mb-6">
      <h2 className="text-lg font-semibold">Learn from your predictions</h2>
      <p className="text-sm text-[var(--text-muted)] mt-2">
        Write a measurable expectation before the result is known. Come back
        with evidence to record what happened. The three outcomes below are sample data so the calibration view is filled in.
      </p>
      {error && (
        <p role="alert" className="error-note mt-4">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="status-note mt-4">
          {message}
        </p>
      )}
      <div className="status-note mt-4">
        {sampleForecasts.map((item) => (
          <p key={item.id} className="mt-2 first:mt-0">
            <strong>{item.company}.</strong> {item.statement} Called at {item.probability}%. {item.outcome}. {item.note}
          </p>
        ))}
        <p className="mt-2">Sample Brier score 0.184 on these three outcomes. 0 is perfect, 1 is worst. This describes the sample file, not fund returns.</p>
      </div>
      <details className="mt-4">
        <summary className="py-3 cursor-pointer text-sm font-medium">
          Record a prediction
        </summary>
        <form onSubmit={save} className="space-y-3 mt-2">
          <label className="block">
            <span className="field-label">Company</span>
            <select
              className="field"
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">What do you expect to happen?</span>
            <textarea
              className="field"
              rows={2}
              required
              maxLength={1000}
              value={form.statement}
              onChange={(e) => setForm({ ...form, statement: e.target.value })}
              placeholder="A measurable outcome, with a clear threshold"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label>
              <span className="field-label">Probability (%)</span>
              <input
                className="field"
                type="number"
                min={0}
                max={100}
                required
                value={form.probability}
                onChange={(e) =>
                  setForm({ ...form, probability: Number(e.target.value) })
                }
              />
            </label>
            <label>
              <span className="field-label">Review date</span>
              <input
                className="field"
                type="date"
                required
                value={form.due}
                onChange={(e) => setForm({ ...form, due: e.target.value })}
              />
            </label>
          </div>
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save prediction"}
          </button>
        </form>
      </details>
      {state?.forecasts.map((f) => (
        <Outcome key={f.id} forecast={f} onSaved={load} />
      ))}
      {state && !state.forecasts.length && (
        <p className="text-sm text-[var(--text-muted)] py-4">
          No predictions yet. Start with one claim you want to test.
        </p>
      )}
    </section>
  );
}
function Outcome({
  forecast: f,
  onSaved,
}: {
  forecast: Forecast;
  onSaved: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState("yes");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function resolve(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outcome",
          companyId: f.companyId,
          id: f.id,
          outcome: outcome === "yes",
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="border-t border-[var(--border)] py-4">
      <p className="text-xs text-[var(--text-muted)]">
        {companies.find((c) => c.id === f.companyId)?.name} · {f.probability}%
        probability · Review {f.due}
      </p>
      <h3 className="font-medium text-sm mt-2">{f.statement}</h3>
      {f.resolvedAt ? (
        <div className="text-sm mt-3">
          <p>
            {f.outcome ? "Happened" : "Did not happen"} ·{" "}
            {new Date(f.resolvedAt).toLocaleDateString()}
          </p>
          <p className="text-[var(--text-muted)] mt-1">{f.outcomeNote}</p>
        </div>
      ) : (
        <details className="mt-2">
          <summary className="py-2 cursor-pointer text-sm underline">
            Record the outcome
          </summary>
          <form onSubmit={resolve} className="space-y-3">
            <label className="block">
              <span className="field-label">Did it happen?</span>
              <select
                className="field"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Evidence for this outcome</span>
              <textarea
                className="field"
                rows={2}
                required
                maxLength={3000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Include a source and observation date. The original forecast stays unchanged."
              />
            </label>
            {error && (
              <p role="alert" className="error-note">
                {error}
              </p>
            )}
            <button className="button secondary" disabled={busy}>
              Save outcome
            </button>
          </form>
        </details>
      )}
    </article>
  );
}
