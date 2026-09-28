"use client";
import { useState } from "react";
import { Search, ExternalLink, Plus } from "lucide-react";
import { companies } from "@/lib/mock-data";
import type { PublicResult } from "@/lib/intelligence-types";
export default function PublicResearch({
  companyId,
  compact = false,
  location = "",
  initialQuery = "",
  onEvidenceSaved,
  suggestions = [],
}: {
  companyId?: string;
  compact?: boolean;
  location?: string;
  initialQuery?: string;
  onEvidenceSaved?: () => void;
  suggestions?: { label: string; query: string }[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PublicResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retrieved, setRetrieved] = useState("");
  const [warning, setWarning] = useState("");
  const [selected, setSelected] = useState(companyId ?? companies[0].id);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setWarning("");
    try {
      const response = await fetch(
        `/api/public-research?q=${encodeURIComponent([query.trim(), location.trim()].filter(Boolean).join(" "))}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.items);
      setRetrieved(data.retrievedAt);
      setWarning(data.warnings.join(" "));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Search failed. Retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(item: PublicResult) {
    setSaving(item.id);
    setError("");
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evidence",
          companyId: selected,
          title: item.title,
          url: item.url,
          body: `${item.title}\nSource: ${item.source}\nPublished: ${item.publishedAt || "Not provided"}\nRetrieved: ${retrieved}\n${item.context}\nSaved as a research lead, not verified company evidence.`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSaved((previous) => [...previous, `${selected}:${item.id}`]);
      setNotice(`Saved to ${companies.find(c => c.id === selected)?.name ?? "company"}. Ready to review below.`);
      onEvidenceSaved?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving("");
    }
  }
  return (
    <section
      className={compact ? "" : "panel p-5 mb-6"}
      aria-label="Public internet research"
    >
      <h2 className="text-lg font-semibold">Find answers</h2>
      <p className="text-sm text-[var(--text-muted)] mt-2 mb-4">
        Pick a question or type your own. Search news and published research.
      </p>
      {suggestions.length > 0 && <div className="flex flex-wrap gap-2 mb-4" aria-label="Suggested questions">{suggestions.map(p => <button type="button" key={p.label} className={`button ${query === p.query ? "" : "secondary"}`} aria-pressed={query === p.query} onClick={() => setQuery(p.query)}>{p.label}</button>)}</div>}
      {location && <p className="text-xs text-[var(--text-muted)] mb-3">Location keyword: {location}. Results may mention this place without being based there.</p>}
      <form onSubmit={search} className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-48">
          <span className="block text-xs font-medium mb-2">What do you want to find out?</span>
          <input
            className="field"
            value={query}
            minLength={2}
            maxLength={120}
            required
            onChange={(e) => setQuery(e.target.value)}
            placeholder="A company, technology or market"
          />
        </label>
        <button className="button" disabled={busy}>
          <Search size={16} />
          {busy ? "Searching…" : "Search the web"}
        </button>
      </form>
      <p className="text-xs text-[var(--text-muted)] mt-2">
        Your search is sent to Algolia and Crossref. Use public topics only.
      </p>
      {notice && <p role="status" className="status-note mt-4">{notice}</p>}
      {error && (
        <p role="alert" className="error-note mt-4">
          {error}
        </p>
      )}
      {warning && (
        <p role="status" className="status-note mt-4">
          {warning}
        </p>
      )}
      {retrieved && (
        <div className="mt-5">
          <div className="flex flex-wrap justify-between items-end gap-3 mb-3">
            <p className="text-xs text-[var(--text-muted)]">
              {results.length} results · Retrieved{" "}
              {new Date(retrieved).toLocaleString()}
            </p>
            {!companyId && (
              <label className="text-xs">
                Save research leads to
                <select
                  className="field mt-1"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (sample)
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {!results.length && (
            <p className="status-note">
              No results found. Try a broader public topic.
            </p>
          )}
          {results.map((item) => (
            <article
              key={item.id}
              className="py-4 border-t border-[var(--border)]"
            >
              <div className="flex items-start gap-3 justify-between">
                <a
                  className="font-semibold text-sm hover:underline"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.title}
                  <ExternalLink size={13} className="inline ml-2" />
                </a>
                <button
                  className="button secondary shrink-0"
                  disabled={
                    !!saving || saved.includes(`${selected}:${item.id}`)
                  }
                  onClick={() => save(item)}
                  aria-label={`Save research lead: ${item.title}`}
                >
                  <Plus size={14} />
                  {saved.includes(`${selected}:${item.id}`)
                    ? "Saved"
                    : saving === item.id
                      ? "Saving…"
                      : "Save"}
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {item.source} ·{" "}
                {item.publishedAt || "Publication date unavailable"}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {item.context}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
