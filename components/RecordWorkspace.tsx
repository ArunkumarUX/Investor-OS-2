"use client";
import { useState, type FormEvent } from "react";
import { Plus, X, Search, Check, Pencil, Download } from "lucide-react";
import { useCollection, type ClientRecord } from "@/lib/data-client";
import { downloadCSV } from "@/lib/export";
export type WorkspaceField = { key: string; label: string; type?: "text" | "email" | "date" | "number" | "textarea"; required?: boolean };
export default function RecordWorkspace({ collection, title, description, singular, fields, titleKey, subtitleKey, completable = false }: {
  collection: string; title: string; description: string; singular: string; fields: WorkspaceField[]; titleKey: string; subtitleKey: string; completable?: boolean;
}) {
  const { items, loading, error, reload, add, edit } = useCollection(collection);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [filter, setFilter] = useState("all");
  const shown = items.filter(i => fields.some(f => String(i[f.key] ?? "").toLowerCase().includes(query.toLowerCase())) && (filter === "all" || (filter === "done" ? i.status === "done" : i.status !== "done")));
  const open = (item?: ClientRecord) => { setEditing(item?.id ?? null); setForm(Object.fromEntries(fields.map(f => [f.key, String(item?.[f.key] ?? "")]))); setFailure(""); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!form) return;
    setBusy(true); setFailure("");
    const data = Object.fromEntries(fields.map(f => [f.key, f.type === "number" ? Number(form[f.key]) : form[f.key].trim()]));
    try { if (editing) await edit(editing, data); else await add({ ...data, status: "open" }); setForm(null); setMessage(`${singular} saved.`); }
    catch (error) { setFailure(error instanceof Error ? error.message : "Your changes could not be saved. Please try again; your text is still here."); }
    finally { setBusy(false); }
  };
  const toggle = async (item: ClientRecord) => { setFailure(""); try { await edit(item.id, {status: item.status === "done" ? "open" : "done"}); setMessage(item.status === "done" ? "Task reopened." : "Task completed."); } catch { setFailure("Could not update the task. Try again."); } };
  return <div className="page">
    <header className="page-header"><div><h1>{title}</h1><p className="page-description">{description}</p></div><button className="button" onClick={() => open()}><Plus size={17}/>Add {singular.toLowerCase()}</button></header>
    {message && <p role="status" className="status-note mb-4">{message}</p>}
    {(error || failure) && <div role="alert" className="error-note mb-4">{failure || "We couldn't load this workspace."} {error && <button className="underline" onClick={reload}>Retry</button>}</div>}
    {form && <form onSubmit={save} className="panel p-6 mb-6" aria-label={`${editing ? "Edit" : "Add"} ${singular.toLowerCase()}`}>
      <div className="flex justify-between items-center mb-5"><h2 className="text-lg">{editing ? "Edit" : "Add"} {singular.toLowerCase()}</h2><button type="button" className="button secondary" onClick={() => setForm(null)} aria-label="Close form"><X size={17}/></button></div>
      <div className="grid sm:grid-cols-2 gap-4">{fields.map(f => <label key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}><span className="field-label">{f.label}{f.required ? " *" : ""}</span>{f.type === "textarea" ? <textarea className="field" rows={3} value={form[f.key]} required={f.required} onChange={e => setForm({...form, [f.key]: e.target.value})}/> : <input className="field" type={f.type ?? "text"} min={f.type === "number" ? 0 : undefined} value={form[f.key]} required={f.required} onChange={e => setForm({...form, [f.key]: e.target.value})}/>}</label>)}</div>
      <div className="flex gap-3 mt-5"><button className="button" disabled={busy}>{busy ? "Saving…" : `Save ${singular.toLowerCase()}`}</button><button type="button" className="button secondary" onClick={() => setForm(null)}>Cancel</button></div>
    </form>}
    <div className="flex flex-wrap items-center gap-3 mb-5"><label className="flex-1 min-w-48 relative"><Search size={16} className="absolute left-3 top-3.5"/><input className="field pl-10" aria-label={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}…`} value={query} onChange={e => setQuery(e.target.value)}/></label>{completable && <select aria-label="Filter tasks" className="field w-auto" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All tasks</option><option value="open">Open</option><option value="done">Completed</option></select>}<button className="button secondary" disabled={!shown.length} onClick={() => downloadCSV(title.toLowerCase(), fields.map(f => f.label), shown.map(i => fields.map(f => String(i[f.key] ?? ""))))}><Download size={16}/>Export</button></div>
    <section className="panel" aria-label={title} aria-busy={loading}>
      <div className="panel-header"><h2>{shown.length} {title.toLowerCase()}</h2><span className="text-xs text-[var(--text-muted)]">Saved to this workspace</span></div>
      {loading ? <div className="p-8 space-y-4" role="status"><p>Loading {title.toLowerCase()}…</p><div className="h-12 rounded bg-[var(--bg-surface-2)] animate-pulse"/></div> : shown.length ? shown.map(item => <div className="row-link" key={item.id}>
        {completable && <button className="button secondary px-3" aria-label={`${item.status === "done" ? "Reopen" : "Complete"} ${item[titleKey]}`} onClick={() => toggle(item)}><Check size={18} style={{opacity: item.status === "done" ? 1 : .25}}/></button>}
        <div className="flex-1 min-w-0"><h3 className={`text-sm font-semibold ${item.status === "done" ? "line-through" : ""}`}>{String(item[titleKey] ?? "Untitled")}</h3><p className="text-sm text-[var(--text-muted)] mt-1 break-words">{String(item[subtitleKey] ?? "")}</p><div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-[var(--text-muted)]">{fields.filter(f => f.key !== titleKey && f.key !== subtitleKey && item[f.key]).map(f => <span key={f.key}>{f.label}: {f.type === "number" ? Number(item[f.key]).toLocaleString("en-US") : String(item[f.key])}</span>)}</div></div>
        <button className="button secondary px-3" aria-label={`Edit ${item[titleKey]}`} onClick={() => open(item)}><Pencil size={16}/></button>
      </div>) : <div className="empty-state"><h3>{query ? "No matches found" : `No ${title.toLowerCase()} yet`}</h3><p>{query ? "Try a different name or clear your search." : `Add your first ${singular.toLowerCase()} to get started.`}</p><button className="button secondary" onClick={() => query ? setQuery("") : open()}>{query ? "Clear search" : `Add ${singular.toLowerCase()}`}</button></div>}
    </section>
  </div>;
}
