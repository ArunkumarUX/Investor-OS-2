"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Radar, TrendingUp, ShieldAlert } from "lucide-react";
import { companies } from "@/lib/mock-data";
import styles from "./OpportunityIntelligence.module.css";
export default function OpportunityIntelligence() {
  const [sector,setSector] = useState("All sectors");
  const [sort,setSort] = useState("fit");
  const [selected,setSelected] = useState("nova-ai");
  const ranked = companies.filter(c=>sector==="All sectors"||c.sector===sector).sort((a,b)=>sort==="growth"?parseFloat(b.growth)-parseFloat(a.growth):b.matchScore-a.matchScore);
  const shortlist = ranked.slice(0,4);
  const focus = shortlist.find(c=>c.id===selected) ?? shortlist[0];
  return <section className={styles.intelligence} aria-labelledby="opportunity-title">
    <header className={styles.header}><div><h2 id="opportunity-title"><Radar size={21}/>Opportunity intelligence</h2><p>What deserves a closer look—and what could change your mind.</p></div><Link href="/discovery">Explore all {companies.length}<ArrowUpRight size={16}/></Link></header>
    <div className={styles.toolbar}><div><label>Sector<select value={sector} onChange={e=>setSector(e.target.value)}><option>All sectors</option>{[...new Set(companies.map(c=>c.sector))].sort().map(s=><option key={s}>{s}</option>)}</select></label><label>Rank by<select value={sort} onChange={e=>setSort(e.target.value)}><option value="fit">Thesis match</option><option value="growth">Revenue growth</option></select></label></div><span>Sample intelligence · not live signals</span></div>
    {focus && <div className={styles.body}><div className={styles.list} aria-label="Ranked opportunities">{shortlist.map((c,i)=><button key={c.id} aria-pressed={focus.id===c.id} className={focus.id===c.id?styles.selected:""} onClick={()=>setSelected(c.id)}><span className={styles.rank}>{String(i+1).padStart(2,"0")}</span><span className={styles.identity}><strong>{c.name}</strong><small>{c.sector} · {c.stage}</small></span><span className={styles.score}>{sort==="growth"?c.growth.replace(" YoY",""):`${c.matchScore}%`}<small>{sort==="growth"?"growth":"match"}</small></span><ArrowRight size={15}/></button>)}</div>
    <article className={styles.detail} aria-live="polite"><div className={styles.detailHeader}><div><h3>{focus.name}</h3><p>{focus.tagline}</p></div><Link href={`/company/${focus.id}`} aria-label={`Open ${focus.name} profile`}><ArrowUpRight size={22}/></Link></div><dl className={styles.metrics}><div><dt>Reported revenue</dt><dd>{focus.revenue}</dd></div><div><dt>Revenue growth</dt><dd>{focus.growth}</dd></div><div><dt>Valuation</dt><dd>{focus.valuation}</dd></div></dl><div className={styles.reason}><TrendingUp size={17}/><div><h4>Why investigate</h4><p>{focus.bulls[1] ?? focus.bulls[0]}</p></div></div><div className={styles.reason}><ShieldAlert size={17}/><div><h4>What to challenge</h4><p>{focus.risks[0]}</p></div></div><div className={styles.actions}><Link className={styles.primary} href={`/diligence/${focus.id}`}>Review the opportunity<ArrowRight size={16}/></Link><Link href={`/deal/${focus.id}`}>Inspect evidence</Link></div></article></div>}
    <details className={styles.method}><summary>How this shortlist is ranked</summary><p>Thesis match uses the illustrative match score in each fictional company profile. Revenue growth sorts its sample year-over-year percentage. Sector filters narrow the same dataset; these scores are not personalized predictions or investment recommendations. Select a company to inspect its rationale, risks and evidence before making a decision.</p></details>
  </section>;
}
