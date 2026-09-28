"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock3, Database, Link2, Plus, Shield, TriangleAlert } from "lucide-react";
import styles from "./integrations.module.css";

type SourceStatus = "available" | "not-connected" | "untested";

const SOURCES: { id: string; name: string; blurb: string; status: SourceStatus; tags: string[]; tint: string; mark: string; href?: string }[] = [
  { id: "notion", name: "Notion", blurb: "Memo export is not connected.", status: "not-connected", tags: ["Memos", "Notes"], tint: "#f8fafc", mark: "N" },
  { id: "confluence", name: "Confluence", blurb: "Company documentation is not connected.", status: "not-connected", tags: ["Docs"], tint: "#eff6ff", mark: "C" },
  { id: "sharepoint", name: "SharePoint", blurb: "Internal documents are not connected.", status: "not-connected", tags: ["Documents"], tint: "#ecfdf3", mark: "S" },
  { id: "jira", name: "Jira", blurb: "Issue tracking is not connected.", status: "not-connected", tags: ["Tasks"], tint: "#eff6ff", mark: "J" },
  { id: "drive", name: "Google Drive", blurb: "Cloud document sync is not connected.", status: "not-connected", tags: ["Documents"], tint: "#f8fafc", mark: "G" },
  { id: "slack", name: "Slack", blurb: "Deal alerts are not connected.", status: "not-connected", tags: ["Alerts"], tint: "#f8fafc", mark: "S" },
  { id: "email", name: "Email", blurb: "Reports can be downloaded. Nothing is emailed from this workspace.", status: "not-connected", tags: ["Reports"], tint: "#f8fafc", mark: "@" },
  { id: "mcp", name: "Custom MCP", blurb: "No custom server has been added.", status: "not-connected", tags: ["Tools"], tint: "#f8fafc", mark: "M" },
  { id: "public", name: "Public research", blurb: "Search public news and metadata. Company profiles stay sample data.", status: "available", tags: ["News", "Papers"], tint: "#ecfdf3", mark: "P", href: "/research" },
];

const BUCKETS = [
  { key: "documents", label: "Deal files", color: "#2563eb", collections: ["deals"] },
  { key: "analysis", label: "Analysis", color: "#a78bfa", collections: ["research", "strategy"] },
  { key: "people", label: "Contacts & tasks", color: "#22c55e", collections: ["contacts", "tasks"] },
  { key: "other", label: "Other records", color: "#94a3b8", collections: ["commitments", "submissions", "integrations", "notifications"] },
] as const;

const PILL: Record<SourceStatus, string> = { available: styles.wait, "not-connected": styles.off, untested: styles.amber };
const PILL_LABEL: Record<SourceStatus, string> = { available: "Available", "not-connected": "Not connected", untested: "Configured, untested" };

async function recordCount(collection: string): Promise<number | "hidden"> {
  const response = await fetch(`/api/data/${collection}`, { cache: "no-store" });
  if (response.status === 401 || response.status === 403) return "hidden";
  if (!response.ok) throw new Error("Records could not load.");
  const body = await response.json().catch(() => null);
  return Array.isArray(body?.items) ? body.items.length : 0;
}

export default function Integrations() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [ai, setAi] = useState<SourceStatus>("not-connected");
  const [counts, setCounts] = useState<Record<string, number | "hidden"> | null>(null);
  const [countsError, setCountsError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/health")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((health) => { if (live) setAi(health.aiConfigured ? "untested" : "not-connected"); })
      .catch(() => { if (live) setAi("not-connected"); });
    Promise.all(BUCKETS.flatMap((bucket) => bucket.collections.map(async (name) => [name, await recordCount(name)] as const)))
      .then((rows) => { if (live) setCounts(Object.fromEntries(rows)); })
      .catch(() => { if (live) { setCounts({}); setCountsError("Some record counts could not load."); } });
    return () => { live = false; };
  }, []);

  const sources = useMemo(() => [
    { id: "ai", name: "AI analysis", blurb: ai === "untested" ? "An engine is configured. A research request has not verified it." : "No analysis engine is configured. Sample briefs remain available.", status: ai, tags: ["Research"], tint: "#eef2ff", mark: "AI" },
    ...SOURCES,
  ], [ai]);

  const shown = sources.filter((source) => {
    const matchesQuery = `${source.name} ${source.blurb}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === "all" || source.status === filter;
    return matchesQuery && matchesFilter;
  });
  const connected = 0;
  const available = sources.filter((source) => source.status === "available").length;
  const offline = sources.filter((source) => source.status === "not-connected").length;
  const totals = BUCKETS.map((bucket) => {
    const values = bucket.collections.map((name) => counts?.[name]);
    const hidden = values.length > 0 && values.every((value) => value === "hidden");
    const count = values.reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
    return { ...bucket, count, hidden };
  });
  const records = totals.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Integrations</h1>
          <p>Sources for research, documents, and deals. A card is connected only when this workspace has a live sign-in.</p>
        </div>
        <button type="button" className={styles.add} onClick={() => setAdding((value) => !value)}><Plus size={15} aria-hidden="true" /> Add integration</button>
      </header>
      {adding && (
        <div className={styles.banner} role="status">
          <p>New connections are not available. This workspace does not store a token for Notion, Confluence, SharePoint, Jira, Google Drive, Slack, email, or a custom server.</p>
          <button type="button" onClick={() => setAdding(false)}>Close</button>
        </div>
      )}

      <div className={styles.stats}>
        <article className={styles.stat}><i className={styles.green}><Database size={16} /></i><b>{connected}</b><span>Connected</span><em>{ai === "untested" ? "AI is configured, untested" : "No source is signed in"}</em></article>
        <article className={styles.stat}><i className={styles.blue}><Link2 size={16} /></i><b>{available}</b><span>Available</span><em>Public research can be searched</em></article>
        <article className={styles.stat}><i className={styles.slate}><Clock3 size={16} /></i><b>{offline}</b><span>Not connected</span><em>No credentials stored</em></article>
        <article className={styles.stat}><i className={styles.rose}><TriangleAlert size={16} /></i><b>0</b><span>Issues</span><em>No failed sync on file</em></article>
      </div>

      <div className={styles.body}>
        <section className={styles.card}>
          <h2>Data sources</h2>
          <p className={styles.sub}>What each source is for. None of these cards has a sync time.</p>
          <div className={styles.toolbar}>
            <input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search integrations" aria-label="Search integrations" />
            <select className={styles.filter} aria-label="Source status" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All sources</option>
              <option value="available">Available</option>
              <option value="not-connected">Not connected</option>
              <option value="untested">Configured, untested</option>
            </select>
          </div>
          {shown.length === 0 ? <p className={styles.empty}>No source matches this search.</p> : (
            <div className={styles.grid}>
              {shown.map((source) => (
                <article key={source.id} className={styles.source}>
                  <div className={styles.sourceHead}>
                    <span className={styles.mark} style={{ background: source.tint }}>{source.mark}</span>
                    <span className={`${styles.pill} ${PILL[source.status]}`}>{PILL_LABEL[source.status]}</span>
                  </div>
                  <h3>{source.name}</h3>
                  <p>{source.blurb}</p>
                  <div className={styles.tags}>{source.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  {source.href ? <div className={styles.actions}><Link className={styles.open} href={source.href}>Open</Link></div> : note === source.id ? <p className={styles.explain}>Not connected. This workspace has no token for {source.name}.</p> : source.status === "not-connected" ? <div className={styles.actions}><button type="button" className={styles.connect} onClick={() => setNote(source.id)}>Connect</button></div> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <div className={styles.rail}>
          <section className={styles.card}>
            <h2>Records on this server</h2>
            <p className={styles.sub}>Local counts this role can read. Nothing here was synced from an integration. {countsError}</p>
            <div className={styles.barRow}>
              <div className={styles.bar} role="img" aria-label={counts ? `${records} records on this server` : "Counting records"}>
                {totals.map((bucket) => <i key={bucket.key} style={{ width: records ? `${(bucket.count / records) * 100}%` : 0, background: bucket.color }} />)}
              </div>
              <b className={styles.total}>{counts ? `${records} records` : "—"}</b>
            </div>
            <ul className={styles.legend}>
              {totals.map((bucket) => (
                <li key={bucket.key}><i style={{ background: bucket.color }} /><span>{bucket.label}</span><b>{!counts ? "—" : bucket.hidden ? "Outside this role" : bucket.count}</b></li>
              ))}
            </ul>
          </section>
          <section className={styles.card}>
            <h2>Recent activity</h2>
            <p className={styles.activity}>No sync activity. None of these sources have signed in, so there is no sync date to show.</p>
          </section>
        </div>
      </div>

      <section className={styles.privacy}>
        <div>
          <strong><Shield size={14} aria-hidden="true" /> Files and notes stay on this server</strong>
          <p>No integration token is stored. You can review the workspace role from settings.</p>
        </div>
        <Link className={styles.manage} href="/settings">Manage access</Link>
      </section>
    </div>
  );
}
