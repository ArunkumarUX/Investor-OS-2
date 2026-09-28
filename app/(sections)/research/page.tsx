"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, CircleHelp, Download, FileText, Heart, Landmark, Search, Shield, Sparkles, Users, Zap } from "lucide-react";
import { useCollection } from "@/lib/data-client";
import { downloadText } from "@/lib/export";
import type { Evidence, PublicResult } from "@/lib/intelligence-types";
import { marketSignals } from "@/lib/market-signals";
import { companies } from "@/lib/mock-data";
import styles from "./research.module.css";

const CATEGORIES = ["Company", "Market", "Competitors", "Financials", "Regulation", "Technology", "Risk", "News"] as const;
const ICONS = [BarChart3, Users, Heart, Sparkles, Landmark, Shield];
const TINTS = ["#ecfdf3", "#eff6ff", "#fff1f2", "#f5f3ff", "#ecfdf3", "#fff7ed"];
const ICON_COLOR = ["#15803d", "#2563eb", "#e11d48", "#7c3aed", "#15803d", "#c2410c"];
const SEARCH_KEY = "nextgen-research-searches";

type Company = (typeof companies)[number];
type SearchLog = { query: string; company: string; at: string };

function questionsFor(company: Company, category: (typeof CATEGORIES)[number]) {
  const name = company.name;
  const founders = company.founders.map((founder) => founder.name).join(", ");
  const shared: Record<(typeof CATEGORIES)[number], { label: string; query: string }[]> = {
    Company: [
      { label: `What does ${name} do?`, query: `${name} ${company.tagline}` },
      { label: `Who founded ${name}?`, query: `${name} founders ${founders}` },
      { label: `What round is on file?`, query: `${name} ${company.lastRound} ${company.stage}` },
      { label: `Where does ${name} operate?`, query: `${name} ${company.geography} ${company.sector}` },
      { label: `How large is the team on file?`, query: `${name} ${company.employees} employees founded ${company.founded}` },
      { label: `What revenue is on the company record?`, query: `${name} ${company.revenue} ${company.growth}` },
    ],
    Market: [
      { label: "How large is the addressable market?", query: `${company.sector} market size ${company.market.tam} ${company.market.sam}` },
      { label: `Is there demand for ${company.sector}?`, query: `${company.sector} customer adoption market demand` },
      { label: `What is the obtainable market on file?`, query: `${name} ${company.market.som} serviceable market` },
      { label: `Who buys ${company.sector} products?`, query: `${company.sector} enterprise buyers ${company.geography}` },
      { label: `How fast is the recorded growth?`, query: `${name} ${company.growth} ${company.revenue}` },
      { label: `Which sectors sit next to ${company.sector}?`, query: `${company.sector} adjacent markets ${company.tags.slice(0, 2).join(" ")}` },
    ],
    Competitors: [
      { label: `Who competes with ${name}?`, query: `${name} ${company.sector} competitors` },
      { label: "What is the recorded competitive risk?", query: `${name} ${company.risks[0]}` },
      { label: "What does the company claim as a moat?", query: `${name} ${company.bulls[0]}` },
      { label: "Which incumbents are named on file?", query: `${company.sector} incumbents ${company.risks[0]}` },
      { label: "How is the product described?", query: `${name} ${company.tagline} differentiation` },
      { label: "What would a buyer compare it with?", query: `${company.sector} alternatives ${company.stage}` },
    ],
    Financials: [
      { label: "What revenue is on file?", query: `${name} revenue ${company.revenue}` },
      { label: "What valuation is on file?", query: `${name} valuation ${company.valuation}` },
      { label: "What was the last round?", query: `${name} ${company.lastRound}` },
      { label: "What growth is recorded?", query: `${name} ${company.growth}` },
      { label: "What round size is recorded?", query: `${company.lastRound} ${company.stage} ${company.sector}` },
      { label: "What financial questions are still open?", query: `${name} gross margin retention burn ${company.revenue}` },
    ],
    Regulation: [
      { label: `What rules apply in ${company.geography}?`, query: `${company.geography} ${company.sector} regulation` },
      { label: "What does the company record flag?", query: `${name} ${company.risks[0]}` },
      { label: "Is there a sector-specific review?", query: `${company.sector} regulatory approval ${company.geography}` },
      { label: "What customer obligations are typical?", query: `${company.sector} procurement compliance ${company.stage}` },
      { label: "What should diligence confirm?", query: `${name} legal regulatory diligence ${company.geography}` },
      { label: "Which public filings might exist?", query: `${name} ${company.geography} filing` },
    ],
    Technology: [
      { label: "What technology is described?", query: `${name} ${company.tagline}` },
      { label: "Who leads the technical team?", query: `${name} ${company.founders.map((founder) => founder.bg).join(" ")}` },
      { label: "What moat is claimed?", query: `${name} ${company.bulls[1] ?? company.bulls[0]}` },
      { label: "What should be benchmarked?", query: `${company.sector} technical diligence ${name}` },
      { label: "What dependency is a risk?", query: `${name} ${company.risks[0]}` },
      { label: "What tags are on the record?", query: `${name} ${company.tags.join(" ")}` },
    ],
    Risk: [
      { label: "What is the main risk on file?", query: `${name} ${company.risks[0]}` },
      { label: "What else should be tested?", query: `${name} risks ${company.risks.join("; ")}` },
      { label: "What would challenge the thesis?", query: `${name} ${company.bulls[0]}` },
      { label: "What does the sample recommendation say?", query: `${name} ${company.aiRec}` },
      { label: "How concentrated is the market risk?", query: `${company.sector} competition ${company.geography}` },
      { label: "What open question comes first?", query: `${name} diligence question ${company.risks[0]}` },
    ],
    News: [
      { label: `Search public news for ${name}`, query: `${name} ${company.sector}` },
      { label: `Search ${company.sector} funding news`, query: `${company.sector} funding ${company.stage}` },
      { label: `Search ${company.geography} ${company.sector} news`, query: `${company.geography} ${company.sector} startup` },
      { label: "Search the recorded risk", query: company.risks[0] },
      { label: "Search the claimed moat", query: `${company.sector} ${company.bulls[0]}` },
      { label: "Search the last round", query: `${name} ${company.lastRound}` },
    ],
  };
  return shared[category];
}

function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDate(iso?: string) {
  if (!iso) return "Date not on file";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Research() {
  const briefs = useCollection("research");
  const [companyId, setCompanyId] = useState(companies[0].id);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Company");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicResult[]>([]);
  const [retrieved, setRetrieved] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [help, setHelp] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [openBrief, setOpenBrief] = useState<string | null>(null);
  const [recent, setRecent] = useState<SearchLog[]>([]);
  const company = companies.find((item) => item.id === companyId) ?? companies[0];
  const prompts = useMemo(() => questionsFor(company, category), [company, category]);
  const topics = [...new Set(marketSignals.map((signal) => signal.topic))].slice(0, 5);
  const sources = evidence.filter((item) => item.companyId === companyId);
  const visibleSources = sources.filter((item) => sourceFilter === "all" || item.provenance === sourceFilter);
  const counts = {
    all: sources.length,
    sample: sources.filter((item) => item.provenance === "sample").length,
    "public-web": sources.filter((item) => item.provenance === "public-web").length,
    "user-supplied": sources.filter((item) => item.provenance === "user-supplied").length,
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SEARCH_KEY) || "[]");
      if (Array.isArray(stored)) setRecent(stored.filter((item) => item && typeof item.query === "string").slice(0, 6));
    } catch { /* this browser has no saved searches */ }
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/api/intelligence")
      .then((response) => { if (!response.ok) throw new Error("Saved evidence could not load."); return response.json(); })
      .then((data) => { if (live) { setEvidence(data.evidence ?? []); setEvidenceError(""); } })
      .catch((reason) => { if (live) setEvidenceError(reason instanceof Error ? reason.message : "Saved evidence could not load."); })
      .finally(() => { if (live) setEvidenceLoading(false); });
    return () => { live = false; };
  }, [savedIds.length]);

  function remember(nextQuery: string) {
    const entry = { query: nextQuery, company: company.name, at: new Date().toISOString() };
    const next = [entry, ...recent.filter((item) => item.query !== nextQuery)].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem(SEARCH_KEY, JSON.stringify(next)); } catch { /* session only */ }
  }

  async function runSearch(nextQuery = query) {
    const text = nextQuery.trim();
    if (text.length < 2) return;
    setQuery(text);
    setBusy(true);
    setError("");
    setWarning("");
    setNotice("");
    try {
      const response = await fetch(`/api/public-research?q=${encodeURIComponent(text)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.items);
      setRetrieved(data.retrievedAt);
      setWarning((data.warnings ?? []).join(" "));
      remember(text);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search failed. Retry.");
    } finally {
      setBusy(false);
    }
  }

  async function saveResult(item: PublicResult) {
    setSaving(item.id);
    setError("");
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evidence",
          companyId,
          title: item.title,
          url: item.url,
          body: `${item.title}\nSource: ${item.source}\nPublished: ${item.publishedAt || "Not provided"}\nRetrieved: ${retrieved}\n${item.context}\nSaved as a research lead, not verified company evidence.`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSavedIds((previous) => [...previous, item.id]);
      setNotice(`Saved to ${company.name}. It is a research lead, not verified evidence.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Research</h1>
          <p>Choose a company, find answers, and make a better-informed investment decision.</p>
        </div>
        <button type="button" className={styles.help} aria-expanded={help} onClick={() => setHelp((value) => !value)}><CircleHelp size={15} aria-hidden="true" /> How research works</button>
      </header>
      {help && <p className={styles.explain}>A search is sent to Algolia and Crossref. Saving a result stores a research lead on the company. Sample briefs are illustrative and are labeled as such.</p>}

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.intro}>
            <article><i className={styles.violet}><Sparkles size={16} /></i><strong>Ask questions</strong><span>Search public news and published research for the company you pick.</span></article>
            <article><i className={styles.green}><FileText size={16} /></i><strong>Evidence-backed</strong><span>Saved sources stay with the company. Sample sources are marked.</span></article>
            <article><i className={styles.blue}><Zap size={16} /></i><strong>Investment ready</strong><span>Open the company review when you want to test what you found.</span></article>
          </div>

          <section className={styles.card}>
            <div className={styles.bar}>
              <label className={styles.company}>
                <span className={styles.mark} style={{ background: `${company.color}22` }} aria-hidden="true">{company.logo}</span>
                <select aria-label="Research for" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
                  {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <form className={styles.search} onSubmit={(event) => { event.preventDefault(); void runSearch(); }}>
                <Search size={16} aria-hidden="true" />
                <input aria-label="What do you want to investigate?" placeholder="Ask a question, or search for a company, technology or market…" value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} />
              </form>
              <button type="button" className={styles.go} disabled={busy || query.trim().length < 2} onClick={() => void runSearch()}><Search size={14} aria-hidden="true" /> {busy ? "Searching…" : "Search research"}</button>
            </div>
            <p className={styles.hint}>Public search only. Do not include confidential deal information.</p>
            <div className={styles.cats}>
              <span>Suggested questions</span>
              {CATEGORIES.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <div className={styles.prompts}>
              {prompts.map((prompt, index) => {
                const Icon = ICONS[index % ICONS.length];
                return (
                  <button key={prompt.label} type="button" className={styles.prompt} onClick={() => void runSearch(prompt.query)}>
                    <i style={{ background: TINTS[index % TINTS.length], color: ICON_COLOR[index % ICON_COLOR.length] }}><Icon size={14} /></i>
                    <span>{prompt.label}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            {error && <p className={styles.alert} role="alert">{error}</p>}
            {notice && <p className={styles.status} role="status">{notice}</p>}
            {warning && <p className={styles.status} role="status">{warning}</p>}
            {retrieved && (
              <div className={styles.results}>
                <p className={styles.hint}>{results.length} results · Retrieved {new Date(retrieved).toLocaleString()}</p>
                {!results.length && <p className={styles.status}>No results. Try a broader public topic.</p>}
                {results.map((item) => (
                  <article key={item.id} className={styles.result}>
                    <div>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                      <p>{item.source} · {item.publishedAt || "Publication date unavailable"}</p>
                      <p>{item.context}</p>
                    </div>
                    <button type="button" className={styles.save} disabled={!!saving || savedIds.includes(item.id)} onClick={() => void saveResult(item)}>{savedIds.includes(item.id) ? "Saved" : saving === item.id ? "Saving…" : "Save"}</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card} aria-label="Company evidence">
            <div className={styles.sectionHead}>
              <div>
                <h2>Review what you saved</h2>
                <p className={styles.sub}>Sources for {company.name}. Open each one and check its claims.</p>
              </div>
              <Link className={styles.link} href={`/deal/${companyId}`}>Manage evidence <ArrowRight size={14} /></Link>
            </div>
            <div className={styles.filters}>
              {([
                ["all", `All (${counts.all})`],
                ["sample", `Sample (${counts.sample})`],
                ["public-web", `Public (${counts["public-web"]})`],
                ["user-supplied", `Added (${counts["user-supplied"]})`],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={sourceFilter === id} onClick={() => setSourceFilter(id)}>{label}</button>
              ))}
            </div>
            {evidenceLoading ? <p className={styles.status} role="status">Loading saved evidence…</p> : evidenceError ? <p className={styles.alert} role="alert">{evidenceError}</p> : visibleSources.length === 0 ? <p className={styles.emptyNote}>No sources in this filter. Search above and save a relevant public result to {company.name}.</p> : visibleSources.slice().reverse().map((source) => (
              <article key={source.id} className={styles.source}>
                <FileText size={16} aria-hidden="true" />
                <div>
                  <h3>{source.title}</h3>
                  <p>{source.provenance === "sample" ? "Sample source" : source.provenance === "public-web" ? "Public research lead" : "Added on this workspace"}</p>
                  <div className={styles.chips}>
                    <span>{source.provenance === "sample" ? "Company overview" : "Research lead"}</span>
                    <span>{company.sector}</span>
                  </div>
                  {openSource === source.id && <p className={styles.body}>{source.body}</p>}
                </div>
                <div className={styles.meta}>
                  <time dateTime={source.createdAt}>{formatDate(source.createdAt)}</time>
                  <button type="button" className={styles.clear} onClick={() => setOpenSource(openSource === source.id ? null : source.id)}>{openSource === source.id ? "Close" : "Read"}</button>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.card} id="saved-briefs">
            <div className={styles.sectionHead}>
              <div>
                <h2>Saved briefs</h2>
                <p className={styles.sub}>Briefs stored on this server for the sample workspace.</p>
              </div>
            </div>
            {briefs.loading ? <p className={styles.status}>Loading saved briefs…</p> : briefs.error ? <p className={styles.alert}>Saved briefs could not load.</p> : briefs.items.length === 0 ? <p className={styles.emptyNote}>No briefs saved yet.</p> : briefs.items.map((item) => (
              <article key={item.id} className={styles.source}>
                <FileText size={16} aria-hidden="true" />
                <div>
                  <h3>{String(item.title)}</h3>
                  <p>{String(item.source ?? "Saved draft")}</p>
                  {openBrief === item.id && <p className={styles.body}>{String(item.body)}</p>}
                </div>
                <div className={styles.meta}>
                  <time dateTime={String(item.createdAt ?? "")}>{formatDate(typeof item.createdAt === "string" ? item.createdAt : undefined)}</time>
                  <button type="button" className={styles.clear} onClick={() => setOpenBrief(openBrief === item.id ? null : item.id)}>{openBrief === item.id ? "Close" : "Read"}</button>
                  {openBrief === item.id && <button type="button" className={styles.clear} onClick={() => downloadText("research-brief.txt", `${item.source}\n\n${item.body}`)}><Download size={12} /> Download</button>}
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className={styles.side}>
          <section>
            <div className={styles.sideHead}>
              <h2>Recent searches</h2>
              {recent.length > 0 && <button type="button" className={styles.clear} onClick={() => { setRecent([]); try { localStorage.removeItem(SEARCH_KEY); } catch { /* ignore */ } }}>Clear all</button>}
            </div>
            {recent.length === 0 ? <p className={styles.emptyNote}>Searches from this browser show up here.</p> : (
              <ul className={styles.recent}>
                {recent.map((item) => (
                  <li key={`${item.at}-${item.query}`}>
                    <button type="button" onClick={() => void runSearch(item.query)}>
                      <strong>{item.company} — {item.query}</strong>
                      <span>{ago(item.at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <div className={styles.sideHead}>
              <h2>Topics on the signal record</h2>
              <Link className={styles.link} href="/signals">View</Link>
            </div>
            <ol className={styles.topics}>
              {topics.map((topic, index) => (
                <li key={topic}><b>{index + 1}</b><button type="button" onClick={() => setQuery(topic)}>{topic}</button></li>
              ))}
            </ol>
          </section>
          <section>
            <div className={styles.sideHead}>
              <h2>Saved briefs</h2>
              <a className={styles.link} href="#saved-briefs">View all</a>
            </div>
            {briefs.items.length === 0 ? <p className={styles.emptyNote}>No briefs on file.</p> : (
              <ul className={styles.briefs}>
                {briefs.items.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => { setOpenBrief(item.id); document.getElementById("saved-briefs")?.scrollIntoView({ behavior: "smooth" }); }}>
                      <strong>{String(item.title)}</strong>
                      <span>{formatDate(typeof item.createdAt === "string" ? item.createdAt : undefined)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
