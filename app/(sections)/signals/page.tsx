"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bell, Bookmark, LayoutGrid, Rows3, Search, X } from "lucide-react";
import PublicResearch from "@/components/PublicResearch";
import PublicMonitoring from "@/components/PublicMonitoring";
import { useCollection } from "@/lib/data-client";
import { companies } from "@/lib/mock-data";
import { marketSignals, SIGNALS_REVIEWED } from "@/lib/market-signals";
import styles from "./signals.module.css";

const THEMES = [
  { label: "AI infrastructure", sector: "AI/ML" },
  { label: "Healthcare tech", sector: "HealthTech" },
  { label: "Fintech", sector: "FinTech" },
  { label: "Enterprise software", sector: "Enterprise AI" },
  { label: "Climate tech", sector: "CleanTech" },
  { label: "Cybersecurity", sector: "Cybersecurity" },
  { label: "Infrastructure", sector: "Infrastructure" },
  { label: "Legal tech", sector: "LegalTech" },
  { label: "Software", sector: "SaaS" },
];

const formatDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function within(date: string, range: string) {
  if (range === "all") return true;
  const reviewed = new Date(`${SIGNALS_REVIEWED}T00:00:00Z`).getTime();
  const stamp = new Date(`${date}T00:00:00Z`).getTime();
  const days = range === "90" ? 90 : 180;
  return reviewed - stamp <= days * 86_400_000;
}

export default function SignalsPage() {
  const drawerRef = useRef<HTMLDialogElement>(null);
 const sources = useCollection("integrations");
  const customSources = sources.items.filter((item) => item.kind === "market-source");
  const [sourceForm, setSourceForm] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [savingSource, setSavingSource] = useState(false);
  const [tool, setTool] = useState<"research" | "monitor" | null>(null);
  const [location, setLocation] = useState("");
  const [publisher, setPublisher] = useState("All sources");
  const [sector, setSector] = useState("All sectors");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("opportunity");
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [moreThemes, setMoreThemes] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [storageError, setStorageError] = useState("");

  async function saveSource(event: React.FormEvent) {
    event.preventDefault();
    setSourceError("");
    setSavingSource(true);
    try {
      const url = new URL(sourceUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Use a public HTTP or HTTPS URL without credentials.");
      if (["cb insights", "fortune", "all sources"].includes(sourceName.trim().toLowerCase()) || customSources.some((item) => String(item.name).toLowerCase() === sourceName.trim().toLowerCase())) throw new Error("This source already exists.");
      const item = await sources.add({ kind: "market-source", name: sourceName.trim(), url: url.href, status: "saved" });
      setPublisher(String(item.id));
      setSourceName("");
      setSourceUrl("");
      setSourceForm(false);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Could not save source.");
    } finally {
      setSavingSource(false);
    }
  }

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog || !sourceForm) return;
    const previous = document.activeElement as HTMLElement | null;
     dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [sourceForm]);

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem("nextgen-saved-signals") || "[]");
      if (Array.isArray(value)) setSaved(value.filter((item): item is string => typeof item === "string"));
    } catch {
      setStorageError("Saved signals could not load on this device.");
    }
  }, []);

  function toggle(id: string) {
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem("nextgen-saved-signals", JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError("This browser could not save your selection. It is available for this session only.");
    }
  }

  const currentSource = customSources.find((item) => item.id === publisher);
  const opportunities = marketSignals.filter((signal) => signal.impact === "Opportunity").length;
  const watches = marketSignals.filter((signal) => signal.impact === "Watch").length;
  const share = (count: number) => `${Math.round((count / marketSignals.length) * 100)}% of signals`;
  const themes = moreThemes ? THEMES : THEMES.slice(0, 6);
  const filtered = marketSignals
    .filter((signal) => (publisher === "All sources" || signal.publisher === publisher) && (sector === "All sectors" || (signal.sectors as readonly string[]).includes(sector)) && within(signal.date, range) && (!savedOnly || saved.includes(signal.id)) && `${signal.title} ${signal.fact} ${signal.topic} ${signal.collection}`.toLowerCase().includes(query.toLowerCase()))
    .slice()
    .sort((a, b) => {
      if (sort === "newest") return b.date.localeCompare(a.date);
      if (sort === "oldest") return a.date.localeCompare(b.date);
      if (a.impact !== b.impact) return a.impact === "Opportunity" ? -1 : 1;
      return b.date.localeCompare(a.date);
    });

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Market signals</h1>
          <p>Track relevant market, sector and technology developments to inform your next investment decision.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} aria-expanded={tool === "monitor"} aria-controls="research-tools" onClick={() => setTool(tool === "monitor" ? null : "monitor")}><Bell size={15} aria-hidden="true" /> Create alert</button>
          <button type="button" className={styles.go} aria-expanded={tool === "research"} aria-controls="research-tools" onClick={() => setTool(tool === "research" ? null : "research")}>Explore research <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
      </header>

 <section id="research-tools" hidden={!tool} className={styles.locationHub} aria-labelledby="location-title">
        <div>
          <h2 id="location-title">{tool === "monitor" ? "Monitor a market" : "Explore a market"}</h2>
          <p>Choose a location and a public topic. This does not add a signal to the curated set.</p>
        </div>
        <label>City, country or region<input list="signal-locations" value={location} maxLength={60} onChange={(event) => setLocation(event.target.value)} placeholder="Worldwide — or enter a location" /><datalist id="signal-locations">{["New York", "London", "San Francisco", "Dubai", "Singapore", "India", "Europe"].map((value) => <option key={value} value={value} />)}</datalist></label>
        <span className={styles.locationNote}>Location is matched as a search term, not verified geography. Curated CB Insights and Fortune reports remain global.</span>
        <div className={styles.researchTools}>
          <div hidden={tool !== "research"}><PublicResearch compact location={location} /></div>
          <div hidden={tool !== "monitor"}><PublicMonitoring location={location} /></div>
        </div>
      </section>

      <section className={styles.kpis}>
        <article><i className={styles.green}><Bookmark size={16} /></i><b>{marketSignals.length}</b><span>Total signals</span><small>Reviewed {formatDate(SIGNALS_REVIEWED)}</small></article>
        <article><i className={styles.violet}><Search size={16} /></i><b>{opportunities}</b><span>Investment opportunities</span><small>{share(opportunities)}</small></article>
        <article><i className={styles.amber}><Bell size={16} /></i><b>{watches}</b><span>Watch items</span><small>{share(watches)}</small></article>
        <article><i className={styles.blue}><LayoutGrid size={16} /></i><b>2</b><span>Public sources</span><small>Fortune and CB Insights</small></article>
      </section>
      <p className={styles.note}>Curated research, not a live feed. Nothing in this set is dated in the current week.</p>

      <div className={styles.filters}>
        <label className={styles.search}><Search size={16} aria-hidden="true" /><input aria-label="Search market signals" placeholder="Search signals, themes, companies or keywords…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Source" value={publisher} onChange={(event) => { if (event.target.value === "add-source") setSourceForm(true); else setPublisher(event.target.value); }}>
          {["All sources", "CB Insights", "Fortune"].map((value) => <option key={value}>{value}</option>)}
          {customSources.map((item) => <option key={item.id} value={item.id}>{String(item.name)} · saved</option>)}
          <option value="add-source">Add a source…</option>
        </select>
        <select aria-label="Sector" value={sector} onChange={(event) => setSector(event.target.value)}>
          {["All sectors", ...new Set(marketSignals.flatMap((signal) => [...signal.sectors]))].map((value) => <option key={value}>{value}</option>)}
        </select>
        <select aria-label="Time" value={range} onChange={(event) => setRange(event.target.value)}>
          <option value="all">All time</option>
          <option value="90">Last 90 days before review</option>
          <option value="180">Last 6 months before review</option>
        </select>
        <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="opportunity">Opportunity first</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <button type="button" className={savedOnly ? styles.savedOn : styles.saved} aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)}><Bookmark size={15} aria-hidden="true" /> {saved.length}</button>
      </div>
      {sources.error && <p className={styles.alert} role="alert">Sources could not load. <button type="button" onClick={sources.reload}>Retry</button></p>}
      {storageError && <p className={styles.alert} role="alert">{storageError}</p>}

      <div className={styles.themes}>
        <span>Popular themes</span>
        {themes.map((theme) => (
          <button key={theme.sector} type="button" className={sector === theme.sector ? styles.themeOn : styles.theme} onClick={() => setSector(sector === theme.sector ? "All sectors" : theme.sector)}>{theme.label}</button>
        ))}
        <button type="button" className={styles.theme} onClick={() => setMoreThemes((value) => !value)}>{moreThemes ? "Less" : "More"}</button>
        <div className={styles.toggle} role="group" aria-label="Layout">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid size={14} aria-hidden="true" /> Grid</button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><Rows3 size={14} aria-hidden="true" /> List</button>
        </div>
      </div>

      {currentSource && (
        <section className={styles.sourceForm}>
          <h2>{String(currentSource.name)}</h2>
          <p>Source saved. No signals have been imported from this source; it is not connected to automatic retrieval.</p>
          <div>
            <a className={styles.ghost} href={String(currentSource.url)} target="_blank" rel="noopener noreferrer">Open source <ArrowUpRight size={14} /></a>
            <Link className={styles.go} href="/marketplace">Configure integration <ArrowRight size={14} /></Link>
          </div>
 </section>
      )}

      {filtered.length > 0 ? (
        <div className={view === "list" ? styles.list : styles.feed}>
          {filtered.map((signal) => {
            const watch = signal.impact === "Watch";
            const related = companies.filter((company) => (signal.sectors as readonly string[]).includes(company.sector) && !("portfolio" in company && company.portfolio));
            return (
              <article key={signal.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={watch ? styles.watch : styles.opportunity}>{watch ? "Watch item" : "Investment opportunity"}</span>
                  <span className={styles.byline}>{signal.publisher} · {formatDate(signal.date)}</span>
                  <button type="button" aria-label={`${saved.includes(signal.id) ? "Unsave" : "Save"} ${signal.title}`} aria-pressed={saved.includes(signal.id)} onClick={() => toggle(signal.id)}><Bookmark size={15} fill={saved.includes(signal.id) ? "currentColor" : "none"} /></button>
                </div>
                <p className={styles.metric}><strong>{signal.metric}</strong><span>{signal.metricLabel}</span></p>
                <h2>{signal.title}</h2>
                <p className={styles.fact}>{signal.fact}</p>
                <div className={styles.tags}>
                  <span>{signal.topic}</span>
                  {signal.sectors.slice(0, 2).map((item) => <span key={item}>{item}</span>)}
                </div>
                <div className={styles.stats}>
                  <span><b>{watch ? "Watch" : "Opportunity"}</b>On this record</span>
                  <span><b>{related.length}</b>Sample companies</span>
                  <span><b>{signal.collection}</b>Source collection</span>
                </div>
                <div className={styles.cardFoot}>
                  <details>
                    <summary>Investment perspective</summary>
                    <p>{signal.implication}</p>
                    <p>{signal.question}</p>
                    <div className={styles.related}>{related.slice(0, 3).map((company) => <Link key={company.id} href={`/company/${company.id}`}>{company.name}</Link>)}</div>
                  </details>
                  <a href={signal.source} target="_blank" rel="noopener noreferrer">Read original source <ArrowUpRight size={14} aria-hidden="true" /></a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <h2>No signals match these filters</h2>
          <p>Broaden the source, sector, or time range.</p>
          <button type="button" className={styles.ghost} onClick={() => { setPublisher("All sources"); setSector("All sectors"); setRange("all"); setQuery(""); setSavedOnly(false); }}>Clear filters</button>
        </div>
      )}

      <dialog ref={drawerRef} className={styles.sourceDrawer} aria-labelledby="source-drawer-title" onCancel={(event) => { event.preventDefault(); setSourceForm(false); }} onClick={(event) => { if (event.target === event.currentTarget) setSourceForm(false); }}>
        <section className={styles.drawerContent}>
          <header className={styles.drawerHeader}><span>Sources</span><button type="button" className={styles.closeDrawer} aria-label="Close source panel" onClick={() => setSourceForm(false)}><X size={18} /></button></header>
          <h2 id="source-drawer-title">Add a research source</h2>
          <p>Save a website or feed URL for quick access. Automatic retrieval requires a supported integration.</p>
          <form onSubmit={saveSource}>
            <label>Source name<input className="field" value={sourceName} required maxLength={80} onChange={(event) => setSourceName(event.target.value)} placeholder="e.g. Dealroom" /></label>
            <label>Website or feed URL<input className="field" type="url" required maxLength={2048} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
            {sourceError && <p className={styles.alert} role="alert">{sourceError}</p>}
            <div>
              <button className={styles.go} disabled={savingSource}>{savingSource ? "Saving…" : "Save source"}</button>
              <button type="button" className={styles.ghost} onClick={() => setSourceForm(false)}>Cancel</button>
              <Link href="/marketplace" className={styles.ghost}>Browse integrations <ArrowUpRight size={14} /></Link>
            </div>
          </form>
        </section>
      </dialog>
    </div>
  );
}
