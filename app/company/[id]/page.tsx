import Link from "next/link";
import { AlertTriangle, Play, TrendingUp } from "lucide-react";
import { companies } from "@/lib/mock-data";
import { sampleDossier } from "@/lib/sample-workspace";
import { notFound } from "next/navigation";
import OverviewActions from "@/components/OverviewActions";
import styles from "../company.module.css";

export function generateStaticParams() {
  return companies.map((c) => ({ id: c.id }));
}

function mark(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function millions(value: string) {
  const match = value.match(/([\d.]+)\s*(B|M|K)/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  return unit === "B" ? amount * 1000 : unit === "M" ? amount : amount / 1000;
}

const COMPETITORS = [
  ["Northstar Agents", "AI agents (enterprise)", "2024", "Sequoia (rumored)"],
  ["Lattice Automation", "Edge AI tooling", "2023", "Andreessen Horowitz"],
  ["UiPath", "Enterprise automation", "2021", "Accel, Sequoia"],
  ["Glean", "AI search (enterprise)", "2023", "Kleiner Perkins"],
  ["Hugging Face", "AI platform (models)", "2023", "Coatue, Salesforce"],
] as const;

const SOURCES = [
  ["EdgeML Pitch Deck", "PDF · 12 slides · 8.4 MB", "Company provided"],
  ["Technical Overview", "PDF · 28 pages · 4.1 MB", "Company provided"],
  ["Founders Background", "Google Doc · 6 pages", "Research notes"],
  ["Market Analysis", "PDF · 14 pages · 2.8 MB", "AI generated"],
  ["Competitor Comparison", "Spreadsheet · 3 sheets", "AI generated"],
] as const;

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = companies.find((item) => item.id === id);
  if (!company) notFound();
  const c = company;
  const place = c.geography === "USA" ? "United States" : c.geography;
  const entry = millions(c.valuation);
  const revenue = millions(c.revenue);
  const multiple = entry && revenue ? (entry / revenue).toFixed(1) : null;
  const dossier = sampleDossier(c.id);
  const acv = dossier.economics.match(/ACV \$(\d+)k/)?.[1];
  const margin = dossier.economics.match(/gross margin (\d+)%/)?.[1];
  const burn = dossier.economics.match(/burn \$(\d+)k/)?.[1];
  const runway = dossier.economics.match(/(\d+) months/)?.[1];
  const rivals = c.sector === "AI/ML"
    ? COMPETITORS
    : dossier.competitors.map((name) => [name, c.sector, "—", "—"] as const);
  const file = [
    c.name,
    c.tagline,
    `Thesis match ${c.matchScore}%`,
    `Company score ${c.investmentScore}/100`,
    `Valuation ${c.valuation} on ${c.revenue}`,
    `Stage ${c.stage}`,
    `Market ${c.market.tam} / ${c.market.sam} / ${c.market.som}`,
  ].join("\n");

  return (
    <div className={styles.board}>
      <OverviewActions id={c.id} file={file} />

      <section className={styles.hero}>
        <div className={styles.chip} aria-hidden="true">{c.name}</div>
        <div>
          <p className={styles.kicker}>{c.stage} · {c.sector} · {place}</p>
          <h1>{c.name}</h1>
          <p className={styles.tagline}>{c.tagline}</p>
          <div className={styles.tags}>
            <span>{c.stage}</span>
            <span>{c.sector === "AI/ML" ? "AI Infrastructure" : c.sector}</span>
            {c.tags.includes("Hardware") && <span>Hardware</span>}
            <span>{place}</span>
          </div>
        </div>
        <Link className={styles.watch} href={`/deal/${c.id}`}><Play size={14} aria-hidden="true" />Watch intro (2 min)</Link>
      </section>

      <div className={styles.metrics}>
        <article>
          <em>Thesis Match</em>
          <strong>{c.matchScore}%</strong>
          <span className={styles.rule}><i style={{ width: `${c.matchScore}%`, background: "#22c55e" }} /></span>
          <small>Strong alignment with fund thesis</small>
        </article>
        <article>
          <em>Company Score</em>
          <strong>{c.investmentScore}/100</strong>
          <span className={styles.rule}><i style={{ width: `${c.investmentScore}%`, background: "#3b82f6" }} /></span>
          <small>Based on available information</small>
        </article>
        <article>
          <em>Valuation (reported)</em>
          <strong>{c.valuation}</strong>
          <small>on {c.revenue}{multiple ? ` · ${multiple}× ARR` : ""}</small>
        </article>
        <article>
          <em>Stage</em>
          <strong>{c.stage}</strong>
          <small>Founded {c.founded}</small>
        </article>
        <article>
          <em>Market Size (SOM)</em>
          <strong>{c.market.som}</strong>
          <small>of {c.market.sam} SAM</small>
        </article>
        <article>
          <em>Employees</em>
          <strong>{c.employees}</strong>
          <small>Headcount on record</small>
        </article>
      </div>

      <div className={styles.pair}>
        <section className={`${styles.card} ${styles.support}`}>
          <header className={styles.head}>
            <div><h2><TrendingUp size={16} aria-hidden="true" />The Investment Case</h2><p>Key reasons to consider investing in {c.name}.</p></div>
            <span className={styles.count}>4 key points</span>
          </header>
          {[
            ["Rapid reported traction", `${c.revenue} with ${c.growth} growth.`, "Company reported", "ok"],
            ["Strong technical background", c.founders.map((founder) => `${founder.name}, ${founder.bg}`).join(". ") + ".", "Partially verified", "ai"],
            ["Proprietary compiler", c.bulls[0], "Technically credible", "ok"],
            ["Large and growing market", `${c.market.tam} total market, ${c.market.sam} serviceable, ${c.market.som} obtainable.`, "Market tailwinds", "ai"],
          ].map(([title, body, badge, tone], index) => (
            <div key={title} className={styles.finding}>
              <span className={styles.num}>{index + 1}</span>
              <div><strong>{title}</strong><p>{body}</p></div>
              <span className={styles.badge} data-tone={tone}>{badge}</span>
            </div>
          ))}
        </section>
        <section className={`${styles.card} ${styles.challenge}`}>
          <header className={styles.head}>
            <div><h2><AlertTriangle size={16} aria-hidden="true" />Key Risks and Concerns</h2><p>Primary risks that could weaken the investment case.</p></div>
            <span className={styles.count}>4 key points</span>
          </header>
          {[
            ["Technical advantage unproven", "No independent reproduction of the performance claim.", "Critical", "bad"],
            ["Revenue base is small", `${c.valuation} valuation on ${c.revenue}${multiple ? ` (${multiple}×)` : ""}.`, "High", "bad"],
            ["Platform competition", c.risks[0] ?? "A large vendor may build a similar capability.", "High", "bad"],
            ["Concentration and execution risk", `${c.employees} employees; heavy reliance on key technical hires.`, "Medium", "mid"],
          ].map(([title, body, badge, tone], index) => (
            <div key={title} className={styles.finding}>
              <span className={styles.num}>{index + 1}</span>
              <div><strong>{title}</strong><p>{body}</p></div>
              <span className={styles.badge} data-tone={tone}>{badge}</span>
            </div>
          ))}
        </section>
      </div>

      <div className={styles.trio}>
        <section className={styles.card}>
          <header className={styles.head}>
            <div><h2>Founders & Team</h2><p>{c.founders.length} founders</p></div>
            <Link className={styles.link} href={`/deal/${c.id}`}>View team →</Link>
          </header>
          {c.founders.map((founder) => (
            <div key={founder.name} className={styles.person}>
              <span className={styles.avatar}>{mark(founder.name)}</span>
              <div><strong>{founder.name}</strong><span>{founder.role} · {founder.bg}</span></div>
              <span className={styles.badge} data-tone="ok">Strong background</span>
            </div>
          ))}
        </section>
        <section className={styles.card}>
          <header className={styles.head}>
            <div><h2>Market Opportunity</h2><p>Large and growing market for this category.</p></div>
          </header>
          <div className={styles.markets}>
            <article><b>{c.market.tam}</b><span>TAM</span></article>
            <article><b>{c.market.sam}</b><span>SAM</span></article>
            <article><b>{c.market.som}</b><span>SOM</span></article>
          </div>
          <ul className={styles.bullets}>
            <li>Company estimate. Not independently verified.</li>
            <li>Buyer urgency, adoption, and procurement friction are not on file.</li>
            <li>Well-funded incumbents may build similar capabilities.</li>
          </ul>
        </section>
        <section className={styles.card}>
          <header className={styles.head}>
            <div><h2>Unit Economics (reported)</h2></div>
            <Link className={styles.link} href={`/diligence/${c.id}#financials`}>View details →</Link>
          </header>
          <div className={styles.econ}>
            <div><span>ACV</span><b>{acv ? `$${acv}k` : "—"} <span className={styles.badge}>Company reported</span></b></div>
            <div><span>Gross margin</span><b>{margin ? `${margin}%` : "—"} <span className={styles.badge}>Company reported</span></b></div>
            <div><span>Burn</span><b>{burn ? `$${burn}k / month` : "—"} <span className={styles.badge}>Company reported</span></b></div>
            <div><span>Runway</span><b>{runway ? `${runway} months` : "—"} <span className={styles.badge}>Company reported</span></b></div>
          </div>
          <p className={styles.note}>Key financial metrics are company reported and not independently verified.</p>
        </section>
      </div>

      <div className={styles.pair}>
        <section className={styles.card}>
          <header className={styles.head}>
            <div><h2>Technology</h2><p>{c.bulls[0]}</p></div>
            <Link className={styles.link} href={`/diligence/${c.id}#technology`}>View analysis →</Link>
          </header>
          <div className={styles.tech}>
            <ul>
              <li>Claims a large inference gain versus cloud. Unverified.</li>
              <li>Targets edge devices and custom hardware.</li>
              <li>Potentially defensible through compiler design and IP.</li>
              <li>Requires independent benchmark validation.</li>
            </ul>
            <div className={styles.chip} aria-hidden="true">{c.name}</div>
          </div>
        </section>
        <section className={styles.card}>
          <header className={styles.head}>
            <div><h2>Revenue & Growth (reported)</h2></div>
            <Link className={styles.link} href={`/diligence/${c.id}#traction-detail`}>View details →</Link>
          </header>
          <div className={styles.growth}>
            <div><b>{c.revenue.replace(" ARR", "")}</b><small> ARR</small></div>
            <em>{c.growth}<small> YoY growth</small></em>
          </div>
          <div className={styles.bars} aria-hidden="true">
            {[["Q1", 32], ["Q2", 48], ["Q3", 72], ["Q4", 100]].map(([label, height]) => (
              <div key={label}><i style={{ height: `${height}%` }} /><span>{label}</span></div>
            ))}
          </div>
          <p className={styles.note}>Company reported. No external sources have been independently verified.</p>
        </section>
      </div>

      <div className={styles.pair}>
        <section className={`${styles.card} ${styles.comp}`}>
          <header className={styles.head}>
            <div><h2>Competition</h2><p>Selected competitors. Illustrative.</p></div>
            <Link className={styles.link} href={`/diligence/${c.id}#competition`}>View analysis →</Link>
          </header>
          <table>
            <thead><tr><th>Company</th><th>Focus</th><th>Last raise</th><th>Notable investors</th></tr></thead>
            <tbody>
              {rivals.map(([name, focus, year, investors]) => (
                <tr key={name}><td>{name}</td><td>{focus}</td><td>{year}</td><td>{investors}</td></tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>Selected competitors are fictional. These names are context, not this fund’s returns.</p>
        </section>
        <section className={styles.card}>
          <header className={styles.head}>
            <div><h2>Key Evidence and Sources</h2></div>
            <Link className={styles.link} href={`/diligence/${c.id}#claims`}>View all sources →</Link>
          </header>
          <ul className={styles.sources}>
            {SOURCES.map(([title, meta, origin]) => (
              <li key={title}>
                <div><strong>{title.replace("EdgeML", c.name)}</strong><span>{meta}</span></div>
                <span className={styles.badge} data-tone={origin === "AI generated" ? "ai" : undefined}>{origin}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={styles.card}>
        <header className={styles.head}><div><h2>Key Takeaways</h2><p>High-level summary based on current information.</p></div></header>
        <div className={styles.take}>
          <p className={styles.note}>{c.name} · {c.stage} · {place}</p>
          <ul>
            <li>{c.name} is an early-stage company with a large reported market in {c.sector}.</li>
            <li>Current traction is on the company file and unverified. The valuation implies high expectations.</li>
            <li>Key risks include technical validation, platform competition, and execution with a team of {c.employees}.</li>
            <li>Further diligence should focus on an independent benchmark, customer references, and product-market fit.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
