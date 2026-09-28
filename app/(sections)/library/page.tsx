"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DealViewToggle from "@/components/DealViewToggle";
import { companies } from "@/lib/mock-data";
import { initialDeals, stages } from "@/lib/pipeline-data";
import { fetchAllCaptures } from "@/lib/api-client";
import { computeCompleteness, completenessLabel, type CaptureItem } from "@/lib/capture";
import { getDealStages } from "@/lib/store";
import { Library, Search, ArrowRight, Circle } from "lucide-react";

type Row = {
  id: string; name: string; sector: string; logo: string; color: string;
  score: number; label: string; stageId: string; stageLabel: string; stageColor: string; captured: number;
};

function scoreColor(s: number) {
  if (s >= 95) return "var(--accent-green)";
  if (s >= 75) return "var(--accent-blue)";
  if (s >= 50) return "var(--accent-gold)";
  if (s > 0) return "#C2410C";
  return "var(--text-subtle)";
}

const seedStage: Record<string, string> = Object.fromEntries(initialDeals.map((d) => [d.companyId, d.stageId]));

export default function DealLibraryPage() {
  const [byCompany, setByCompany] = useState<Record<string, CaptureItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "invested" | "passed">("all");

  useEffect(() => {
    let cancelled = false;
    fetchAllCaptures()
      .then((items) => {
        if (cancelled) return;
        const grouped: Record<string, CaptureItem[]> = {};
        for (const it of items) (grouped[it.companyId] ??= []).push(it);
        setByCompany(grouped);
      })
      .catch(() => { if (!cancelled) setLoadError("Records could not load. Retry this page."); })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const rows: Row[] = useMemo(() => {
    const savedStages = getDealStages();
    return companies.filter(c => initialDeals.some(d => d.companyId === c.id)).map((c) => {
      const items = byCompany[c.id] ?? [];
      const comp = computeCompleteness(items);
      const stageId = savedStages[c.id] ?? seedStage[c.id] ?? "discovered";
      const st = stages.find((s) => s.id === stageId);
      return {
        id: c.id, name: c.name, sector: c.sector, logo: c.logo, color: c.color,
        score: comp.score, label: completenessLabel(comp.score),
        stageId,
        stageLabel: st?.label ?? "—",
        stageColor: st?.color ?? "var(--text-subtle)",
        captured: items.length,
      };
    }).sort((a, b) => b.score - a.score);
  }, [byCompany]);

  const filtered = rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase()) && !r.sector.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "active") return !["invested", "passed"].includes(r.stageId);
    if (filter === "invested") return r.stageId === "invested";
    if (filter === "passed") return r.stageId === "passed";
    return true;
  });

  const withWork = rows.filter((r) => r.captured > 0).length;

  return (
    <div className="p-4 md:p-8 fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#eef0ff", border: "1px solid rgba(81,70,229,0.18)", color: "var(--accent-blue)" }}>
          <Library size={22} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-blue)" }}>Find &amp; check</div>
          <h1 className="t-h2" style={{ color: "var(--text-primary)" }}>Deal Pipeline</h1>
        </div>
      </div>
      <p className="text-sm md:text-base leading-relaxed max-w-2xl mb-6" style={{ color: "var(--text-muted)" }}>
        Every deal Investor OS has touched, with its 0–100 analysis record. Open any one to resume its workflow
        exactly where it left off.
      </p>

      <div className="mb-5"><DealViewToggle /></div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} strokeWidth={1.9} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-subtle)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search deals" placeholder="Search deals or sectors…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        <div className="flex gap-1">
          {(["all", "active", "invested", "passed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-xs px-3 py-2 rounded-full font-medium capitalize transition-all"
              style={{ background: filter === f ? "#eef0ff" : "var(--bg-surface)", color: filter === f ? "var(--accent-blue)" : "var(--text-muted)", border: `1px solid ${filter === f ? "var(--accent-blue)" : "var(--border)"}` }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs mb-3" style={{ color: "var(--text-subtle)" }}>
        {loadError ? loadError : loading ? "Loading records…" : `${filtered.length} deals · ${withWork} with an active analysis record`}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((r) => (
          <Link key={r.id} href={`/deal/${r.id}`}
            className="glass rounded-xl p-4 flex items-center gap-4 card-hover">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${r.color}18`, border: `1px solid ${r.color}30` }} aria-hidden="true">{r.logo}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--bg-surface-2)", color: r.stageColor }}>
                  <Circle size={7} fill="currentColor" strokeWidth={0} aria-hidden="true" />{r.stageLabel}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.sector} · {r.captured} captures</div>
            </div>
            {/* score */}
            <div className="w-32 flex-shrink-0 hidden sm:block">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span style={{ color: "var(--text-subtle)" }}>{r.label}</span>
                <span className="font-semibold tnum" style={{ color: scoreColor(r.score) }}>{r.score}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-surface-3)" }}>
                <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: scoreColor(r.score) }} />
              </div>
            </div>
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" style={{ color: "var(--text-subtle)" }} />
          </Link>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="glass rounded-xl p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>No deals match.</div>
        )}
      </div>
    </div>
  );
}
