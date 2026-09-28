"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, ChartColumn, FileText, Gavel, Search, Settings2 } from "lucide-react";
import { PERSONAS, canAccess } from "@/lib/auth";
import type { CaptureItem } from "@/lib/capture";
import type { SavedDecision } from "@/lib/intelligence-types";
import { companies } from "@/lib/mock-data";
import { initialDeals, type StageId } from "@/lib/pipeline-data";
import { getDealStages, subscribeStore } from "@/lib/store";
import styles from "./reviews.module.css";

const TABS = ["Overview", "Thesis", "Discussion", "Materials", "Activity"] as const;
const ILLUSTRATIVE: Record<StageId, number> = {
  discovered: 15,
  contacted: 30,
  diligence: 55,
  committee: 75,
  invested: 100,
  passed: 0,
};

function formatDate(iso?: string) {
  if (!iso) return "Date not on file";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysSince(iso: string) {
  const start = new Date(`${iso}T00:00:00`);
  return Math.max(0, Math.round((Date.now() - start.getTime()) / 86400000));
}

function amount(round: string) {
  return round.match(/^(\$[\d.]+[KMB]?)/)?.[1] ?? round;
}

export default function CommitteeIndexPage() {
  const [live, setLive] = useState<Record<string, StageId>>({});
  const [selectedId, setSelectedId] = useState("nova-ai");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [help, setHelp] = useState(false);
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [decisions, setDecisions] = useState<SavedDecision[]>([]);

  useEffect(() => {
    const sync = () => setLive(getDealStages());
    sync();
    return subscribeStore(sync);
  }, []);

  useEffect(() => {
    let liveRequest = true;
    fetch("/api/capture")
      .then((response) => response.json())
      .then((data) => { if (liveRequest) setCaptures(data.items ?? []); })
      .catch(() => { if (liveRequest) setCaptures([]); });
    fetch("/api/intelligence")
      .then((response) => response.json())
      .then((data) => { if (liveRequest) setDecisions(data.decisions ?? []); })
      .catch(() => { if (liveRequest) setDecisions([]); });
    return () => { liveRequest = false; };
  }, []);

  const deals = useMemo(
    () => initialDeals.map((deal) => ({ ...deal, stageId: live[deal.companyId] ?? deal.stageId })),
    [live],
  );
  const agenda = deals.filter((deal) => deal.stageId === "committee");
  const upcoming = deals.filter((deal) => deal.stageId === "diligence");
  const invested = deals.filter((deal) => deal.stageId === "invested");
  const passed = deals.filter((deal) => deal.stageId === "passed");
  const selected = deals.find((deal) => deal.companyId === selectedId) ?? agenda[0] ?? deals[0];
  const company = companies.find((item) => item.id === selected.companyId);
  const verdict = decisions.find((item) => item.companyId === selected.companyId && item.verdict !== "undo");
  const notes = captures.filter((item) => item.companyId === selected.companyId);
  const materials = notes.filter((item) => item.kind === "document");
  const discussion = notes.filter((item) => item.kind === "vote" || item.kind === "comment" || item.kind === "meeting");
  const activity = notes.filter((item) => item.kind === "diligence" || item.kind === "document" || item.kind === "task" || item.kind === "comment" || item.kind === "meeting");
  const readers = PERSONAS.filter((person) => canAccess(person, "/committee"));
  const openHref = selected.stageId === "diligence" ? `/diligence/${selected.companyId}` : selected.stageId === "committee" ? `/committee/${selected.companyId}` : `/deal/${selected.companyId}`;
  const openLabel = selected.stageId === "diligence" ? "Open diligence" : selected.stageId === "committee" ? "Open committee" : "Open workspace";

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.identity}>
          <span className={styles.mark}><Gavel size={20} aria-hidden="true" /></span>
          <div>
            <p className={styles.kicker}>Deciding</p>
            <h1>Investment Committee</h1>
          </div>
        </div>
        <button type="button" className={styles.settings} aria-expanded={help} onClick={() => setHelp((value) => !value)}><Settings2 size={15} aria-hidden="true" /> Committee settings</button>
      </header>
      <p className={styles.lead}>Where the senior team votes invest, watch or pass on a deal. INVEST OS keeps the pipeline stage and records a verdict only when someone saves one on the decision page.</p>
      {help && <p className={styles.note}>Agenda and diligence follow the pipeline stage. The percentage on a company is the same illustrative stage marker used on the pipeline, not a forecast. A verdict needs a choice, a rationale, and an owner.</p>}

      <div className={styles.stats}>
        <article className={styles.stat}><i className={styles.blue}><Calendar size={16} /></i><b>{agenda.length}</b><span>On the agenda</span></article>
        <article className={styles.stat}><i className={styles.violet}><Search size={16} /></i><b>{upcoming.length}</b><span>In diligence</span></article>
        <article className={styles.stat}><i className={styles.green}><FileText size={16} /></i><b>{invested.length}</b><span>Invested</span></article>
        <article className={styles.stat}><i className={styles.green}><ChartColumn size={16} /></i><b>{passed.length}</b><span>Passed</span></article>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <h2>On the agenda ({agenda.length})</h2>
          {agenda.length === 0 ? <p className={styles.note}>No deals are at committee stage. They arrive here from the pipeline.</p> : agenda.map((deal) => {
            const record = companies.find((item) => item.id === deal.companyId);
            return (
              <article key={deal.id} className={`${styles.card} ${styles.agenda}`} data-selected={selected.companyId === deal.companyId ? "true" : "false"}>
                <button type="button" className={styles.select} aria-pressed={selected.companyId === deal.companyId} onClick={() => { setSelectedId(deal.companyId); setTab("Overview"); }}>
                  <div className={styles.top}>
                    <span className={styles.logo}><Image src={`/company-marks/${deal.companyId}.svg`} alt="" width={26} height={26} /></span>
                    <div>
                      <h3>{deal.name}</h3>
                      <p className={styles.muted}>{deal.sector} · {deal.roundSize}</p>
                      <p className={styles.muted}>{record?.tagline}</p>
                    </div>
                    <div className={styles.decision}>
                      <span className={styles.score}>{deal.matchScore}% match</span>
                      <b>No verdict recorded</b>
                    </div>
                  </div>
                  <div className={styles.chips}>
                    {(record?.tags ?? []).slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                    {record && <span>{record.geography}</span>}
                  </div>
                </button>
                <div className={styles.facts}>
                  <div><strong>{amount(deal.roundSize)}</strong><span>Round size</span></div>
                  <div><strong>{deal.sector}</strong><span>Sector</span></div>
                  <div><strong>{daysSince(deal.movedAt)} days</strong><span>In this stage since {formatDate(deal.movedAt)}</span></div>
                  <Link className={styles.open} href={`/committee/${deal.companyId}`}>Open committee <ArrowRight size={14} /></Link>
                </div>
              </article>
            );
          })}

          <h2>Coming up — In diligence ({upcoming.length})</h2>
          {upcoming.length === 0 ? <p className={styles.note}>Nothing is in diligence.</p> : (
            <div className={styles.pair}>
              {upcoming.map((deal) => {
                const record = companies.find((item) => item.id === deal.companyId);
                return (
                  <article key={deal.id} className={`${styles.card} ${styles.upcoming}`} data-selected={selected.companyId === deal.companyId ? "true" : "false"}>
                    <button type="button" className={styles.select} aria-pressed={selected.companyId === deal.companyId} onClick={() => { setSelectedId(deal.companyId); setTab("Overview"); }}>
                      <div className={styles.top}>
                        <span className={styles.logo}><Image src={`/company-marks/${deal.companyId}.svg`} alt="" width={26} height={26} /></span>
                        <div className={styles.row}>
                          <div>
                            <h3>{deal.name}</h3>
                            <p className={styles.muted}>{deal.sector} · {deal.roundSize}</p>
                          </div>
                          <span className={styles.badge}>In diligence</span>
                        </div>
                      </div>
                      <p className={styles.muted}>{record?.tagline}</p>
                      <div className={styles.chips}>
                        {(record?.tags ?? []).slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                        {record && <span>{record.geography}</span>}
                      </div>
                    </button>
                    <div className={styles.row}>
                      <span className={styles.muted}>{amount(deal.roundSize)} · {deal.sector} · {daysSince(deal.movedAt)} days in stage</span>
                      <Link className={styles.go} href={`/diligence/${deal.companyId}`} aria-label={`Open diligence for ${deal.name}`}><ArrowRight size={14} /></Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className={styles.side}>
          <section>
            <div className={styles.companyTop}>
              <div className={styles.who}>
                <span className={styles.logo}><Image src={`/company-marks/${selected.companyId}.svg`} alt="" width={26} height={26} /></span>
                <div>
                  <h2>{selected.name}</h2>
                  <p className={styles.muted}>{selected.sector} · {selected.roundSize}</p>
                </div>
              </div>
              <span className={styles.badge}>{selected.stageId === "committee" ? "On the agenda" : selected.stageId === "diligence" ? "In diligence" : selected.stageId}</span>
            </div>
            <div className={styles.tabs} role="tablist">
              {TABS.map((item) => <button key={item} type="button" role="tab" aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}
            </div>
            {tab === "Overview" && (
              <>
                <div className={styles.metrics}>
                  <div><b>{amount(selected.roundSize)}</b><span>Round size</span></div>
                  <div><b>{company?.valuation ?? "—"}</b><span>Valuation on file</span></div>
                  <div><b title="Illustrative marker for this pipeline stage. Not a forecast.">{ILLUSTRATIVE[selected.stageId]}%</b><span>Illustrative</span></div>
                </div>
                <h3>Company record</h3>
                <p>{company?.tagline}</p>
                <Link className={styles.link} href={`/company/${selected.companyId}`}>View full profile <ArrowRight size={14} /></Link>
              </>
            )}
            {tab === "Thesis" && (
              <>
                <h3>Points on the company file</h3>
                <ul>{(company?.bulls ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Risk on file</h3>
                <p>{company?.risks[0]}</p>
              </>
            )}
            {tab === "Discussion" && (
              discussion.length === 0 ? <p>No discussion notes on this deal.</p> : (
                <ul className={styles.activity}>
                  {discussion.slice(0, 6).map((item) => (
                    <li key={item.id}><span className={styles.dot} /><div><strong>{item.meta?.member || item.author}</strong><span>{item.meta?.rationale || item.body}</span><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div></li>
                  ))}
                </ul>
              )
            )}
            {tab === "Materials" && (
              materials.length === 0 ? <p>No materials on file for {selected.name}.</p> : (
                <ul className={styles.activity}>
                  {materials.slice(0, 8).map((item) => (
                    <li key={item.id}><span className={styles.dot} /><div><strong>{item.body}</strong><time dateTime={item.createdAt}>{item.meta?.status ? `${item.meta.status} · ` : ""}{formatDate(item.createdAt)}</time></div></li>
                  ))}
                </ul>
              )
            )}
            {tab === "Activity" && (
              activity.length === 0 ? <p>Moved on {formatDate(selected.movedAt)}. Nothing else is on the deal file.</p> : (
                <ul className={styles.activity}>
                  {activity.slice(0, 6).map((item) => (
                    <li key={item.id}><span className={styles.dot} /><div><strong>{item.body}</strong><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div></li>
                  ))}
                </ul>
              )
            )}
            <div className={styles.verdict}>
              <strong>{verdict ? `Recorded verdict: ${verdict.verdict}` : "No verdict recorded"}</strong>
              <p>{verdict ? verdict.rationale : "Open the decision page when the committee is ready to save invest, watch, or pass."}</p>
              <Link className={styles.link} href={openHref}>{openLabel} <ArrowRight size={14} /></Link>
            </div>
          </section>
          <section>
            <h2>Committee access</h2>
            <ul className={styles.people}>
              {readers.map((person) => (
                <li key={person.id}><span className={styles.avatar} style={{ background: person.color }}>{person.initials}</span><div><strong>{person.name}</strong><span>{person.role}</span></div></li>
              ))}
            </ul>
          </section>
          <section>
            <div className={styles.sideHead}>
              <h2>Recent activity</h2>
              <Link className={styles.link} href={`/deal/${selected.companyId}`}>View all</Link>
            </div>
            {activity.length === 0 ? <p>No file activity for {selected.name}.</p> : (
              <ul className={styles.activity}>
                {activity.slice(0, 4).map((item) => (
                  <li key={item.id}><span className={styles.dot} /><div><strong>{item.body}</strong><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div></li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
