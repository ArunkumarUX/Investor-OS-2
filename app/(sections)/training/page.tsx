"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, History, Scale, Search, SlidersHorizontal, Wallet } from "lucide-react";
import { useCollection } from "@/lib/data-client";
import { companies } from "@/lib/mock-data";
import { lpBrief } from "@/lib/operating-picture";
import { liveHoldings } from "@/lib/portfolio-book";
import { initialDeals } from "@/lib/pipeline-data";
import styles from "./help.module.css";

const TERMS = [
  ["Due diligence", "Checking the evidence behind a company’s claims before you decide."],
  ["Investment thesis", "Your explanation of why this company could create value, and what must be true for it to work."],
  ["TVPI", "Total value compared with paid-in capital. A 2× multiple means reported value is twice the capital paid in. It does not mean the cash has been returned."],
  ["IRR", "An annualized return measure that depends on when money enters and leaves an investment."],
  ["Dry powder", "Capital available for future investment. Cash on hand and uncalled commitments are not the same thing."],
];

function formatDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Help() {
  const strategy = useCollection("strategy");
  const saved = strategy.items[0];
  const sectors = Array.isArray(saved?.sectors) ? saved.sectors.slice(0, 2).map(String) : ["AI/ML", "HealthTech"];
  const stages = Array.isArray(saved?.stages) ? saved.stages.map(String).join(", ") : "Pre-seed, Seed, Series A";
  const check = typeof saved?.checkSize === "string" ? saved.checkSize : "$250K–$3M initial";
  const nova = companies.find((company) => company.id === "nova-ai");
  const novaDeal = initialDeals.find((deal) => deal.companyId === "nova-ai");
  const book = lpBrief(liveHoldings());

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>GETTING STARTED</p>
      <div className={styles.layout}>
        <div>
          <header className={styles.head}>
            <h1>Your first investment review</h1>
            <p>A guided path from the sample strategy to a decision you can explain. Each time is a guide, not a recorded session.</p>
          </header>
          <div className={styles.steps}>
            <article className={styles.step}>
              <span className={styles.num}>1</span>
              <div className={styles.copy}>
                <h2><SlidersHorizontal size={16} aria-hidden="true" /> Define what a good investment looks like</h2>
                <p>Sectors, stages, regions, and check size already saved for this workspace. They filter company discovery.</p>
                <div className={styles.time}>About 2 min</div>
              </div>
              <div className={styles.preview}>
                <div className={styles.chips}>{sectors.map((item) => <span key={item}>{item}</span>)}<span>{stages}</span></div>
                <p className={styles.check}>{check}</p>
              </div>
              <Link className={styles.go} href="/dna">Review settings <ArrowRight size={14} /></Link>
            </article>

            <article className={styles.step}>
              <span className={styles.num}>2</span>
              <div className={styles.copy}>
                <h2><Search size={16} aria-hidden="true" /> Find a company worth investigating</h2>
                <p>Search the sample companies. Open a profile for the business, the risks, and the match score.</p>
                <div className={styles.time}>About 3 min</div>
              </div>
              {nova && (
                <Link className={styles.preview} href={`/company/${nova.id}`}>
                  <span className={styles.company}>
                    <Image src={`/company-marks/${nova.id}.svg`} alt="" width={28} height={28} />
                    <span><strong>{nova.name}</strong><span>{nova.tagline}</span></span>
                  </span>
                  <span className={styles.chips}><span>{nova.stage}</span><span>{nova.lastRound.split(" ")[0]}</span><span>{nova.sector}</span></span>
                </Link>
              )}
              <Link className={styles.go} href="/discovery">Browse companies <ArrowRight size={14} /></Link>
            </article>

            <article className={styles.step}>
              <span className={styles.num}>3</span>
              <div className={styles.copy}>
                <h2><Building2 size={16} aria-hidden="true" /> Build the evidence in a deal workspace</h2>
                <p>Open a deal, add notes and questions, and see what is still missing. Notes you add stay on this server.</p>
                <div className={styles.time}>About 5 min</div>
              </div>
              <div className={styles.preview}>
                <div className={styles.tabs}><span className={styles.choice}>Notes</span><span className={styles.choice}>Documents</span><span className={styles.choice}>Questions</span></div>
                <p className={styles.note}>Nova AI is the sample workspace. Nothing here is marked complete.</p>
              </div>
              <Link className={styles.go} href="/deal/nova-ai">Open a deal <ArrowRight size={14} /></Link>
            </article>

            <article className={styles.step}>
              <span className={styles.num}>4</span>
              <div className={styles.copy}>
                <h2><Scale size={16} aria-hidden="true" /> Challenge the thesis and record a decision</h2>
                <p>Read the case, then record invest, watch, or pass with a rationale. No money moves, and nothing is saved until you record it.</p>
                <div className={styles.time}>About 5 min</div>
              </div>
              <div className={styles.preview}>
                <div className={styles.chips}>
                  <span className={`${styles.choice} ${styles.invest}`}>Invest</span>
                  <span className={`${styles.choice} ${styles.watch}`}>Watch</span>
                  <span className={`${styles.choice} ${styles.pass}`}>Pass</span>
                </div>
                <p className={styles.note}>No verdict is saved for Nova AI.</p>
              </div>
              <Link className={styles.go} href="/committee/nova-ai">Make a decision <ArrowRight size={14} /></Link>
            </article>

            <article className={styles.step}>
              <span className={styles.num}>5</span>
              <div className={styles.copy}>
                <h2><History size={16} aria-hidden="true" /> Revisit what you decided</h2>
                <p>Decision history keeps the stage date and any verdict you save. Earlier steps stay undated when no move is on file.</p>
                <div className={styles.time}>About 2 min</div>
              </div>
              <div className={styles.preview}>
                <p className={styles.when}>{novaDeal ? `Nova AI is at Committee since ${formatDate(novaDeal.movedAt)}.` : "Nova AI is on the pipeline."}</p>
                <p className={styles.note}>No verdict is recorded.</p>
              </div>
              <Link className={styles.go} href="/memory">View decision history <ArrowRight size={14} /></Link>
            </article>

            <article className={styles.step}>
              <span className={styles.num}>6</span>
              <div className={styles.copy}>
                <h2><Wallet size={16} aria-hidden="true" /> Monitor the portfolio and follow up</h2>
                <p>Review the sample book and the alerts on file, then add a task if you want a next action.</p>
                <div className={styles.time}>About 3 min</div>
              </div>
              <div className={styles.preview}>
                <p className={styles.value}><b>${book.current.toFixed(1)}M</b><span>{book.multiple ? `${book.multiple.toFixed(2)}× marked cost. A snapshot, not a period return.` : "Marked value on the book."}</span></p>
              </div>
              <Link className={styles.go} href="/portfolio">View portfolio <ArrowRight size={14} /></Link>
            </article>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.card}>
            <div className={styles.progressHead}><h2>Your progress</h2><span>0 of 6 completed</span></div>
            <div className={styles.track} role="img" aria-label="0 of 6 steps completed"><i /></div>
            <p>No step is marked complete. Opening a page does not record a session.</p>
          </section>
          <section className={styles.card}>
            <h2>What this guide covers</h2>
            <ul className={styles.aims}>
              <li>Find a sample company and read the match.</li>
              <li>See the strategy already saved for this workspace.</li>
              <li>Record a decision only when you choose to save one.</li>
              <li>Read the book value that is already on file.</li>
            </ul>
          </section>
          <section className={styles.card}>
            <h2>Useful pages</h2>
            <ul className={styles.links}>
              <li><Link href="/dna"><span><strong>Investment strategy</strong><span>Sectors, stages, and check size</span></span><ArrowRight size={14} /></Link></li>
              <li><Link href="/memory"><span><strong>Decision history</strong><span>Stage dates and saved verdicts</span></span><ArrowRight size={14} /></Link></li>
              <li><Link href="/portfolio"><span><strong>Portfolio</strong><span>Marked cost and current value</span></span><ArrowRight size={14} /></Link></li>
              <li><Link href="#terms"><span><strong>Terms</strong><span>Short definitions on this page</span></span><ArrowRight size={14} /></Link></li>
            </ul>
          </section>
          <section className={`${styles.card} ${styles.help}`}>
            <h2>Need a definition?</h2>
            <p>The terms on this page are the help text. There is no separate help centre.</p>
            <a className={styles.centre} href="#terms">Read the terms</a>
          </section>
        </aside>
      </div>

      <details className={styles.terms} id="terms">
        <summary>A few investment terms, in plain English <span className={styles.closed}>Expand</span><span className={styles.openLabel}>Collapse</span></summary>
        <dl>
          {TERMS.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}
        </dl>
      </details>
    </div>
  );
}
