"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Flame, LayoutGrid, Rows3, Search, Sparkles, X } from "lucide-react";
import { rankDiscoveries, THESIS_FLOOR, type RankedDiscovery } from "@/lib/discovery-rank";
import { SIGNALS_REVIEWED } from "@/lib/market-signals";
import { getStoreServerSnapshot, getStoreSnapshot, parseSnapshot, subscribeStore } from "@/lib/store";
import styles from "./discovery.module.css";

const MIN_SCORES = [
  { value: "0", label: "Any score" },
  { value: "80", label: "80+" },
  { value: "90", label: "90+" },
];

function moneyParts(value: string) {
  const match = value.match(/^(\$[\d.]+[KMB]?)\s+(.*)$/);
  return match ? { amount: match[1], label: match[2] } : { amount: value, label: "On file" };
}

function sectorCounts(rows: RankedDiscovery[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.sector, (counts.get(row.sector) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default function Discovery() {
  const snapshot = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot));
  const [sector, setSector] = useState("All");
  const [stage, setStage] = useState("All");
  const [region, setRegion] = useState("All");
  const [minScore, setMinScore] = useState("80");
  const [sort, setSort] = useState("fit-desc");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [banner, setBanner] = useState(true);
  const ranked = useMemo(() => rankDiscoveries({ dna: snapshot.dna ?? null, stages: snapshot.stages }), [snapshot.dna, snapshot.stages]);
  const matches = ranked.filter((company) => company.thesisMatch);
  const usingStrategy = Boolean(snapshot.dna && (snapshot.dna.sectors.length || snapshot.dna.stages.length || snapshot.dna.geos.length || snapshot.dna.checkSize));
  const sectors = ["All", ...new Set(ranked.map((company) => company.sector))];
  const stages = ["All", ...new Set(ranked.map((company) => company.stage))];
  const regions = ["All", ...new Set(ranked.map((company) => company.geography))];
  const floor = Number(minScore);
  const visible = ranked
    .filter((company) => {
      if (company.score < floor) return false;
      if (sector !== "All" && company.sector !== sector) return false;
      if (stage !== "All" && company.stage !== stage) return false;
      if (region !== "All" && company.geography !== region) return false;
      const haystack = `${company.name} ${company.sector} ${company.geography} ${company.tags.join(" ")} ${company.why.join(" ")} ${company.risk}`.toLowerCase();
      return !search || haystack.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "fit-asc") return a.score - b.score || a.name.localeCompare(b.name);
      return b.score - a.score || a.name.localeCompare(b.name);
    });
  const reviewed = new Date(`${SIGNALS_REVIEWED}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const chips = [
    ...sectorCounts(matches).map(([name, count]) => ({ name, count, strong: true })),
    ...sectorCounts(ranked.filter((company) => !company.thesisMatch && company.score >= 80)).map(([name, count]) => ({ name, count, strong: false })),
  ].slice(0, 3);
  const sortLabel = sort === "name" ? "Sorted by name" : "Sorted by thesis fit score";

  function reset() {
    setSector("All");
    setStage("All");
    setRegion("All");
    setMinScore("80");
    setSort("fit-desc");
    setSearch("");
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Discover companies</h1>
          <p>Companies ranked against your thesis, with the reason to look and the risk to test.</p>
        </div>
        <Link className={styles.signals} href="/signals">View market signals <ArrowRight size={14} aria-hidden="true" /></Link>
      </header>

      {banner && (
        <section className={styles.banner}>
          <div className={styles.match}>
            <span className={styles.spark}><Sparkles size={16} aria-hidden="true" /></span>
            <p>
              <strong>{matches.length} {matches.length === 1 ? "company matches" : "companies match"} your thesis</strong>
              <span>{usingStrategy ? "Re-ranked from your saved strategy." : `Illustrative scores of ${THESIS_FLOOR} or higher.`} Reviewed {reviewed}.</span>
            </p>
          </div>
          <div className={styles.chips}>
            {chips.map((chip) => (
              <div key={chip.name} className={styles.chip}>
                <div>
                  <b>{chip.name}</b>
                  <span>{chip.strong ? `${chip.count} strong ${chip.count === 1 ? "match" : "matches"}` : `${chip.count} on file`}</span>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className={styles.dismiss} aria-label="Dismiss thesis summary" onClick={() => setBanner(false)}><X size={16} /></button>
        </section>
      )}

      <div className={styles.filters}>
        <label className={styles.search}><Search size={16} aria-hidden="true" /><input aria-label="Search companies" placeholder="Search companies, reasons, sectors or keywords…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label>Sector<select aria-label="Sector" value={sector} onChange={(event) => setSector(event.target.value)}>{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Stage<select aria-label="Stage" value={stage} onChange={(event) => setStage(event.target.value)}>{stages.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Region<select aria-label="Region" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item} value={item}>{item === "All" ? "All regions" : item}</option>)}</select></label>
        <label>Min. score<select aria-label="Minimum score" value={minScore} onChange={(event) => setMinScore(event.target.value)}>{MIN_SCORES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Sort<select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="fit-desc">Thesis fit (high → low)</option><option value="fit-asc">Thesis fit (low → high)</option><option value="name">Name</option></select></label>
      </div>

      <div className={styles.toolbar}>
        <p><strong>{visible.length} {visible.length === 1 ? "company" : "companies"}</strong><span>{sortLabel}</span></p>
        <div className={styles.toggle} role="group" aria-label="Layout">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid size={14} aria-hidden="true" /> Grid</button>
          <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}><Rows3 size={14} aria-hidden="true" /> Table</button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <h2>No companies match</h2>
          <p>Try another sector, stage, region, or search.</p>
          <button type="button" className={styles.clear} onClick={reset}>Clear filters</button>
        </div>
      ) : view === "grid" ? (
        <div className={styles.list}>
          {visible.map((company, index) => {
            const round = moneyParts(company.lastRound);
            const revenue = moneyParts(company.revenue);
            return (
              <article key={company.id} className={styles.card}>
                <div className={styles.top}>
                  <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.logo} style={{ background: `${company.color}22` }} aria-hidden="true">{company.logo}</span>
                  <div>
                    <h2>{company.name}</h2>
                    <p className={styles.meta}>{company.sector} · {company.stage} · {company.geography}</p>
                  </div>
                  <div className={styles.score}>
                    <strong>{company.score}%</strong>
                    <span>{company.thesisMatch ? "Meets the thesis" : "Company record"}</span>
                  </div>
                </div>
                <div className={styles.pills}>
                  {company.thesisMatch && <span className={styles.fit}>{usingStrategy ? "Matches your strategy" : "Thesis match"}</span>}
                  {company.tags.slice(0, 2).map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
                </div>
                <div className={styles.block}>
                  <h3 className={styles.kicker}>Why</h3>
                  <ul className={styles.why}>{company.why.map((reason) => <li key={reason}><Check size={12} aria-hidden="true" />{reason}</li>)}</ul>
                </div>
                <div className={styles.block}>
                  <h3 className={styles.kicker}>Risk</h3>
                  <p className={styles.risk}><Flame size={12} aria-hidden="true" />{company.risk}</p>
                </div>
                <div className={styles.foot}>
                  <div className={styles.facts}>
                    <span><b>{round.amount}</b>{round.label}</span>
                    <span><b>{company.geography}</b>Location</span>
                    <span><b>{revenue.amount}</b>{revenue.label}</span>
                  </div>
                  <Link className={styles.open} href={`/company/${company.id}`}>Open <ArrowUpRight size={13} aria-hidden="true" /></Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Company</th><th>Score</th><th>Sector</th><th>Stage</th><th>Region</th><th>Why</th><th></th></tr>
            </thead>
            <tbody>
              {visible.map((company) => (
                <tr key={company.id}>
                  <td>{company.name}</td>
                  <td className={styles.scoreCell}>{company.score}%</td>
                  <td>{company.sector}</td>
                  <td>{company.stage}</td>
                  <td>{company.geography}</td>
                  <td>{company.why[0]}</td>
                  <td><Link href={`/company/${company.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
