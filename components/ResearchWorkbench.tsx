"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import PublicResearch from "./PublicResearch";
import researchStyles from "@/app/(sections)/research/research.module.css";
import { companies } from "@/lib/mock-data";
import type { Evidence } from "@/lib/intelligence-types";

export default function ResearchWorkbench() {
  const [companyId, setCompanyId] = useState(companies[0].id);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const company = companies.find(c => c.id === companyId)!;
  const sources = evidence.filter(e => e.companyId === companyId);
  const addedSources = sources.filter(e => e.provenance !== "sample");
  const prompts = [
    { label: "Is there demand?", query: `${company.sector} customer adoption market demand` },
    { label: "Who are the competitors?", query: `${company.sector} competitors differentiation` },
    { label: "What makes a healthy business?", query: `${company.sector} revenue retention unit economics` },
  ];
  useEffect(() => {
    let active = true;
    fetch("/api/intelligence").then(r => {
      if (!r.ok) throw new Error("Saved evidence could not load. Try again.");
      return r.json();
    }).then(d => { if (active) { setEvidence(d.evidence); setError(""); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return <>
    <section className="panel p-6 mb-6" aria-label="Research focus">
      <div className="flex flex-wrap justify-between items-start gap-5">
        <div className="max-w-xl"><h2 className="text-lg font-semibold">Choose a company</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">Which investment are you exploring?</p></div>
        <label className="text-xs font-medium w-full sm:w-64">Research for
          <select className="field mt-2" value={companyId} onChange={e => { setCompanyId(e.target.value); }}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <div className={researchStyles.concern}>
        <h3>What to investigate</h3>
        <p className={researchStyles.risk}>{company.risks[0]}</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">Sample profile concern · look for evidence that supports or challenges it.</p>

      </div>
    </section>
    <PublicResearch key={companyId} companyId={companyId} suggestions={prompts} onEvidenceSaved={() => setRevision(r => r + 1)}/>
    <section className="panel p-6 mb-6" aria-label="Company evidence">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div><h2 className="text-lg font-semibold">Review what you saved</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">Sources for {company.name}. Open each one and check its claims.</p></div>
        <Link className="button secondary" href={`/deal/${companyId}`}>Manage evidence<ArrowUpRight size={14}/></Link>
      </div>
      {loading ? <p role="status" className="py-6 text-sm">Loading saved evidence…</p> : error ? <div role="alert" className="mt-5"><p>{error}</p><button className="button secondary mt-3" onClick={() => { setLoading(true); setRevision(r => r + 1); }}>Try again</button></div> : <>
        <p className="text-xs text-[var(--text-muted)] mt-5 mb-3">{sources.length} saved sources · {addedSources.length} added by your team · {sources.filter(e => e.provenance === "sample").length} sample sources</p>
        {sources.length ? sources.slice(-4).reverse().map(source => <details key={source.id} className="py-4 border-t border-[var(--border)]"><summary className="flex items-start gap-3 cursor-pointer"><BookOpen size={17} className="shrink-0 mt-1 text-[var(--text-muted)]"/><div><p className="text-sm font-medium">{source.title}</p><p className="text-xs text-[var(--text-muted)] mt-1">{source.provenance === "sample" ? "Sample source" : source.provenance === "public-web" ? "Public research lead · verify before use" : "Added by your team · verify before use"}</p><span className="text-xs underline inline-block mt-2">Read source details</span></div></summary><p className="text-sm leading-relaxed whitespace-pre-wrap mt-4">{source.body}</p></details>) : <p className="py-6 text-sm">No sources yet. Search a topic above and save a relevant result to {company.name}.</p>}
      </>}
      <div className="flex flex-wrap justify-between items-center gap-4 mt-5 pt-5 border-t border-[var(--border)]"><p className="text-sm text-[var(--text-muted)] max-w-lg">Use these sources to review the company and decide what to investigate next.</p><Link className="button" href={`/diligence/${companyId}`}>Review company<ArrowUpRight size={14}/></Link></div>
    </section>
  </>;
}
