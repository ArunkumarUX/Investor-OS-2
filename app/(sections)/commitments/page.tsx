"use client";
import { useMemo, useState, type FormEvent } from "react";
import { Download, LayoutGrid, Plus, Search, Table2 } from "lucide-react";
import { useCollection, type ClientRecord } from "@/lib/data-client";
import { downloadCSV } from "@/lib/export";
import styles from "./commitments.module.css";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const TONES = ["#1d4ed8", "#7c3aed", "#0f766e", "#b45309", "#be123c"];
const PAGE = 8;

type Row = ClientRecord & { lp?: string; vintage?: string; committed?: number; called?: number; status?: string };

function mark(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function tone(name: string) {
  return TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
}

function statusOf(row: Row) {
  const called = Number(row.called || 0);
  if (called <= 0) return { label: "Not called", tone: "muted" };
  if (String(row.status ?? "").toLowerCase() === "funded") return { label: "Funded", tone: "good" };
  return { label: String(row.status || "On file"), tone: "watch" };
}

function fundOf(vintage: string) {
  return vintage.replace(/\(.*\)/, "").trim() || vintage;
}

function yearOf(vintage: string) {
  return vintage.match(/\d{4}/)?.[0] ?? vintage;
}

export default function CommitmentsPage() {
  const { items, loading, error, reload, add, edit } = useCollection("commitments");
  const rows = items as Row[];
  const [query, setQuery] = useState("");
  const [fund, setFund] = useState("all");
  const [status, setStatus] = useState("all");
  const [vintage, setVintage] = useState("all");
  const [sort, setSort] = useState("saved");
  const [view, setView] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [message, setMessage] = useState("");

  const committed = rows.reduce((sum, row) => sum + Number(row.committed || 0), 0);
  const called = rows.reduce((sum, row) => sum + Number(row.called || 0), 0);
  const uncalled = Math.max(0, committed - called);
  const calledShare = committed ? Math.round((called / committed) * 100) : 0;
  const funds = [...new Set(rows.map((row) => fundOf(String(row.vintage ?? ""))))];
  const years = [...new Set(rows.map((row) => yearOf(String(row.vintage ?? ""))))];
  const statuses = [...new Set(rows.map((row) => statusOf(row).label))];

  const shown = useMemo(() => {
    const filtered = rows.filter((row) => {
      const name = String(row.lp ?? "");
      const haystack = `${name} ${row.vintage ?? ""} ${row.status ?? ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase())
        && (fund === "all" || fundOf(String(row.vintage ?? "")) === fund)
        && (vintage === "all" || yearOf(String(row.vintage ?? "")) === vintage)
        && (status === "all" || statusOf(row).label === status);
    });
    const copy = [...filtered];
    if (sort === "committed-desc") copy.sort((a, b) => Number(b.committed || 0) - Number(a.committed || 0));
    if (sort === "committed-asc") copy.sort((a, b) => Number(a.committed || 0) - Number(b.committed || 0));
    if (sort === "name") copy.sort((a, b) => String(a.lp).localeCompare(String(b.lp)));
    return copy;
  }, [rows, query, fund, vintage, status, sort]);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = shown.slice(safePage * PAGE, safePage * PAGE + PAGE);

  const open = (row?: Row) => {
    setEditing(row?.id ?? null);
    setForm({
      lp: String(row?.lp ?? ""),
      vintage: String(row?.vintage ?? "Fund I (2022)"),
      committed: String(row?.committed ?? ""),
      called: String(row?.called ?? ""),
    });
    setFailure("");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (form.committed.trim() === "" || form.called.trim() === "") {
      setFailure("Enter committed and called amounts.");
      return;
    }
    setBusy(true);
    setFailure("");
    const data = {
      lp: form.lp.trim(),
      vintage: form.vintage.trim(),
      committed: Number(form.committed),
      called: Number(form.called),
    };
    try {
      if (editing) await edit(editing, data);
      else await add({ ...data, status: "open" });
      setForm(null);
      setMessage("Commitment saved. This does not move money or issue a capital call.");
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "The commitment could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const exportRows = picked.length ? shown.filter((row) => picked.includes(row.id)) : shown;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1>Commitments</h1>
          <p>Track capital promised and called. These records do not initiate payments or capital calls.</p>
        </div>
        <button type="button" className={styles.add} onClick={() => open()}><Plus size={16} />Add commitment</button>
      </header>

      {message && <p className={styles.note} role="status">{message}</p>}
      {(error || failure) && <p className={styles.note} role="alert">{failure || error} {error && <button type="button" onClick={() => void reload()}>Retry</button>}</p>}

      {form && (
        <form className={styles.form} onSubmit={(event) => void save(event)}>
          <h2>{editing ? "Edit commitment" : "Add commitment"}</h2>
          <div className={styles.grid}>
            <label>Investor<input value={form.lp} required onChange={(event) => setForm({ ...form, lp: event.target.value })} /></label>
            <label>Fund and vintage<input value={form.vintage} required onChange={(event) => setForm({ ...form, vintage: event.target.value })} /></label>
            <label>Committed (USD)<input type="number" min={0} value={form.committed} required onChange={(event) => setForm({ ...form, committed: event.target.value })} /></label>
            <label>Called (USD)<input type="number" min={0} value={form.called} required onChange={(event) => setForm({ ...form, called: event.target.value })} /></label>
          </div>
          <div className={styles.formActions}>
            <button className={styles.add} disabled={busy} type="submit">{busy ? "Saving…" : "Save commitment"}</button>
            <button className={styles.export} type="button" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <section className={styles.kpis} aria-busy={loading}>
        <article className={styles.kpi}><i style={{ background: "#eff6ff", color: "#2563eb" }}><Table2 size={16} /></i><span>Total committed</span><b>{loading ? "—" : money(committed)}</b><small>{rows.length} commitments</small></article>
        <article className={styles.kpi}><i style={{ background: "#ecfdf3", color: "#16a34a" }}><Table2 size={16} /></i><span>Total called</span><b>{loading ? "—" : money(called)}</b><small>{calledShare}% of committed</small></article>
        <article className={styles.kpi}><i style={{ background: "#f5f3ff", color: "#7c3aed" }}><Table2 size={16} /></i><span>Remaining (uncalled)</span><b>{loading ? "—" : money(uncalled)}</b><small>{committed ? 100 - calledShare : 0}% of committed</small></article>
        <article className={styles.kpi}><i style={{ background: "#f8fafc", color: "#475569" }}><Table2 size={16} /></i><span>Investors</span><b>{loading ? "—" : rows.length}</b><small>Across all commitments</small></article>
      </section>

      <div className={styles.filters}>
        <label className={styles.search}><Search size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search commitments, investors or funds" aria-label="Search commitments" /></label>
        <select aria-label="Fund" value={fund} onChange={(event) => { setFund(event.target.value); setPage(0); }}><option value="all">Fund (All)</option>{funds.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="all">Status (All)</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Vintage" value={vintage} onChange={(event) => { setVintage(event.target.value); setPage(0); }}><option value="all">Vintage (All)</option>{years.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="saved">Sort by Saved order</option>
          <option value="committed-desc">Committed (high to low)</option>
          <option value="committed-asc">Committed (low to high)</option>
          <option value="name">Investor name</option>
        </select>
        <button type="button" className={styles.export} disabled={!exportRows.length} onClick={() => downloadCSV("commitments", ["Investor", "Fund", "Vintage", "Committed", "Called", "Remaining", "Percent called", "Status"], exportRows.map((row) => {
          const committedN = Number(row.committed || 0);
          const calledN = Number(row.called || 0);
          return [String(row.lp ?? ""), fundOf(String(row.vintage ?? "")), yearOf(String(row.vintage ?? "")), String(committedN), String(calledN), String(committedN - calledN), String(committedN ? Math.round((calledN / committedN) * 100) : 0), statusOf(row).label];
        }))}><Download size={14} />Export</button>
      </div>

      <section className={styles.card}>
        <header className={styles.cardHead}>
          <h2>{shown.length} commitments</h2>
          <div className={styles.toggle}>
            <button type="button" data-on={String(view === "table")} onClick={() => setView("table")}><Table2 size={14} />Table</button>
            <button type="button" data-on={String(view === "cards")} onClick={() => setView("cards")}><LayoutGrid size={14} />Cards</button>
          </div>
        </header>
        {loading ? <p className={styles.empty}>Loading commitments…</p> : view === "cards" ? (
          <div className={styles.cards}>
            {slice.map((row) => {
              const committedN = Number(row.committed || 0);
              const calledN = Number(row.called || 0);
              const state = statusOf(row);
              return (
                <article key={row.id} className={styles.holding}>
                  <strong>{row.lp}</strong>
                  <p>{fundOf(String(row.vintage ?? ""))} · {yearOf(String(row.vintage ?? ""))}</p>
                  <p>Committed {money(committedN)} · Called {money(calledN)}</p>
                  <p>Remaining {money(committedN - calledN)}</p>
                  <span className={styles.pill} data-tone={state.tone}>{state.label}</span>
                  <button type="button" className={styles.export} onClick={() => open(row)}>Edit</button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th />
                  <th>Investor / Commitment</th>
                  <th>Fund & vintage</th>
                  <th>Committed (USD)</th>
                  <th>Called (USD)</th>
                  <th>Remaining (USD)</th>
                  <th>% Called</th>
                  <th>Status</th>
                  <th>Last updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => {
                  const committedN = Number(row.committed || 0);
                  const calledN = Number(row.called || 0);
                  const share = committedN ? Math.round((calledN / committedN) * 100) : 0;
                  const state = statusOf(row);
                  const when = row.updatedAt || row.createdAt;
                  return (
                    <tr key={row.id}>
                      <td><input type="checkbox" aria-label={`Select ${row.lp}`} checked={picked.includes(row.id)} onChange={() => setPicked((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} /></td>
                      <td><div className={styles.investor}><span className={styles.mark} style={{ background: tone(String(row.lp)) }}>{mark(String(row.lp ?? ""))}</span><span><strong>{row.lp}</strong><small>{String(row.status ?? "")}</small></span></div></td>
                      <td className={styles.fund}><strong>{fundOf(String(row.vintage ?? ""))}</strong><small>{yearOf(String(row.vintage ?? ""))}</small></td>
                      <td>{money(committedN)}</td>
                      <td>{money(calledN)}</td>
                      <td>{money(committedN - calledN)}</td>
                      <td><span className={styles.bar}><i style={{ width: `${share}%` }} /></span>{share}%</td>
                      <td><span className={styles.pill} data-tone={state.tone}>{state.label}</span></td>
                      <td>{when ? new Date(String(when)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "On file"}</td>
                      <td><button type="button" className={styles.iconBtn} aria-label={`Edit ${row.lp}`} onClick={() => open(row)}>•••</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && shown.length === 0 && <p className={styles.empty}>No commitment matches that filter.</p>}
        <footer className={styles.foot}>
          <span>Showing {shown.length ? safePage * PAGE + 1 : 0}–{Math.min(shown.length, safePage * PAGE + PAGE)} of {shown.length}</span>
          <span className={styles.pager}>
            <button type="button" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>‹</button>
            <button type="button" aria-current="page">{safePage + 1}</button>
            <button type="button" aria-label="Next page" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>›</button>
          </span>
        </footer>
        <p className={styles.note}>Dates are the saved record dates. Status is Funded when the record says funded, and Not called when nothing has been called.</p>
      </section>
    </div>
  );
}
