"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./pipeline.module.css";
import { ArrowUpRight, Clock3, GripVertical, MoveRight } from "lucide-react";
import DealViewToggle from "@/components/DealViewToggle";
import { stages, initialDeals, type Deal, type StageId } from "@/lib/pipeline-data";
import {
  setDealStage,
  subscribeStore,
  getStoreSnapshot,
  getStoreServerSnapshot,
  parseSnapshot,
} from "@/lib/store";

const sampleProbability: Record<StageId, number> = { discovered: 15, contacted: 30, diligence: 55, committee: 75, invested: 100, passed: 0 };
const stageHelp: Record<StageId, string> = {
  discovered: "Assess the opportunity", contacted: "Start the conversation",
  diligence: "Validate the evidence", committee: "Discuss and decide",
  invested: "Support and monitor", passed: "Keep the decision record",
};
function DealCard({ deal, onDragStart, onDragEnd, dragging, onMove }: {
  deal: Deal; onDragStart: () => void; onDragEnd: () => void; dragging: boolean; onMove: (stageId: StageId) => void;
}) {
  const action = deal.stageId === "diligence" ? "Open diligence" : deal.stageId === "committee" ? "Open committee" : "Open workspace";
  const route = deal.stageId === "diligence" ? "diligence" : deal.stageId === "committee" ? "committee" : "deal";
  return <article draggable onDragEnd={onDragEnd} onDragStart={e => {
    e.dataTransfer.setData("text/plain", deal.id); e.dataTransfer.effectAllowed = "move"; onDragStart();
  }} className={styles.card} style={{ opacity: dragging ? .45 : 1 }}>
    <header className={styles.cardHeader}>
      <Image className={styles.companyMark} src={`/company-marks/${deal.companyId}.svg`} alt="" width={22} height={22} draggable={false}/>
      <div><h3><Link href={`/company/${deal.companyId}`}>{deal.name}</Link></h3><p>{deal.sector}</p></div>
      <span className={styles.grip} title="Drag this card to another stage"><GripVertical size={18}/><span className="sr-only">Drag to move</span></span>
    </header>
    <dl className={styles.metrics}>
      <div><dt>Round</dt><dd>{deal.roundSize}</dd></div>
      <div><dt title="Illustrative likelihood of reaching Invested, based on stage; not a predictive model.">Likelihood</dt><dd className={styles.score}>{sampleProbability[deal.stageId]}<span>%</span></dd></div>
    </dl>
    <meter className={styles.bar} min={0} max={100} value={sampleProbability[deal.stageId]} aria-label={`Sample investment probability for ${deal.name}`}/>
    <p className={styles.note}>{deal.note}</p>
    <div className={styles.meta}><span className={deal.daysInStage > 7 && !["invested", "passed"].includes(deal.stageId) ? styles.aging : undefined}><Clock3 size={12}/>{deal.daysInStage}d in stage</span><span title={`Owner: ${deal.owner}`}><b>{deal.owner}</b></span></div>
    <div className={styles.footer}>
    <label className={styles.move}>Move
      <select aria-label={`Move ${deal.name}`} value={deal.stageId} onChange={(event) => onMove(event.target.value as StageId)}>
        {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
      </select>
    </label>
    <Link className={`button secondary ${styles.open}`} href={`/${route}/${deal.companyId}`}>{action}<ArrowUpRight size={15}/></Link></div>
  </article>;
}

export default function PipelinePage() {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);
  const [moveMessage, setMoveMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Persisted stages + committee decisions, read straight from the store.
  // useSyncExternalStore keeps this hydration-safe (no mount setState).
  const snapshot = useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot);
  const { deals, history } = useMemo(() => {
    const { stages, history } = parseSnapshot(snapshot);
    // newest move per company drives the "moved" timestamp shown on cards
    const lastMove = new Map<string, string>();
    for (const m of history) if (!lastMove.has(m.companyId)) lastMove.set(m.companyId, m.at);
    const deals = initialDeals.map((d) => {
      const stageId = stages[d.companyId] ?? d.stageId;

      const movedAtIso = lastMove.get(d.companyId);
      if (stageId === d.stageId && !movedAtIso) return d;
      // Moved this session -> fresh in its new stage
      return {
        ...d,
        stageId,
        movedAt: movedAtIso ? movedAtIso.slice(0, 10) : d.movedAt,
        daysInStage: movedAtIso ? 0 : d.daysInStage,
      };
    });
    return { deals, history };
  }, [snapshot]);

  const byStage = useMemo(() => {
    const map: Record<StageId, Deal[]> = {
      discovered: [], contacted: [], diligence: [], committee: [], invested: [], passed: [],
    };
    deals.forEach((d) => map[d.stageId].push(d));
    (Object.keys(map) as StageId[]).forEach((k) =>
      map[k].sort((a, b) => b.matchScore - a.matchScore)
    );
    return map;
  }, [deals]);

  const activeCount = deals.filter(
    (d) => !["invested", "passed"].includes(d.stageId)
  ).length;

  async function moveDeal(deal: Deal, stageId: StageId) {
    if (deal.stageId === stageId) return;
    try {
      await setDealStage(deal.companyId, stageId, { companyName: deal.name, from: deal.stageId, source: "drag" });
      setMoveMessage(`${deal.name} moved to ${stages.find(s => s.id === stageId)?.label}. Saved on this server.`);
    } catch (reason) {
      setMoveMessage(reason instanceof Error ? reason.message : "The stage could not be saved.");
    }
  }

  function handleDrop(stageId: StageId, e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const deal = deals.find((d) => d.id === id);
    if (deal) void moveDeal(deal, stageId);
    setDragId(null);
    setOverStage(null);
  }

  const status = dragId
    ? `Moving ${deals.find((d) => d.id === dragId)?.name}. Release over a stage to save.`
    : moveMessage;

  return (
    <div className={`${styles.stage} fade-in`}>
      <header className={styles.pageHead}>
        <div className={styles.titleBlock}>
          <h1>Deal pipeline</h1>
          <p>Drag a card into a stage to move the deal.</p>
        </div>
        <div className={styles.toolbar}>
          <DealViewToggle />
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className={styles.historyBtn}
            aria-pressed={showHistory}
          >
            Stage history{history.length > 0 ? ` (${history.length})` : ""}
          </button>
          <dl className={styles.stats}>
            <div>
              <dt>Active</dt>
              <dd>{activeCount}</dd>
            </div>
            <div>
              <dt>Committee</dt>
              <dd>{deals.filter((d) => d.stageId === "committee").length}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* Audit log drawer */}
      {showHistory && (
        <div className="glass rounded-xl p-5 mb-5 fade-in">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-subtle)" }}>
            Stage change history
          </div>
          {history.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              No moves recorded yet. Drag a card, use Move, or record a committee decision.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {history.map((m, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="tnum flex-shrink-0" style={{ color: "var(--text-subtle)" }}>
                    {new Date(m.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{m.companyName}</span>
                  <span style={{ color: "var(--text-muted)" }}>{m.from} → {m.to}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                    style={{
                      background: m.source === "committee" ? "rgba(183,121,31,0.12)" : "rgba(0,113,227,0.12)",
                      color: m.source === "committee" ? "var(--accent-gold)" : "var(--accent-blue-light)",
                    }}
                  >
                    {m.source}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className={styles.feedback} role="status" aria-live="polite">{status}</p>
      {/* Board */}
      <div className={styles.scroll}><div role="list" aria-label="Deal pipeline board" className={styles.board}>
        {stages.map((stage) => {
          const list = byStage[stage.id];
          const isOver = overStage === stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverStage(stage.id);
              }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverStage(s => s === stage.id ? null : s); }}
              onDrop={(e) => handleDrop(stage.id, e)}
              role="listitem"
              aria-label={`${stage.label} column, ${list.length} deals`}
              className={`${styles.column} ${dragId ? styles.ready : ""} ${isOver ? styles.target : ""}`}
              style={{
                background: isOver ? "#e7eeea" : "transparent",
                border: `1px solid ${isOver ? "#8ba79a" : "transparent"}`,
              }}
            >
              <header className={styles.columnHeader}>
                <div><span className={styles.dot} style={{background: stage.color}}/><h2>{stage.label}</h2><span className={styles.count}>{list.length}</span></div>
                <p>{stageHelp[stage.id]}</p>
              </header>
              <div className={styles.stack}>
                {dragId && <div className={styles.dropHint}><MoveRight size={14}/>{isOver ? `Release to move to ${stage.label}` : `Drop into ${stage.label}`}</div>}
                {list.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    dragging={dragId === deal.id}
                    onDragStart={() => setDragId(deal.id)}
                    onDragEnd={() => { setDragId(null); setOverStage(null); }}
                    onMove={(stageId) => void moveDeal(deal, stageId)}
                  />
                ))}
                {list.length === 0 && (
                  <div className={styles.empty}>Drag a deal here to get started.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
