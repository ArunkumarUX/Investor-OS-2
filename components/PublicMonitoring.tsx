"use client";
import { useEffect, useState } from "react";
import { companies } from "@/lib/mock-data";
import type { WatchTopic } from "@/lib/intelligence-types";
export default function PublicMonitoring({ location = "" }: { location?: string }) {
  const [watches, setWatches] = useState<WatchTopic[]>([]);
  const [heartbeat, setHeartbeat] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState(companies[0].id);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/watch")
      .then((response) => {
        if (!response.ok) throw new Error("Monitoring could not load.");
        return response.json();
      })
      .then((data) => {
        setWatches(data.watches);
        setHeartbeat(data.heartbeat);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const fresh = await fetch("/api/watch");
      if (!fresh.ok)
        throw new Error("Saved, but the status could not refresh.");
      const state = await fresh.json();
      setWatches(state.watches);
      setHeartbeat(state.heartbeat);
      setMessage(
        body.action === "check"
          ? `${data.checked} topics checked. ${data.added} new alerts. First checks establish a baseline.`
          : "Monitoring preferences saved.",
      );
      if (body.action === "create") setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Monitoring failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel p-5 mb-6">
      <h2 className="text-lg font-semibold">Monitor your own topics</h2>
      <p className="text-xs text-[var(--text-muted)] mt-2">Location: {location || "Worldwide"}. Saved monitors retain this location when you change the page filter.</p>
      <p className="text-sm text-[var(--text-muted)] mt-2">
        New matches create a portfolio alert and memo version. A match is a
        research lead, not a verified change to the business.
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-2">
        {heartbeat
          ? `Worker last checked ${new Date(heartbeat).toLocaleString()}. It checks every five minutes while the local worker is running.`
          : "Automatic checking is not running. You can check saved topics manually."}
      </p>
      {error && (
        <p className="error-note mt-3" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="status-note mt-3" role="status">
          {message}
        </p>
      )}
      <details className="mt-3" open>
        <summary className="py-3 cursor-pointer text-sm font-medium">
          Manage watched topics ({watches.length})
        </summary>
        <form
          className="space-y-3 mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send({ action: "create", companyId, query, location });
          }}
        >
          <label className="block">
            <span className="field-label">Related company</span>
            <select
              className="field"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (sample)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Public topic</span>
            <input
              className="field"
              required
              minLength={2}
              maxLength={120}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="For example: enterprise AI"
            />
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            Queries go to Algolia and Crossref. Do not include confidential
            information.
          </p>
          <button className="button" disabled={busy}>
            Watch topic
          </button>
        </form>
        {watches.map((w) => (
          <article
            key={w.id}
            className="border-t border-[var(--border)] py-4 mt-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{w.query}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">{w.location || "Worldwide"} · location keyword matching</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {companies.find((c) => c.id === w.companyId)?.name} ·{" "}
                  {w.enabled ? "Enabled" : "Paused"} ·{" "}
                  {w.lastChecked
                    ? `Last checked ${new Date(w.lastChecked).toLocaleString()}`
                    : "First check pending"}
                </p>
                {w.error && (
                  <p className="text-xs mt-2" role="status">
                    {w.error}
                  </p>
                )}
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  send({ action: "toggle", id: w.id, enabled: !w.enabled })
                }
              >
                {w.enabled ? "Pause" : "Resume"}
              </button>
            </div>
          </article>
        ))}
        {watches.length > 0 && (
          <button
            className="button secondary mt-3"
            disabled={busy}
            onClick={() => send({ action: "check" })}
          >
            {busy ? "Checking…" : "Check now"}
          </button>
        )}
      </details>
    </section>
  );
}
