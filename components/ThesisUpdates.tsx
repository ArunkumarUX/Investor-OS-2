"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { companies } from "@/lib/mock-data";
import type { IntelligenceState } from "@/lib/intelligence-types";
import { downloadText } from "@/lib/export";
export default function ThesisUpdates({
  companyId,
  versionsOnly = false,
}: {
  companyId?: string;
  versionsOnly?: boolean;
}) {
  const [state, setState] = useState<IntelligenceState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    companyId: companyId ?? companies[0].id,
    title: "",
    detail: "",
    sourceUrl: "",
    impact: "risk",
  });
  const load = useCallback(async () => {
    const response = await fetch("/api/intelligence");
    if (!response.ok) throw new Error("Could not load thesis updates.");
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
  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const events =
    state?.events.filter((e) => !companyId || e.companyId === companyId) ?? [];
  const versions =
    state?.versions.filter((v) => !companyId || v.companyId === companyId) ??
    [];
  return (
    <section className="panel p-5 mb-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {versionsOnly
              ? "Memo version history"
              : "Changes that need a review"}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {versionsOnly
              ? "Each analysis and reported change creates a dated version. Earlier versions remain available."
              : "Record a sourced change. It creates an alert and a memo version together."}
          </p>
        </div>
        {versions.length > 0 && (
          <button
            className="button secondary"
            onClick={() =>
              downloadText(
                "thesis-update-report.txt",
                `INVEST OS · USER-REPORTED EVENTS AND ANALYSIS DRAFTS\nGenerated ${new Date().toISOString()}\n\n${versions.map((v) => `${companies.find((c) => c.id === v.companyId)?.name}\n${v.createdAt} · ${v.trigger}\n${v.body}`).join("\n\n---\n\n")}`,
              )
            }
          >
            Export updates
          </button>
        )}
      </div>
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
      {!versionsOnly && (
        <>
          <details className="mt-4">
            <summary className="cursor-pointer py-3 text-sm font-medium">
              Report a change
            </summary>
            <form
              className="space-y-3 mt-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await send({ action: "event", ...form })) {
                  setForm({ ...form, title: "", detail: "", sourceUrl: "" });
                  setMessage(
                    "Change saved. An alert and memo version have been created.",
                  );
                }
              }}
            >
              {!companyId && (
                <label className="block">
                  <span className="field-label">Company</span>
                  <select
                    className="field"
                    value={form.companyId}
                    onChange={(e) =>
                      setForm({ ...form, companyId: e.target.value })
                    }
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="field-label">What changed?</span>
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
                  required
                  type="url"
                  value={form.sourceUrl}
                  onChange={(e) =>
                    setForm({ ...form, sourceUrl: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="field-label">Impact</span>
                <select
                  className="field"
                  value={form.impact}
                  onChange={(e) => setForm({ ...form, impact: e.target.value })}
                >
                  <option value="risk">New risk</option>
                  <option value="opportunity">New opportunity</option>
                  <option value="neutral">Context update</option>
                </select>
              </label>
              <label className="block">
                <span className="field-label">
                  How does this affect the thesis?
                </span>
                <textarea
                  className="field"
                  rows={3}
                  required
                  maxLength={5000}
                  value={form.detail}
                  onChange={(e) => setForm({ ...form, detail: e.target.value })}
                />
              </label>
              <button className="button" disabled={busy}>
                Save change
              </button>
            </form>
          </details>
          {events.map((e) => (
            <article
              key={e.id}
              className="border-t border-[var(--border)] py-4"
            >
              <p className="text-xs text-[var(--text-muted)]">
                {companies.find((c) => c.id === e.companyId)?.name} · {e.impact}{" "}
                · {new Date(e.createdAt).toLocaleString()}
              </p>
              <h3 className="text-sm font-semibold mt-2">{e.title}</h3>
              <p className="text-sm mt-2">{e.detail}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <a
                  href={e.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                >
                  Open source
                </a>
                <Link
                  className="text-sm underline"
                  href={`/memo/${e.companyId}`}
                >
                  Read memo
                </Link>
                {!e.acknowledged ? (
                  <button
                    disabled={busy}
                    className="button secondary"
                    onClick={() =>
                      send({
                        action: "acknowledge",
                        companyId: e.companyId,
                        id: e.id,
                      })
                    }
                  >
                    Mark reviewed
                  </button>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">
                    Reviewed
                  </span>
                )}
              </div>
            </article>
          ))}
          {state && !events.length && (
            <p className="text-sm text-[var(--text-muted)] py-4">
              No reported changes yet. Automatic external monitoring is not
              enabled.
            </p>
          )}
        </>
      )}
      {versionsOnly &&
        versions.map((v) => (
          <details
            key={v.id}
            className="border-t border-[var(--border)] mt-4 py-3"
          >
            <summary className="cursor-pointer py-2 text-sm font-medium">
              {new Date(v.createdAt).toLocaleString()} · {v.trigger}
            </summary>
            <p className="text-sm whitespace-pre-wrap leading-relaxed mt-3">
              {v.body}
            </p>
          </details>
        ))}
      {versionsOnly && state && !versions.length && (
        <p className="text-sm text-[var(--text-muted)] mt-4">
          Run a review or report a change to create the first version.
        </p>
      )}
    </section>
  );
}
