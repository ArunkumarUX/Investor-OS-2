"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, Clock3, FileText, FolderOpen, LayoutGrid, List, Plus, Search, Users, X } from "lucide-react";
import { useCollection, type ClientRecord } from "@/lib/data-client";
import { companies } from "@/lib/mock-data";
import styles from "./submissions.module.css";

const STATUSES = [
  { id: "review", label: "Under review" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "declined", label: "Declined" },
] as const;

type StatusId = (typeof STATUSES)[number]["id"];

function statusOf(item: ClientRecord): StatusId {
  const value = String(item.status ?? "");
  if (value === "shortlisted" || value === "declined") return value;
  return "review";
}

function formatDate(iso?: string) {
  if (!iso) return "Date not on file";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const sectors = [...new Set(companies.map((company) => company.sector))].sort();

export default function FounderSubmissions() {
  const { items, loading, error, reload, add, edit } = useCollection("submissions");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"list" | "board">("list");
  const [help, setHelp] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ company: "", founder: "", email: "", website: "", round: "", sector: "", summary: "", status: "review" });

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    const next = items.filter((item) => {
      const haystack = [item.company, item.founder, item.sector, item.summary, item.round].map((value) => String(value ?? "").toLowerCase()).join(" ");
      if (text && !haystack.includes(text)) return false;
      if (stage !== "all" && statusOf(item) !== stage) return false;
      if (sector !== "all" && String(item.sector ?? "") !== sector) return false;
      return true;
    });
    next.sort((a, b) => {
      if (sort === "name") return String(a.company ?? "").localeCompare(String(b.company ?? ""));
      const left = String(a.createdAt ?? "");
      const right = String(b.createdAt ?? "");
      return sort === "oldest" ? left.localeCompare(right) : right.localeCompare(left);
    });
    return next;
  }, [items, query, sector, sort, stage]);

  const counts = {
    all: items.length,
    review: items.filter((item) => statusOf(item) === "review").length,
    shortlisted: items.filter((item) => statusOf(item) === "shortlisted").length,
    declined: items.filter((item) => statusOf(item) === "declined").length,
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailure("");
    const email = form.email.trim().toLowerCase();
    const company = form.company.trim().toLowerCase();
    if (items.some((item) => String(item.email ?? "").trim().toLowerCase() === email && String(item.company ?? "").trim().toLowerCase() === company)) {
      setFailure("A submission for this company and email is already on file.");
      setBusy(false);
      return;
    }
    try {
      await add({
        company: form.company.trim(),
        founder: form.founder.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        round: form.round.trim(),
        sector: form.sector,
        summary: form.summary.trim(),
        status: form.status,
      });
      setForm({ company: "", founder: "", email: "", website: "", round: "", sector: "", summary: "", status: "review" });
      setFormOpen(false);
      setNotice("Submission saved on this workspace. No email was sent.");
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : "The submission could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function openForm() {
    setFormOpen(true);
    setFailure("");
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Founder submissions</h1>
          <p>Capture a pitch and the evidence behind it. Submissions are saved locally for review; no email is sent.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} aria-expanded={help} onClick={() => setHelp((value) => !value)}><Clock3 size={15} aria-hidden="true" /> How submissions work</button>
          <button type="button" className={styles.primary} onClick={openForm}><Plus size={15} aria-hidden="true" /> Add submission</button>
        </div>
      </header>
      {help && <p className={styles.note}>A submission stays on this workspace. It does not email the founder or create a pipeline deal. Move it from under review to shortlisted or declined when you have looked at the pitch.</p>}
      {notice && <p className={styles.note} role="status">{notice}</p>}
      {error && <p className={styles.alert} role="alert">{error} <button type="button" className={styles.ghost} onClick={() => void reload()}>Retry</button></p>}

      <div className={styles.stats}>
        <article className={styles.stat}><i className={styles.blue}><FileText size={16} /></i><b>{loading ? "—" : counts.all}</b><span>Total submissions</span><em>{counts.all ? "Saved on this workspace" : "No submissions yet"}</em></article>
        <article className={styles.stat}><i className={styles.violet}><Clock3 size={16} /></i><b>{loading ? "—" : counts.review}</b><span>Under review</span><em>{counts.review ? "Waiting for a look" : "—"}</em></article>
        <article className={styles.stat}><i className={styles.green}><Check size={16} /></i><b>{loading ? "—" : counts.shortlisted}</b><span>Shortlisted</span><em>{counts.shortlisted ? "Kept for a closer look" : "—"}</em></article>
        <article className={styles.stat}><i className={styles.rose}><X size={16} /></i><b>{loading ? "—" : counts.declined}</b><span>Declined</span><em>{counts.declined ? "Closed on this workspace" : "—"}</em></article>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={15} aria-hidden="true" />
          <input aria-label="Search founder submissions" placeholder="Search founder submissions (company, founder, sector, or keyword)…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className={styles.select} aria-label="Stage" value={stage} onChange={(event) => setStage(event.target.value)}>
          <option value="all">All stages</option>
          {STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select className={styles.select} aria-label="Sector" value={sector} onChange={(event) => setSector(event.target.value)}>
          <option value="all">All sectors</option>
          {sectors.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className={styles.select} aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest</option>
          <option value="name">Company name</option>
        </select>
        <div className={styles.views}>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={14} aria-hidden="true" /> List</button>
          <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")}><LayoutGrid size={14} aria-hidden="true" /> Board</button>
        </div>
      </div>

      {formOpen && (
        <form className={styles.form} onSubmit={(event) => void save(event)}>
          <h2>Add submission</h2>
          <div className={styles.grid}>
            <label>Company name<input className={styles.field} required value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></label>
            <label>Founder name<input className={styles.field} required value={form.founder} onChange={(event) => setForm({ ...form, founder: event.target.value })} /></label>
            <label>Contact email<input className={styles.field} type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Company website<input className={styles.field} value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
            <label>Funding round<input className={styles.field} value={form.round} onChange={(event) => setForm({ ...form, round: event.target.value })} /></label>
            <label>Sector
              <select className={styles.field} value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })}>
                <option value="">Not specified</option>
                {sectors.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className={styles.wide}>What do you do, and what evidence shows it works?
              <textarea className={styles.field} required value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
            </label>
          </div>
          {failure && <p className={styles.alert} role="alert">{failure}</p>}
          <div className={styles.formActions}>
            <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save submission"}</button>
            <button type="button" className={styles.ghost} onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className={styles.note} role="status">Loading submissions…</p> : view === "board" ? (
        <div className={styles.board}>
          {STATUSES.map((column) => (
            <section key={column.id} className={styles.column}>
              <h3>{column.label}</h3>
              {shown.filter((item) => statusOf(item) === column.id).map((item) => <SubmissionCard key={item.id} item={item} onStatus={(status) => void edit(item.id, { status })} />)}
              {shown.every((item) => statusOf(item) !== column.id) && <p className={styles.meta}>None in this stage.</p>}
            </section>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <section className={styles.empty}>
          <div className={styles.art} aria-hidden="true"><span /><span /><span><FileText size={18} /></span></div>
          <h2>{query || stage !== "all" || sector !== "all" ? "No matching submissions" : "No founder submissions yet"}</h2>
          <p>{query || stage !== "all" || sector !== "all" ? "Try another search or clear the filters." : "Add your first submission to capture a pitch, save evidence, and start your review process."}</p>
          <button type="button" className={styles.primary} onClick={() => { if (query || stage !== "all" || sector !== "all") { setQuery(""); setStage("all"); setSector("all"); } else openForm(); }}><Plus size={15} aria-hidden="true" /> {query || stage !== "all" || sector !== "all" ? "Clear filters" : "Add submission"}</button>
          <div className={styles.helpInset}>
            <article><i className={styles.blue}><FileText size={16} /></i><strong>Capture key details</strong><span>Company profile, pitch, and supporting materials.</span></article>
            <article><i className={styles.violet}><FolderOpen size={16} /></i><strong>Keep everything in one place</strong><span>Submissions are saved locally for review.</span></article>
            <article><i className={styles.blue}><Users size={16} /></i><strong>Move through your process</strong><span>Review, shortlist, and track progress to decision.</span></article>
          </div>
        </section>
      ) : (
        <div className={styles.list}>
          {shown.map((item) => <SubmissionCard key={item.id} item={item} onStatus={(status) => void edit(item.id, { status })} />)}
        </div>
      )}

      {!loading && shown.length > 0 && (
        <section className={styles.help}>
          <article><i className={styles.blue}><FileText size={16} /></i><strong>Capture key details</strong><span>Company profile, pitch, and supporting materials.</span></article>
          <article><i className={styles.violet}><FolderOpen size={16} /></i><strong>Keep everything in one place</strong><span>Submissions are saved locally for review.</span></article>
          <article><i className={styles.blue}><Users size={16} /></i><strong>Move through your process</strong><span>Review, shortlist, and track progress to decision.</span></article>
        </section>
      )}
    </div>
  );
}

function SubmissionCard({ item, onStatus }: { item: ClientRecord; onStatus: (status: StatusId) => void }) {
  return (
    <article className={styles.card}>
      <h3>{String(item.company || "Untitled")}</h3>
      <p>{String(item.summary || "")}</p>
      <div className={styles.meta}>
        <span>{String(item.founder || "Founder not named")}</span>
        {item.sector ? <span className={styles.pill}>{String(item.sector)}</span> : null}
        {item.round ? <span className={styles.pill}>{String(item.round)}</span> : null}
        <time dateTime={String(item.createdAt ?? "")}>{formatDate(typeof item.createdAt === "string" ? item.createdAt : undefined)}</time>
        <select aria-label={`Stage for ${item.company}`} value={statusOf(item)} onChange={(event) => onStatus(event.target.value as StatusId)}>
          {STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
        </select>
      </div>
    </article>
  );
}
