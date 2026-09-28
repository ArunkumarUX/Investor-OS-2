"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Check, CircleCheck, CircleX, Download, FileText } from "lucide-react";
import { downloadCSV } from "@/lib/export";
import type { SavedDecision } from "@/lib/intelligence-types";
import { companies } from "@/lib/mock-data";
import { initialDeals, stages, type StageId } from "@/lib/pipeline-data";
import DealInsights from "../insights/board";
import { getStoreServerSnapshot, getStoreSnapshot, parseSnapshot, subscribeStore } from "@/lib/store";
import styles from "./history.module.css";

const PATH: StageId[] = ["discovered", "contacted", "diligence", "committee", "invested"];
const VIEWS = ["Timeline", "Table", "Insights"] as const;

function formatDate(iso?: string) {
  if (!iso) return "Date not on file";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function monthLabel(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function quarterStart(now = new Date()) {
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
}

function stageName(id: StageId) {
  return stages.find((stage) => stage.id === id)?.label ?? id;
}

function badgeClass(stage: StageId) {
  if (stage === "invested") return styles.ok;
  if (stage === "passed") return styles.stop;
  if (stage === "diligence" || stage === "committee") return styles.wait;
  return styles.neutral;
}

export default function Memory({ initialView = "Timeline" }: { initialView?: (typeof VIEWS)[number] }) {
  const snapshot = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot));
  const [view, setView] = useState<(typeof VIEWS)[number]>(initialView);
  const [range, setRange] = useState("all");
  const [openId, setOpenId] = useState("nova-ai");
  const [saved, setSaved] = useState<SavedDecision[]>([]);

  useEffect(() => {
    let live = true;
    fetch("/api/intelligence")
      .then((response) => response.json())
      .then((data) => { if (live) setSaved(data.decisions ?? []); })
      .catch(() => { if (live) setSaved([]); });
    return () => { live = false; };
  }, []);

  const deals = useMemo(() => initialDeals.map((deal) => ({
    ...deal,
    stageId: snapshot.stages[deal.companyId] ?? deal.stageId,
    company: companies.find((item) => item.id === deal.companyId),
  })), [snapshot.stages]);

  const visible = deals.filter((deal) => {
    if (range !== "quarter") return true;
    return new Date(`${deal.movedAt}T00:00:00`) >= quarterStart();
  }).sort((a, b) => b.movedAt.localeCompare(a.movedAt));

  const invested = visible.filter((deal) => deal.stageId === "invested").length;
  const passed = visible.filter((deal) => deal.stageId === "passed").length;
  const open = visible.length - invested - passed;
  const recorded = saved.filter((item) => item.verdict !== "undo");
  const share = (count: number) => visible.length ? `${Math.round((count / visible.length) * 100)}% of this list` : "None in this list";

  function verdictFor(companyId: string) {
    return recorded.find((item) => item.companyId === companyId) ?? null;
  }

  function exportRows() {
    downloadCSV("decision-history", ["Company", "Sector", "Round", "Stage", "Since", "Verdict"], visible.map((deal) => {
      const verdict = verdictFor(deal.companyId);
      return [deal.name, deal.sector, deal.roundSize, stageName(deal.stageId), deal.movedAt, verdict ? verdict.verdict : "No verdict recorded"];
    }));
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Decision history</h1>
          <p>Keep your judgment in context. Revisit verdicts, confidence, and how each deal moved through the process.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.export} onClick={exportRows}><Download size={15} aria-hidden="true" /> Export history</button>
          <select className={styles.filter} aria-label="Time range" value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="all">All time</option>
            <option value="quarter">This quarter</option>
          </select>
        </div>
      </header>

      <div className={styles.stats}>
        <article className={styles.stat}><i className={styles.slate}><FileText size={16} /></i><b>{visible.length}</b><span>Deals on file{recorded.length ? ` · ${recorded.length} saved verdict${recorded.length === 1 ? "" : "s"}` : " · no saved verdict"}</span></article>
        <article className={styles.stat}><i className={styles.green}><CircleCheck size={16} /></i><b>{invested}</b><span>Invested · {share(invested)}</span></article>
        <article className={styles.stat}><i className={styles.rose}><CircleX size={16} /></i><b>{passed}</b><span>Passed · {share(passed)}</span></article>
        <article className={styles.stat}><i className={styles.amber}><Calendar size={16} /></i><b>{open}</b><span>Still in process · {share(open)}</span></article>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.modes} role="tablist">
            {VIEWS.map((item) => <button key={item} type="button" role="tab" aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
          </div>

          {view === "Timeline" && (
            <div className={styles.timeline}>
              {visible.map((deal, index) => {
                const previous = visible[index - 1];
                const showMonth = !previous || monthLabel(previous.movedAt) !== monthLabel(deal.movedAt);
                const verdict = verdictFor(deal.companyId);
                return (
                  <div key={deal.id}>
                    {showMonth && <p className={styles.month}>{monthLabel(deal.movedAt)}</p>}
                    <article className={styles.item}>
                      <time className={styles.when} dateTime={deal.movedAt}>{formatDate(deal.movedAt)}</time>
                      <div className={styles.rail}><span className={styles.dot} /></div>
                      <div className={styles.card}>
                        <button type="button" className={styles.select} aria-expanded={openId === deal.companyId} onClick={() => setOpenId(openId === deal.companyId ? "" : deal.companyId)}>
                          <span className={styles.who}>
                            <span className={styles.logo}><Image src={`/company-marks/${deal.companyId}.svg`} alt="" width={22} height={22} /></span>
                            <span><h3>{deal.name}</h3><span className={styles.muted}>{deal.sector} · {deal.roundSize}</span></span>
                          </span>
                          <span className={`${styles.badge} ${badgeClass(deal.stageId)}`}>{stageName(deal.stageId)}</span>
                        </button>
                        {openId === deal.companyId && deal.stageId !== "passed" && (
                          <div className={styles.path} aria-label="Stages on file">
                            {PATH.map((stage, step) => {
                              const move = snapshot.history.find((item) => item.companyId === deal.companyId && item.to === stage);
                              const dated = stage === deal.stageId ? deal.movedAt : move?.at;
                              const reached = Boolean(move) && stage !== deal.stageId;
                              return (
                                <div key={stage} className={styles.step} data-current={stage === deal.stageId} data-reached={reached}>
                                  <b>{reached ? <Check size={10} /> : step + 1}</b>
                                  <strong>{stageName(stage)}</strong>
                                  <time dateTime={dated}>{dated ? formatDate(dated) : "Not dated"}</time>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {openId === deal.companyId && (
                          <>
                            <div className={styles.facts}>
                              <div><span>Decision</span><strong>{verdict ? verdict.verdict : "No verdict recorded"}</strong></div>
                              <div><span>Confidence</span><strong>{verdict ? `${verdict.confidence}%` : "Not recorded"}</strong></div>
                              <div><span>Round size</span><strong>{deal.roundSize}</strong></div>
                              <div><span>Owner on file</span><strong>{deal.owner}</strong></div>
                            </div>
                            <p className={styles.rationale}>{verdict?.rationale || (deal.stageId === "passed" ? `Passed on ${formatDate(deal.movedAt)}. Earlier stage dates are not on file.` : "No rationale is saved for this deal. Earlier stage dates are not on file.")}</p>
                            <div className={styles.chips}>
                              {(deal.company?.tags ?? []).slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                              {deal.company && <span>{deal.company.geography}</span>}
                            </div>
                            <Link className={styles.record} href={`/company/${deal.companyId}`}>View full record <ArrowRight size={14} /></Link>
                          </>
                        )}
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}

          {view === "Table" && (
            <div className={styles.tableWrap}>
              <p className={styles.scrollHint}>On a narrow screen, scroll sideways to see owner and actions.</p>
              <table>
                <thead>
                  <tr>
                    <th>Company</th><th>Sector</th><th>Round</th><th>Stage progression</th><th>Decision</th><th>Amount</th><th>Confidence</th><th>Since</th><th>Owner</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((deal) => {
                    const verdict = verdictFor(deal.companyId);
                    const current = PATH.indexOf(deal.stageId);
                    return (
                      <tr key={deal.id}>
                        <td>
                          <Link className={styles.who} href={`/company/${deal.companyId}`}>
                            <span className={styles.logo}><Image src={`/company-marks/${deal.companyId}.svg`} alt="" width={22} height={22} /></span>
                            {deal.name}
                          </Link>
                        </td>
                        <td>{deal.sector}</td>
                        <td>{deal.company?.stage ?? deal.roundSize}</td>
                        <td>
                          <span className={styles.progress} aria-label={stageName(deal.stageId)}>
                            {deal.stageId === "passed" ? <i data-state="passed" /> : PATH.map((stage, index) => {
                              const reached = snapshot.history.some((item) => item.companyId === deal.companyId && item.to === stage);
                              const state = index === current ? "current" : reached ? "done" : "ahead";
                              return <i key={stage} data-state={state} />;
                            })}
                          </span>
                        </td>
                        <td><span className={`${styles.badge} ${badgeClass(deal.stageId)}`}>{verdict ? verdict.verdict : stageName(deal.stageId)}</span></td>
                        <td>{deal.roundSize.split(" ")[0]}</td>
                        <td>{verdict ? `${verdict.confidence}%` : "Not recorded"}</td>
                        <td>{formatDate(deal.movedAt)}</td>
                        <td><span className={styles.lead}><i>{deal.owner}</i></span></td>
                        <td><Link className={styles.open} href={`/company/${deal.companyId}`}>Open</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className={styles.foot}>Showing 1–{visible.length} of {visible.length}</p>
            </div>
          )}

          {view === "Insights" && <DealInsights />}
        </div>
      </div>
    </div>
  );
}
