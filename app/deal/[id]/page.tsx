"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter, notFound } from "next/navigation";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, CircleDollarSign, Clock, Download, FileText, Flag, Pencil, Share2, Upload, Users } from "lucide-react";
import { downloadText } from "@/lib/export";
import { companies } from "@/lib/mock-data";
import { getAnalysis } from "@/lib/ai-content";
import {
  CORE_DOCS,
  computeCompleteness,
  completenessLabel,
  computeWorkflow,
  type CaptureItem,
  type CaptureKind,
  type ChecklistRow,
  type WorkflowState,
} from "@/lib/capture";
import { addCapture, fetchCaptures } from "@/lib/api-client";

import VideoEvidence from "@/components/VideoEvidence";
import {
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  CaptureCard,
  EmptyState,
  useCaptureMutations,
  kindMeta,
  fieldStyle,
} from "@/components/CaptureUI";
import styles from "../deal.module.css";

/* ------------------------------------------------------------------ */
/* Deal Workspace — the single capture hub that drives a deal to 100   */
/* ------------------------------------------------------------------ */

type Company = (typeof companies)[number];
type Mut = ReturnType<typeof useCaptureMutations>;
type TabId = "overview" | "pitch" | "qa" | "docs" | "videos" | "meetings" | "notes" | "tasks" | "votes";
type Verdict = "invest" | "watch" | "reject";

const TABS: { id: TabId; label: string; icon: string; kinds: CaptureKind[] }[] = [
  { id: "overview", label: "Overview", icon: "🎯", kinds: [] },
  { id: "pitch", label: "Pitch", icon: "🎤", kinds: ["pitch"] },
  { id: "qa", label: "Founder Q&A", icon: "❓", kinds: ["question"] },
  { id: "docs", label: "Data Room", icon: "📄", kinds: ["document"] },
  { id: "videos", label: "Videos", icon: "🎬", kinds: ["video"] },
  { id: "meetings", label: "Meetings", icon: "🗓️", kinds: ["meeting"] },
  { id: "notes", label: "Team Notes", icon: "💬", kinds: ["comment"] },
  { id: "tasks", label: "Tasks", icon: "☑️", kinds: ["task"] },
  { id: "votes", label: "IC Votes", icon: "🗳️", kinds: ["vote", "decision"] },
];

// Which tab resolves each checklist row
const ROW_TAB: Record<string, TabId | "diligence"> = {
  deck: "pitch",
  "pitch-summary": "pitch",
  rubric: "pitch",
  questions: "qa",
  answers: "qa",
  docs: "docs",
  meeting: "meetings",
  comments: "notes",
  diligence: "diligence",
  tasks: "tasks",
  votes: "votes",
  decision: "votes",
};

const CAPTURE_GROUPS: { label: string; tabs: TabId[] }[] = [
  { label: "Summary", tabs: ["overview"] },
  { label: "Pitch", tabs: ["pitch"] },
  { label: "Evidence", tabs: ["docs", "videos", "qa"] },
  { label: "Team", tabs: ["notes", "meetings", "tasks", "votes"] },
];

// Entry tab for a workflow stage (its first checklist row's tab).
const STAGE_ENTRY_TAB: Record<string, TabId> = {
  source: "pitch",
  screen: "pitch",
  diligence: "qa",
  committee: "notes",
  decision: "votes",
};

const VERDICT_META: Record<Verdict, { label: string; color: string; icon: string }> = {
  invest: { label: "Invest", color: "var(--accent-green)", icon: "✅" },
  watch: { label: "Watch", color: "var(--accent-gold)", icon: "👀" },
  reject: { label: "Pass", color: "var(--accent-red)", icon: "✕" },
};

function fmtDate(iso: string, withTime = true) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function mark(name: string) {
  return name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function FounderFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState("");
  return (
    <figure className={styles.film}>
      <div className={styles.screen}>
        <video
          ref={video}
          poster="/films/founder-sample.jpg"
          src="/films/founder-sample.mp4"
          playsInline
          preload="metadata"
          controls={playing}
          aria-label="Sample film of a founding team in conversation"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={() => {
            const seconds = video.current?.duration ?? 0;
            if (!seconds) return;
            const minutes = Math.floor(seconds / 60);
            const rest = Math.floor(seconds % 60);
            setDuration(`${minutes}:${String(rest).padStart(2, "0")}`);
          }}
        />
        {!playing && (
          <button type="button" className={styles.play} aria-label="Play founder film" onClick={() => void video.current?.play()}>
            <span />
          </button>
        )}
        {!playing && (
          <figcaption className={styles.caption}>
            <span><strong>Sample film</strong><br />A founding conversation. Not a recording of this team.</span>
            {duration && <span>{duration}</span>}
          </figcaption>
        )}
      </div>
    </figure>
  );
}

function scoreColor(score: number) {
  if (score >= 95) return "#1E9E52";
  if (score >= 75) return "#42A5FF";
  if (score >= 50) return "#B7791F";
  return "#C2410C";
}

/* ---------------------------- author ------------------------------ */
const AUTHOR_KEY = "ios_author";
const authorListeners = new Set<() => void>();
function readAuthor(): string {
  try {
    return window.localStorage.getItem(AUTHOR_KEY) ?? "You";
  } catch {
    return "You";
  }
}
function useAuthor() {
  const rawAuthor = useSyncExternalStore(
    (cb) => {
      authorListeners.add(cb);
      return () => authorListeners.delete(cb);
    },
    readAuthor,
    () => "You"
  );
  const setAuthor = (v: string) => {
    try {
      window.localStorage.setItem(AUTHOR_KEY, v);
    } catch {
      /* storage unavailable */
    }
    authorListeners.forEach((l) => l());
  };
  return { author: rawAuthor.trim() || "You", rawAuthor, setAuthor };
}

/* ------------------------- tab via URL hash ------------------------ */
function readTab(): TabId {
  const h = window.location.hash.replace("#", "") as TabId;
  return TABS.some((t) => t.id === h) ? h : "overview";
}
function useHashTab(): [TabId, (t: TabId) => void] {
  const tab = useSyncExternalStore(
    (cb) => {
      window.addEventListener("hashchange", cb);
      return () => window.removeEventListener("hashchange", cb);
    },
    readTab,
    () => "overview" as TabId
  );
  const go = (t: TabId) => {
    if (window.location.hash !== `#${t}`) {
      // replaceState keeps tab switches out of browser history
      window.history.replaceState(null, "", `#${t}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  };
  return [tab, go];
}

function SectionTitle({ icon, title, right }: { icon: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span aria-hidden="true">{icon}</span>
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
      </div>
      {right}
    </div>
  );
}

function ProgressBar({ value, max, color = "var(--accent-blue)" }: { value: number; max: number; color?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-surface-3)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 0.5s" }} />
    </div>
  );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */
export default function DealWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const company = companies.find((c) => c.id === id);

  const [items, setItems] = useState<CaptureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, go] = useHashTab();
  const router = useRouter();
  const { author, rawAuthor, setAuthor } = useAuthor();

  const refresh = useCallback(async () => {
    try {
      setItems(await fetchCaptures(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetchCaptures(id)
      .then((next) => {
        if (!cancelled) {
          setItems(next);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const mut = useCaptureMutations(() => void refresh());
  const completeness = useMemo(() => computeCompleteness(items), [items]);
  const workflow = useMemo(() => computeWorkflow(completeness), [completeness]);
  const activeGroup = CAPTURE_GROUPS.find((group) => group.tabs.includes(tab))!;

  if (!company) notFound();
  const c = company!;
  const score = completeness.score;
  const nextRow = completeness.rows.find((r) => !r.done);

  return (
    <div className={styles.wrap}>
      {/* Save-error banner — honest feedback on failed writes */}
      {mut.lastError && (
        <div
          className="rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3 text-sm fade-in"
          style={{ background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.3)", color: "var(--accent-red)" }}
          role="alert"
        >
          <span>⚠ {mut.lastError}</span>
          <button onClick={mut.clearError} aria-label="Dismiss error" className="text-xs px-2 py-1 rounded hover:opacity-70" style={{ color: "var(--accent-red)" }}>✕</button>
        </div>
      )}
      <div className={styles.toolbar}>
        <button type="button" onClick={() => void navigator.clipboard.writeText(window.location.href)}><Share2 size={14} aria-hidden="true" />Share</button>
        <button type="button" onClick={() => downloadText(`${c.id}-workspace.txt`, `${c.name}\n${c.tagline}\nRound ${c.lastRound}\nValuation ${c.valuation}\nCapture score ${score}/100`)}><Download size={14} aria-hidden="true" />Export PDF</button>
        <Link className={styles.go} href={`/diligence/${c.id}?play=1`} title="Plays the walkthrough. It does not save a review.">Preview diligence <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      <section className={styles.sheet}>
        <div className={styles.identity}>
          <p className={styles.kicker}>{c.stage} · {c.sector.replaceAll("/", " / ")} · {c.geography}</p>
          <h1 className={styles.title}>{c.name}</h1>
          <p className={styles.tagline}>{c.tagline}</p>
          <ul className={styles.chips}>
            <li><Calendar size={15} aria-hidden="true" /><span>Round</span><b>{c.lastRound}</b></li>
            <li><CircleDollarSign size={15} aria-hidden="true" /><span>Valuation</span><b>{c.valuation}</b></li>
            <li><Users size={15} aria-hidden="true" /><span>Employees</span><b>{c.employees}</b></li>
            <li><Flag size={15} aria-hidden="true" /><span>Founded</span><b>{c.founded}</b></li>
          </ul>
          <div className={styles.people}>
            {c.founders.map((founder) => (
              <div key={founder.name} className={styles.person}>
                <span className={styles.avatar} aria-hidden="true">{mark(founder.name)}</span>
                <div>
                  <strong>{founder.name}<em>{founder.role}</em></strong>
                  <small>{founder.bg}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
        <FounderFilm />
        <div className={styles.scorePane}>
          <div className={styles.scoreHead}>
            <div className={styles.ring} style={{ ["--p" as string]: `${score * 3.6}deg` }}><b>{score}</b></div>
            <div>
              <em>{completenessLabel(score) === "Early" ? "Early stage" : completenessLabel(score)}</em>
              <p>{score} of 100 points</p>
            </div>
          </div>
          <span className={styles.meterSlim}><i style={{ width: `${Math.max(score, 4)}%` }} /></span>
          {nextRow ? (
            <button type="button" className={styles.go} onClick={() => {
              const target = ROW_TAB[nextRow.key];
              if (target === "diligence") router.push(`/diligence/${c.id}?play=1`);
              else go(target);
            }}>{nextRow.label} +{nextRow.points}</button>
          ) : <span className={styles.done}>Every capture is complete</span>}
          <button type="button" className={styles.ghostBtn} onClick={() => go("docs")}><Upload size={14} aria-hidden="true" />Capture new document</button>
        </div>
      </section>

      <div className={styles.switch} aria-label="Workspace sections">
        {CAPTURE_GROUPS.map((group) => (
          <button key={group.label} type="button" data-on={String(activeGroup === group)} onClick={() => go(group.tabs[0])}>{group.label}</button>
        ))}
      </div>
      {activeGroup.tabs.length > 1 && (
        <select aria-label={`${activeGroup.label} view`} value={tab} onChange={(event) => go(event.target.value as TabId)} className="px-3 py-2 mb-3 rounded-lg text-sm border" style={{ borderColor: "var(--border)", background: "#fff" }}>
          {activeGroup.tabs.map((item) => <option key={item} value={item}>{TABS.find((entry) => entry.id === item)!.label}</option>)}
        </select>
      )}

      {error && (
        <div className="rounded-xl p-4 mb-5 text-sm" style={{ background: "rgba(229,72,77,0.1)", color: "var(--accent-red)" }}>
          Couldn’t load captures ({error}).{" "}
          <button className="underline" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-xl p-10 text-center text-sm shimmer" style={{ color: "var(--text-muted)" }}>
          Loading workspace…
        </div>
      ) : (
        <div>
          {tab === "overview" && <OverviewTab c={c} items={items} rows={completeness.rows} go={go} mut={mut} workflow={workflow} />}
          {tab === "pitch" && <PitchTab c={c} items={items} author={author} mut={mut} />}
          {tab === "qa" && <QATab c={c} items={items} author={author} mut={mut} />}
          {tab === "docs" && <DocsTab c={c} items={items} author={author} mut={mut} refresh={refresh} />}
          {tab === "videos" && <VideoEvidence companyId={c.id} items={items} author={author} mut={mut} />}
          {tab === "meetings" && <MeetingsTab c={c} items={items} author={author} mut={mut} refresh={refresh} />}
          {tab === "notes" && <NotesTab c={c} items={items} author={author} mut={mut} />}
          {tab === "tasks" && <TasksTab c={c} items={items} author={author} mut={mut} />}
          {tab === "votes" && <VotesTab c={c} items={items} author={author} mut={mut} />}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Overview                                                            */
/* ================================================================== */
function Stepper({ workflow, go }: { workflow: WorkflowState; go: (t: TabId) => void }) {
  return (
    <div className="glass rounded-xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle icon="" title="Deal workflow" />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {workflow.currentIndex === -1 ? "All stages complete" : `Stage ${workflow.currentIndex + 1} of ${workflow.stages.length}`}
        </span>
      </div>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {workflow.stages.map((st, i) => {
          const color = st.done ? "var(--accent-green)" : st.current ? "var(--accent-blue)" : "var(--text-subtle)";
          const bg = st.done ? "rgba(20,122,62,0.1)" : st.current ? "#eef0ff" : "var(--bg-surface-2)";
          return (
            <div key={st.id} className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => go(STAGE_ENTRY_TAB[st.id])}
                title={st.label}
                className="flex items-center gap-2.5 px-3 py-2 rounded-full text-left transition-all disabled:cursor-not-allowed"
                style={{ background: bg, border: `1px solid ${st.current ? "var(--accent-blue)" : "var(--border)"}`, opacity: 1 }}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: st.done ? "var(--accent-green)" : st.current ? "var(--accent-blue)" : "var(--bg-surface-3)", color: st.done || st.current ? "#fff" : "var(--text-subtle)" }}>
                  {st.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold" style={{ color: st.locked ? "var(--text-subtle)" : "var(--text-primary)" }}>{st.short}</span>
                  <span className="block text-[10px] tnum" style={{ color }}>{st.earned}/{st.pts} pts</span>
                </span>
              </button>
              {i < workflow.stages.length - 1 && (
                <span className="w-5 h-px flex-shrink-0" style={{ background: st.done ? "var(--accent-green)" : "var(--border)" }} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewTab({
  c,
  items,
  rows,
  go,
  mut,
  workflow,
}: {
  c: Company;
  items: CaptureItem[];
  rows: ChecklistRow[];
  go: (t: TabId) => void;
  mut: Mut;
  workflow: WorkflowState;
}) {
  const router = useRouter();
  const earned = rows.filter((r) => r.done).reduce((n, r) => n + r.points, 0);
  const recent = items.slice(0, 12);
  const [showActivity, setShowActivity] = useState(false);
  const activity = showActivity ? recent : recent.slice(0, 2);

  const openRow = (key: string) => {
    const target = ROW_TAB[key];
    if (target === "diligence") router.push(`/diligence/${c.id}?play=1`);
    else if (key === "decision") router.push(`/committee/${c.id}`);
    else go(target);
  };

  return (
    <div>
      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <div className={styles.panelTitle}>
            <span className={styles.panelIcon} aria-hidden="true"><FileText size={15} /></span>
            <div><h2>Deal workflow</h2><p className={styles.sub}>Track progress through the investment process.</p></div>
          </div>
          <span className={styles.stageCount}>
            {workflow.currentIndex === -1 ? "All stages complete" : `Stage ${workflow.currentIndex + 1} of ${workflow.stages.length}`}
            <span className={styles.pager} aria-hidden="true"><ChevronLeft size={14} /><ChevronRight size={14} /></span>
          </span>
        </header>
        <div className={styles.stages}>
          {workflow.stages.map((stage, index) => (
            <button key={stage.id} type="button" className={styles.stagePill} data-on={String(stage.current)} onClick={() => go(STAGE_ENTRY_TAB[stage.id])}>
              <i>{index + 1}</i>
              <div><strong>{stage.short}</strong><span>{stage.earned}/{stage.pts} pts</span><u /></div>
            </button>
          ))}
        </div>
      </section>
      <div className={styles.split} style={{ marginTop: 12 }}>
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <div className={styles.panelTitle}>
              <span className={styles.panelIcon} aria-hidden="true"><FileText size={15} /></span>
              <div><h2>Road to 100</h2><p className={styles.sub}>Complete key diligence items to build a 100-point investment record.</p></div>
            </div>
            <div className={styles.progressNote}>
              <span>{rows.filter((row) => row.done).length} / {rows.length} completed · {earned} pts</span>
              <span className={styles.meterSlim}><i style={{ width: `${Math.max(earned, 4)}%` }} /></span>
            </div>
          </header>
          <ul className={styles.rows}>
            {rows.map((row) => (
              <li key={row.key}>
                <button type="button" onClick={() => openRow(row.key)}>
                  <span className={styles.check} data-on={String(row.done)}>{row.done ? "✓" : ""}</span>
                  <span className={styles.file} data-on={String(row.done)}><FileText size={14} /></span>
                  <span><strong>{row.label}</strong><small>{row.detail}</small></span>
                  <span className={styles.pts}>+{row.points}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <div className={styles.stack}>
          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <div className={styles.panelTitle}><span className={styles.panelIcon} aria-hidden="true"><Clock size={15} /></span><h2>Recent activity</h2></div>
              {recent.length > 2 && <button type="button" className={styles.textBtn} onClick={() => setShowActivity((open) => !open)}>{showActivity ? "Show less" : "View all →"}</button>}
            </header>
            {activity.length === 0 ? <p className={styles.sub}>Nothing captured yet.</p> : (
              <ul className={styles.activity}>
                {activity.map((item) => {
                  const meta = kindMeta(item.kind);
                  return (
                    <li key={item.id}>
                      <span className={styles.file} data-tone="activity"><FileText size={14} /></span>
                      <div>
                        <p className={styles.activityMeta}><b>{meta.label}</b> · {item.author} · {fmtDate(item.createdAt)}</p>
                        <p className={styles.activityBody}>{item.body || item.meta?.summary || "Captured"}</p>
                      </div>
                      <button type="button" className={styles.dismiss} aria-label={`Delete ${meta.label}`} onClick={() => mut.remove(item.id)}>×</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <div className={styles.panelTitle}><span className={styles.panelIcon} aria-hidden="true"><FileText size={15} /></span><h2>Key details</h2></div>
              <button type="button" className={styles.ghostBtn} onClick={() => go("pitch")}><Pencil size={13} aria-hidden="true" />Edit</button>
            </header>
            <div className={styles.details}>
              <div><span>Round</span><b>{c.lastRound}</b></div>
              <div><span>Valuation</span><b>{c.valuation}</b></div>
              <div><span>Employees</span><b>{c.employees}</b></div>
              <div><span>Founded</span><b>{c.founded}</b></div>
              <div><span>Headquarters</span><b>{c.geography}</b></div>
            </div>
          </section>
          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <div className={styles.panelTitle}><span className={styles.panelIcon} aria-hidden="true"><Users size={15} /></span><h2>Team</h2></div>
              <button type="button" className={styles.textBtn} onClick={() => go("notes")}>View team →</button>
            </header>
            <div className={`${styles.people} ${styles.teamList}`}>
              {c.founders.map((founder) => (
                <div key={founder.name} className={styles.person}>
                  <span className={styles.avatar}>{mark(founder.name)}</span>
                  <div><strong>{founder.name}<em>{founder.role}</em></strong><small>{founder.bg}</small></div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Pitch                                                               */
/* ================================================================== */
const RUBRIC = ["team", "product", "market", "traction", "timing"] as const;
type Scores = Record<(typeof RUBRIC)[number], number>;
const EMPTY_SCORES: Scores = { team: 0, product: 0, market: 0, traction: 0, timing: 0 };

function PitchTab(props: { c: Company; items: CaptureItem[]; author: string; mut: Mut }) {
  const pitch = props.items.find((i) => i.kind === "pitch");
  // Keyed so the form re-initialises when the pitch record is first created
  return <PitchForm key={pitch?.id ?? "new"} {...props} pitch={pitch} />;
}

function PitchForm({ c, author, mut, pitch }: { c: Company; author: string; mut: Mut; pitch?: CaptureItem }) {
  const m0 = pitch?.meta ?? {};
  const [form, setForm] = useState({
    deckUrl: m0.deckUrl ?? "",
    videoUrl: m0.videoUrl ?? "",
    askAmount: m0.askAmount ?? "",
    valuation: m0.valuation ?? "",
    summary: m0.summary ?? pitch?.body ?? "",
    founderNotes: m0.founderNotes ?? "",
  });
  const [scores, setScores] = useState<Scores>({ ...EMPTY_SCORES, ...(m0.scores ?? {}) });
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const scored = RUBRIC.filter((k) => scores[k] > 0);
  const avg = scored.length ? scored.reduce((n, k) => n + scores[k], 0) / scored.length : 0;

  const save = async () => {
    const meta = { ...form, scores };
    try {
      if (pitch) await mut.patch(pitch.id, { body: form.summary, meta });
      else await mut.add({ companyId: c.id, kind: "pitch", body: form.summary, author, meta });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="glass rounded-xl p-5 lg:col-span-3 space-y-4">
        <SectionTitle icon="🎤" title="Pitch capture" right={pitch && <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>by {pitch.author} · {fmtDate(pitch.createdAt)}</span>} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput label="Deck link" value={form.deckUrl} onChange={set("deckUrl")} placeholder="https://docsend.com/…" />
          <TextInput label="Pitch recording" value={form.videoUrl} onChange={set("videoUrl")} placeholder="Loom / Zoom recording URL" />
          <TextInput label="Raise" value={form.askAmount} onChange={set("askAmount")} placeholder="e.g. $15M Series B" />
          <TextInput label="Pre-money valuation" value={form.valuation} onChange={set("valuation")} placeholder={`last: ${c.valuation}`} />
        </div>
        <TextArea label="Pitch summary (in your words)" value={form.summary} onChange={set("summary")} rows={4} placeholder="What they do, why now, why this team, what the money buys…" />
        <TextArea label="Founder impressions" value={form.founderNotes} onChange={set("founderNotes")} rows={3} placeholder="How did they handle pushback? Clarity, candour, command of numbers…" />
        <div className="flex items-center gap-3">
          <PrimaryButton onClick={save} disabled={mut.busy}>
            {pitch ? "Update pitch" : "Save pitch"}
          </PrimaryButton>
          {saved && !mut.busy && (
            <span className="text-xs" style={{ color: "var(--accent-green)" }}>
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-5 lg:col-span-2">
        <SectionTitle
          icon="📐"
          title="Scoring rubric"
          right={
            <span className="text-sm font-bold tnum" style={{ color: avg ? scoreColor(avg * 10) : "var(--text-subtle)" }}>
              {avg ? avg.toFixed(1) : "–"}/10
            </span>
          }
        />
        <div className="space-y-4">
          {RUBRIC.map((k) => (
            <label key={k} className="block">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="capitalize" style={{ color: "var(--text-muted)" }}>
                  {k}
                </span>
                <span className="font-semibold tnum" style={{ color: scores[k] ? "var(--text-primary)" : "var(--text-subtle)" }}>
                  {scores[k] || "–"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={scores[k]}
                onChange={(e) => {
                  setSaved(false);
                  setScores((s) => ({ ...s, [k]: Number(e.target.value) }));
                }}
                className="w-full accent-[#0071E3]"
                aria-label={`${k} score`}
              />
            </label>
          ))}
        </div>
        <p className="text-[11px] mt-4" style={{ color: "var(--text-subtle)" }}>
          0 = not scored. Scores save with the pitch.
        </p>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Founder Q&A                                                         */
/* ================================================================== */
function QATab({ c, items, author, mut }: { c: Company; items: CaptureItem[]; author: string; mut: Mut }) {
  const [q, setQ] = useState("");
  const questions = items.filter((i) => i.kind === "question");
  const isAnswered = (i: CaptureItem) => i.meta?.status === "answered" || Boolean(i.meta?.answer?.trim());
  const open = questions.filter((i) => !isAnswered(i));
  const answered = questions.filter(isAnswered);
  const asked = new Set(questions.map((i) => i.body.trim().toLowerCase()));
  const suggestions = getAnalysis(c).questions.filter((s) => !asked.has(s.trim().toLowerCase())).slice(0, 4);

  const ask = (body: string) =>
    mut.add({ companyId: c.id, kind: "question", body: body.trim(), author, meta: { status: "open" } });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 space-y-3">
        <div className="glass rounded-xl p-5 space-y-3">
          <SectionTitle icon="❓" title="Ask the founders" right={<span className="text-xs tnum" style={{ color: "var(--text-muted)" }}>{answered.length}/{questions.length} answered</span>} />
          <TextArea value={q} onChange={setQ} rows={2} placeholder="e.g. What’s gross margin after inference costs at 10× current volume?" />
          <PrimaryButton
            disabled={!q.trim() || mut.busy}
            onClick={async () => {
              await ask(q);
              setQ("");
            }}
          >
            Add question
          </PrimaryButton>
        </div>

        {questions.length === 0 && <EmptyState icon="❓" title="No questions yet" hint="Ask at least 3 and capture 2 founder answers (+20 pts)." />}
        {[...open, ...answered].map((item) => (
          <CaptureCard key={item.id} item={item} onChange={() => {}} onDelete={() => mut.remove(item.id)}>
            <AnswerBox item={item} mut={mut} />
          </CaptureCard>
        ))}
      </div>

      <div className="glass rounded-xl p-5 lg:col-span-2 h-fit">
        <SectionTitle icon="🤖" title="Suggested by DD agents" />
        {suggestions.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            All suggested questions have been asked.
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={mut.busy}
                className="w-full text-left text-xs p-3 rounded-full transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                <span style={{ color: "var(--accent-blue-light)" }}>+ </span>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerBox({ item, mut }: { item: CaptureItem; mut: Mut }) {
  const existing = item.meta?.answer ?? "";
  const [editing, setEditing] = useState(!existing);
  const [text, setText] = useState(existing);

  if (existing && !editing) {
    return (
      <div className="rounded-lg p-3 mt-1" style={{ background: "rgba(30,158,82,0.06)", border: "1px solid rgba(30,158,82,0.18)" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent-green)" }}>
            💡 Founder answer{item.meta?.answeredAt ? ` · ${fmtDate(item.meta.answeredAt)}` : ""}
          </span>
          <button className="text-[11px] hover:opacity-80" style={{ color: "var(--text-subtle)" }} onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
          {existing}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2 mt-1">
      <TextArea value={text} onChange={setText} rows={2} placeholder="Capture the founder’s answer…" />
      <div className="flex gap-2">
        <PrimaryButton
          tone="green"
          disabled={!text.trim() || mut.busy}
          onClick={async () => {
            await mut.patch(item.id, { meta: { status: "answered", answer: text.trim(), answeredAt: new Date().toISOString() } });
            setEditing(false);
          }}
        >
          Save answer
        </PrimaryButton>
        {existing && (
          <PrimaryButton tone="ghost" onClick={() => { setText(existing); setEditing(false); }}>
            Cancel
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Data room                                                           */
/* ================================================================== */
const DOC_STATUSES = ["not tracked", "requested", "received", "reviewed", "missing"] as const;
const DOC_COLOR: Record<string, string> = {
  "not tracked": "var(--text-subtle)",
  requested: "var(--accent-gold)",
  received: "var(--accent-blue-light)",
  reviewed: "var(--accent-green)",
  missing: "var(--accent-red)",
};

function DocsTab({
  c,
  items,
  author,
  mut,
  refresh,
}: {
  c: Company;
  items: CaptureItem[];
  author: string;
  mut: Mut;
  refresh: () => Promise<void>;
}) {
  const docs = items.filter((i) => i.kind === "document");
  const [custom, setCustom] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const find = (name: string) => docs.find((d) => d.body.trim().toLowerCase() === name.toLowerCase());
  const customDocs = docs.filter((d) => !CORE_DOCS.some((n) => n.toLowerCase() === d.body.trim().toLowerCase()));
  const coreIn = CORE_DOCS.filter((n) => ["received", "reviewed"].includes(String(find(n)?.meta?.status ?? ""))).length;
  const untracked = CORE_DOCS.filter((n) => !find(n));

  const setStatus = (name: string, doc: CaptureItem | undefined, status: string) => {
    if (status === "not tracked") {
      if (doc) void mut.remove(doc.id);
      return;
    }
    if (doc) void mut.patch(doc.id, { meta: { status } });
    else void mut.add({ companyId: c.id, kind: "document", body: name, author, meta: { status } });
  };

  const requestAll = async () => {
    setBulkBusy(true);
    try {
      await Promise.all(
        untracked.map((n) => addCapture({ companyId: c.id, kind: "document", body: n, author, meta: { status: "requested" } }))
      );
    } finally {
      await refresh();
      setBulkBusy(false);
    }
  };

  const Row = ({ name, doc, core }: { name: string; doc?: CaptureItem; core: boolean }) => {
    const status = String(doc?.meta?.status ?? "not tracked");
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--bg-surface-2)" }}>
        <span aria-hidden="true">{["received", "reviewed"].includes(status) ? "📗" : "📄"}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {name}
            {!core && (
              <span className="ml-2 text-[10px] uppercase" style={{ color: "var(--text-subtle)" }}>
                custom
              </span>
            )}
          </div>
          {doc && (
            <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
              {doc.author} · {fmtDate(doc.createdAt, false)}
            </div>
          )}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(name, doc, e.target.value)}
          disabled={mut.busy}
          className="text-xs px-2 py-1.5 rounded-md outline-none capitalize"
          style={{ ...fieldStyle, color: DOC_COLOR[status] }}
          aria-label={`Status for ${name}`}
        >
          {DOC_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="glass rounded-xl p-5 lg:col-span-3">
        <SectionTitle
          icon="🗄️"
          title="Core data room"
          right={
            untracked.length > 0 && (
              <PrimaryButton tone="ghost" onClick={requestAll} disabled={bulkBusy || mut.busy}>
                Request {untracked.length} outstanding
              </PrimaryButton>
            )
          }
        />
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            <span>Received or reviewed</span>
            <span className="tnum">
              {coreIn}/{CORE_DOCS.length}
            </span>
          </div>
          <ProgressBar value={coreIn} max={CORE_DOCS.length} color="var(--accent-green)" />
        </div>
        <div className="space-y-2">
          {CORE_DOCS.map((n) => (
            <Row key={n} name={n} doc={find(n)} core />
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-5 lg:col-span-2 h-fit space-y-3">
        <SectionTitle icon="➕" title="Other documents" />
        <div className="flex gap-2">
          <div className="flex-1">
            <TextInput value={custom} onChange={setCustom} placeholder="e.g. SOC 2 report" />
          </div>
          <PrimaryButton
            disabled={!custom.trim() || mut.busy}
            onClick={async () => {
              await mut.add({ companyId: c.id, kind: "document", body: custom.trim(), author, meta: { status: "requested" } });
              setCustom("");
            }}
          >
            Add
          </PrimaryButton>
        </div>
        {customDocs.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
            Track anything beyond the standard set — security reviews, reference calls, board decks.
          </p>
        ) : (
          <div className="space-y-2">
            {customDocs.map((d) => (
              <Row key={d.id} name={d.body} doc={d} core={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Meetings                                                            */
/* ================================================================== */
function MeetingsTab({
  c,
  items,
  author,
  mut,
  refresh,
}: {
  c: Company;
  items: CaptureItem[];
  author: string;
  mut: Mut;
  refresh: () => Promise<void>;
}) {
  const meetings = items
    .filter((i) => i.kind === "meeting")
    .sort((a, b) => String(b.meta?.date ?? b.createdAt).localeCompare(String(a.meta?.date ?? a.createdAt)));
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ date: today, attendees: c.founders.map((x) => x.name).join(", "), body: "", followUps: "" });
  const [converted, setConverted] = useState<Record<string, boolean>>({});

  const toTasks = async (m: CaptureItem) => {
    const lines = String(m.meta?.followUps ?? "")
      .split("\n")
      .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(Boolean);
    await Promise.all(
      lines.map((l) => addCapture({ companyId: c.id, kind: "task", body: l, author, meta: { status: "open", owner: author } }))
    );
    setConverted((s) => ({ ...s, [m.id]: true }));
    await refresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="glass rounded-xl p-5 lg:col-span-2 h-fit space-y-3">
        <SectionTitle icon="🗓️" title="Log a meeting" />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Date" type="date" value={f.date} onChange={(v) => setF({ ...f, date: v })} />
          <TextInput label="Attendees" value={f.attendees} onChange={(v) => setF({ ...f, attendees: v })} />
        </div>
        <TextArea label="Notes" value={f.body} onChange={(v) => setF({ ...f, body: v })} rows={5} placeholder="Key takeaways, numbers shared, red flags…" />
        <TextArea label="Follow-ups (one per line)" value={f.followUps} onChange={(v) => setF({ ...f, followUps: v })} rows={3} placeholder={"Send updated cohort data\nIntro to 2 reference customers"} />
        <PrimaryButton
          disabled={!f.body.trim() || mut.busy}
          onClick={async () => {
            await mut.add({ companyId: c.id, kind: "meeting", body: f.body.trim(), author, meta: { date: f.date, attendees: f.attendees, followUps: f.followUps } });
            setF({ ...f, body: "", followUps: "" });
          }}
        >
          Save meeting
        </PrimaryButton>
      </div>

      <div className="lg:col-span-3 space-y-3">
        {meetings.length === 0 && <EmptyState icon="🗓️" title="No meetings logged" hint="Capture at least one founder meeting (+8 pts)." />}
        {meetings.map((m) => (
          <CaptureCard key={m.id} item={m} onChange={() => {}} onDelete={() => mut.remove(m.id)}>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-2" style={{ color: "var(--text-subtle)" }}>
              {m.meta?.date && <span>📅 {fmtDate(m.meta.date, false)}</span>}
              {m.meta?.attendees && <span>👥 {m.meta.attendees}</span>}
            </div>
            {m.meta?.followUps?.trim() && (
              <div className="rounded-lg p-3" style={{ background: "var(--bg-surface-2)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#0369A1" }}>
                    Follow-ups
                  </span>
                  {converted[m.id] ? (
                    <span className="text-[11px]" style={{ color: "var(--accent-green)" }}>
                      ✓ Added to tasks
                    </span>
                  ) : (
                    <button onClick={() => void toTasks(m)} className="text-[11px] hover:opacity-80" style={{ color: "var(--accent-blue-light)" }}>
                      → Create tasks
                    </button>
                  )}
                </div>
                <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
                  {m.meta.followUps}
                </p>
              </div>
            )}
          </CaptureCard>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Team notes                                                          */
/* ================================================================== */
function NotesTab({ c, items, author, mut }: { c: Company; items: CaptureItem[]; author: string; mut: Mut }) {
  const [text, setText] = useState("");
  const [tag, setTag] = useState("Observation");
  const comments = items.filter((i) => i.kind === "comment");
  return (
    <div className="max-w-3xl space-y-3">
      <div className="glass rounded-xl p-5 space-y-3">
        <SectionTitle icon="💬" title="Team notes" right={<span className="text-xs tnum" style={{ color: "var(--text-muted)" }}>{comments.length}/3</span>} />
        <TextArea value={text} onChange={setText} rows={3} placeholder="Share an observation, concern or conviction with the team…" />
        <div className="flex gap-2 items-end">
          <div className="w-44">
            <Select value={tag} onChange={setTag} options={["Observation", "Concern", "Conviction", "Reference call", "Market signal"]} />
          </div>
          <PrimaryButton
            disabled={!text.trim() || mut.busy}
            onClick={async () => {
              await mut.add({ companyId: c.id, kind: "comment", body: `${tag === "Observation" ? "" : `[${tag}] `}${text.trim()}`, author });
              setText("");
            }}
          >
            Post note
          </PrimaryButton>
        </div>
      </div>
      {comments.length === 0 && <EmptyState icon="💬" title="No notes yet" hint="Three team observations earn +10 pts." />}
      {comments.map((i) => (
        <CaptureCard key={i.id} item={i} onChange={() => {}} onDelete={() => mut.remove(i.id)} />
      ))}
    </div>
  );
}

/* ================================================================== */
/* Tasks                                                               */
/* ================================================================== */
function TasksTab({ c, items, author, mut }: { c: Company; items: CaptureItem[]; author: string; mut: Mut }) {
  const [f, setF] = useState({ body: "", owner: "", due: "" });
  const tasks = items.filter((i) => i.kind === "task");
  const open = tasks.filter((t) => t.meta?.status !== "done").sort((a, b) => String(a.meta?.due || "9").localeCompare(String(b.meta?.due || "9")));
  const done = tasks.filter((t) => t.meta?.status === "done");
  const today = new Date().toISOString().slice(0, 10);

  const TaskRow = ({ t }: { t: CaptureItem }) => {
    const isDone = t.meta?.status === "done";
    const overdue = !isDone && t.meta?.due && t.meta.due < today;
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg group" style={{ background: "var(--bg-surface-2)" }}>
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => mut.patch(t.id, { meta: { status: isDone ? "open" : "done" } })}
          className="w-4 h-4 accent-[#1E9E52] flex-shrink-0"
          aria-label={`Mark "${t.body}" ${isDone ? "open" : "done"}`}
        />
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${isDone ? "line-through" : ""}`} style={{ color: isDone ? "var(--text-subtle)" : "var(--text-primary)" }}>
            {t.body}
          </div>
          <div className="text-[11px] flex gap-3" style={{ color: "var(--text-subtle)" }}>
            {t.meta?.owner && <span>👤 {t.meta.owner}</span>}
            {t.meta?.due && <span style={{ color: overdue ? "var(--accent-red)" : undefined }}>📅 {fmtDate(t.meta.due, false)}{overdue ? " · overdue" : ""}</span>}
          </div>
        </div>
        <button onClick={() => mut.remove(t.id)} aria-label="Delete task" className="text-xs opacity-40 hover:opacity-100" style={{ color: "var(--text-subtle)" }}>
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="glass rounded-xl p-5 lg:col-span-2 h-fit space-y-3">
        <SectionTitle icon="☑️" title="New task" />
        <TextInput value={f.body} onChange={(v) => setF({ ...f, body: v })} placeholder="e.g. Call two reference customers" />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Owner" value={f.owner} onChange={(v) => setF({ ...f, owner: v })} placeholder={author} />
          <TextInput label="Due" type="date" value={f.due} onChange={(v) => setF({ ...f, due: v })} />
        </div>
        <PrimaryButton
          disabled={!f.body.trim() || mut.busy}
          onClick={async () => {
            await mut.add({ companyId: c.id, kind: "task", body: f.body.trim(), author, meta: { status: "open", owner: f.owner.trim() || author, due: f.due } });
            setF({ body: "", owner: f.owner, due: "" });
          }}
        >
          Add task
        </PrimaryButton>
      </div>
      <div className="glass rounded-xl p-5 lg:col-span-3">
        <SectionTitle icon="📋" title="Open" right={<span className="text-xs tnum" style={{ color: "var(--text-muted)" }}>{done.length}/{tasks.length} done</span>} />
        {tasks.length > 0 && (
          <div className="mb-4">
            <ProgressBar value={done.length} max={tasks.length} color="var(--accent-green)" />
          </div>
        )}
        {tasks.length === 0 ? (
          <EmptyState icon="☑️" title="No tasks" hint="Log follow-ups and tick at least one off (+6 pts)." />
        ) : (
          <div className="space-y-2">
            {open.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
            {done.length > 0 && (
              <div className="pt-3 text-[11px] uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
                Completed
              </div>
            )}
            {done.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* IC votes + final decision                                           */
/* ================================================================== */
function VotesTab({ c, items, author, mut }: { c: Company; items: CaptureItem[]; author: string; mut: Mut }) {
  const votes = items.filter((i) => i.kind === "vote");
  const [f, setF] = useState<{ member: string; verdict: Verdict; confidence: number; rationale: string }>({
    member: "",
    verdict: "invest",
    confidence: 70,
    rationale: "",
  });

  // Latest vote per member counts
  const latest = new Map<string, CaptureItem>();
  [...votes].reverse().forEach((v) => latest.set(String(v.meta?.member ?? v.author).toLowerCase(), v));
  const counted = [...latest.values()];
  const tally: Record<Verdict, number> = { invest: 0, watch: 0, reject: 0 };
  counted.forEach((v) => {
    const vd = v.meta?.verdict as Verdict | undefined;
    if (vd && vd in tally) tally[vd] += 1;
  });
  const avgConf = counted.length ? Math.round(counted.reduce((n, v) => n + Number(v.meta?.confidence ?? 0), 0) / counted.length) : 0;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 space-y-5 h-fit">
        <div className="glass rounded-xl p-5 space-y-3">
          <SectionTitle icon="🗳️" title="Cast a vote" />
          <TextInput label="IC member" value={f.member} onChange={(v) => setF({ ...f, member: v })} placeholder={author} />
          <div>
            <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Verdict
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(VERDICT_META) as Verdict[]).map((v) => {
                const m = VERDICT_META[v];
                const on = f.verdict === v;
                return (
                  <button
                    key={v}
                    onClick={() => setF({ ...f, verdict: v })}
                    className="py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: on ? "var(--bg-surface-3)" : "var(--bg-surface-2)",
                      color: on ? m.color : "var(--text-muted)",
                      border: `1px solid ${on ? m.color : "var(--border)"}`,
                    }}
                    aria-pressed={on}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              <span>Confidence</span>
              <span className="tnum font-semibold" style={{ color: "var(--text-primary)" }}>
                {f.confidence}%
              </span>
            </div>
            <input type="range" min={0} max={100} step={5} value={f.confidence} onChange={(e) => setF({ ...f, confidence: Number(e.target.value) })} className="w-full accent-[#0071E3]" aria-label="Confidence" />
          </label>
          <TextArea label="Rationale" value={f.rationale} onChange={(v) => setF({ ...f, rationale: v })} rows={3} placeholder="The one reason this vote goes the way it does…" />
          <PrimaryButton
            disabled={mut.busy}
            onClick={async () => {
              const member = f.member.trim() || author;
              await mut.add({ companyId: c.id, kind: "vote", body: f.rationale.trim(), author, meta: { member, verdict: f.verdict, confidence: f.confidence, rationale: f.rationale.trim() } });
              setF({ ...f, member: "", rationale: "" });
            }}
          >
            Submit vote
          </PrimaryButton>
        </div>

        <div className="glass rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">Ready for a decision?</h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Team votes inform the review. Record the final verdict in Decision.</p>
          <Link href={`/committee/${c.id}`} className="inline-flex py-3 text-sm font-semibold" style={{ color: "var(--accent-blue)" }}>Review decision →</Link>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-3">
        <div className="glass rounded-xl p-5">
          <SectionTitle icon="📊" title="Tally" right={<span className="text-xs tnum" style={{ color: "var(--text-muted)" }}>{counted.length} members · avg {avgConf}%</span>} />
          <div className="space-y-3">
            {(Object.keys(VERDICT_META) as Verdict[]).map((v) => (
              <div key={v}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "var(--text-muted)" }}>{VERDICT_META[v].label}</span>
                  <span className="tnum font-semibold" style={{ color: VERDICT_META[v].color }}>
                    {tally[v]}
                  </span>
                </div>
                <ProgressBar value={tally[v]} max={Math.max(1, counted.length)} color={VERDICT_META[v].color} />
              </div>
            ))}
          </div>
        </div>
        {votes.length === 0 && <EmptyState icon="🗳️" title="No votes yet" hint="Two IC votes (+6) and a final decision (+4) close the deal file." />}
        {votes.map((v) => {
          const vd = (v.meta?.verdict as Verdict) ?? "watch";
          return (
            <CaptureCard key={v.id} item={{ ...v, body: "" }} onChange={() => {}} onDelete={() => mut.remove(v.id)}>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {v.meta?.member ?? v.author}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: VERDICT_META[vd].color, background: "var(--bg-surface-2)" }}>
                  {VERDICT_META[vd].label}
                </span>
                <span className="text-xs tnum" style={{ color: "var(--text-muted)" }}>
                  {v.meta?.confidence ?? 0}% confident
                </span>
              </div>
              {v.meta?.rationale && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {v.meta.rationale}
                </p>
              )}
            </CaptureCard>
          );
        })}
      </div>
    </div>
  );
}
