"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { saveDNA, getDNA, subscribeStore, getStoreSnapshot, getStoreServerSnapshot, parseSnapshot } from "@/lib/store";
import { createRecord, fetchCollection, updateRecord } from "@/lib/data-client";
import { bookMemory } from "@/lib/operating-picture";

const sectors = ["AI/ML", "FinTech", "HealthTech", "SaaS", "CleanTech", "Infrastructure", "LegalTech", "Cybersecurity", "DeepTech", "Consumer", "EdTech", "PropTech"];
const stages = ["Pre-seed", "Seed", "Series A", "Series B", "Series C+"];
const geos = ["USA", "UK", "Europe", "MENA", "APAC", "India", "Israel", "Global"];
const checkSizes = ["$50K–$250K", "$250K–$1M", "$1M–$5M", "$5M–$15M", "$15M+"];

export default function DNAPage() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>(["AI/ML", "FinTech"]);
  const [selectedStages, setSelectedStages] = useState<string[]>(["Seed", "Series A"]);
  const [selectedGeos, setSelectedGeos] = useState<string[]>(["USA", "UK"]);
  const [checkSize, setCheckSize] = useState("$1M–$5M");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fundStrategy, setFundStrategy] = useState<{ sectors?: string[]; stages?: string[]; geos?: string[]; thesis?: string } | null>(null);

  // Hydrate saved DNA profile + fund strategy defaults
  useEffect(() => {
    const dna = getDNA();
    if (dna) {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only state after the server render.
      setSelectedSectors(dna.sectors);
      setSelectedStages(dna.stages);
      setSelectedGeos(dna.geos);
      setCheckSize(dna.checkSize);
      setSaved(true);
    }
    fetchCollection("strategy")
      .then((items) => {
        const s = items[0];
        if (s) {
          setFundStrategy(s as { sectors?: string[]; stages?: string[]; geos?: string[]; thesis?: string });
          // If the user has no personal DNA yet, pre-fill from fund strategy
          if (!dna) {
            if (Array.isArray(s.sectors)) setSelectedSectors(s.sectors as string[]);
            if (Array.isArray(s.stages)) setSelectedStages(s.stages as string[]);
            if (Array.isArray(s.geos)) setSelectedGeos(s.geos as string[]);
          }
        }
      })
      .catch(() => { if (!getDNA()) setSaveError("The saved strategy could not load. These chips stay empty of that file until it loads."); });
  }, []);

  const toggle = (list: string[], item: string, set: (v: string[]) => void) => {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const profile = saveDNA({ sectors: selectedSectors, stages: selectedStages, geos: selectedGeos, checkSize });
      const items = await fetchCollection("strategy");
      const existing = items[0];
      const patch = { sectors: profile.sectors, stages: profile.stages, geos: profile.geos, checkSize: profile.checkSize, savedAt: profile.savedAt };
      if (existing) await updateRecord("strategy", existing.id, patch);
      else await createRecord("strategy", patch);
      setSaved(true);
    } catch (reason) {
      setSaved(false);
      setSaveError(reason instanceof Error ? reason.message : "The strategy could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const { decisions, stages: dealStages } = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot));
  const memory = bookMemory(decisions, dealStages);
  const completeness = Math.round(
    ((selectedSectors.length > 0 ? 25 : 0) +
    (selectedStages.length > 0 ? 25 : 0) +
    (selectedGeos.length > 0 ? 25 : 0) +
    (checkSize ? 25 : 0))
  );

  return (
    <div className="p-4 md:p-8 fade-in max-w-3xl">
      <div className="mb-7">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Investment strategy</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Define your investment preferences to personalize sample company rankings.
        </p>
      </div>

      {/* Fund strategy context */}
      {fundStrategy?.thesis && (
        <div className="glass rounded-xl p-5 mb-7" style={{ borderColor: "rgba(0,113,227,0.2)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent-blue-light)" }}>
            🧭 Fund I Strategy (default)
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {fundStrategy.thesis}
          </p>
          <div className="text-xs mt-2" style={{ color: "var(--text-subtle)" }}>
            Your personal DNA below starts from the fund strategy — tune it to re-rank Deal Discovery.
          </div>
        </div>
      )}

      {/* DNA completeness */}
      <div className="glass rounded-xl p-5 mb-7">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>DNA Profile Completeness</span>
          <span className="text-2xl font-bold gradient-text-gold">{completeness}%</span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "var(--bg-surface-3)" }}
          role="progressbar"
          aria-valuenow={completeness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="DNA profile completeness"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completeness}%`, background: "linear-gradient(90deg, var(--accent-blue), var(--accent-gold))" }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-subtle)" }}>
          Complete your DNA to unlock personalized deal discovery
        </p>
      </div>

      {/* Sectors */}
      <div className="mb-7">
        <div className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>
          Sector Focus <span style={{ color: "var(--text-subtle)" }}>({selectedSectors.length} selected)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => toggle(selectedSectors, s, setSelectedSectors)}
              className="px-3 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: selectedSectors.includes(s) ? "rgba(0,113,227,0.15)" : "var(--bg-surface)",
                color: selectedSectors.includes(s) ? "var(--accent-blue-light)" : "var(--text-muted)",
                border: `1px solid ${selectedSectors.includes(s) ? "rgba(0,113,227,0.3)" : "var(--border)"}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stages */}
      <div className="mb-7">
        <div className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>
          Investment Stage <span style={{ color: "var(--text-subtle)" }}>({selectedStages.length} selected)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => toggle(selectedStages, s, setSelectedStages)}
              className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: selectedStages.includes(s) ? "rgba(183,121,31,0.12)" : "var(--bg-surface)",
                color: selectedStages.includes(s) ? "var(--accent-gold)" : "var(--text-muted)",
                border: `1px solid ${selectedStages.includes(s) ? "rgba(183,121,31,0.3)" : "var(--border)"}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Geography */}
      <div className="mb-7">
        <div className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>
          Geography <span style={{ color: "var(--text-subtle)" }}>({selectedGeos.length} selected)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {geos.map((g) => (
            <button
              key={g}
              onClick={() => toggle(selectedGeos, g, setSelectedGeos)}
              className="px-3 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: selectedGeos.includes(g) ? "rgba(30,158,82,0.1)" : "var(--bg-surface)",
                color: selectedGeos.includes(g) ? "var(--accent-green)" : "var(--text-muted)",
                border: `1px solid ${selectedGeos.includes(g) ? "rgba(30,158,82,0.25)" : "var(--border)"}`,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Check size */}
      <div className="mb-8">
        <div className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Check Size</div>
        <div className="flex flex-wrap gap-2">
          {(checkSizes.includes(checkSize) || !checkSize ? checkSizes : [checkSize, ...checkSizes]).map((s) => (
            <button
              key={s}
              onClick={() => setCheckSize(s)}
              className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: checkSize === s ? "rgba(0,113,227,0.15)" : "var(--bg-surface)",
                color: checkSize === s ? "var(--accent-blue-light)" : "var(--text-muted)",
                border: `1px solid ${checkSize === s ? "rgba(0,113,227,0.3)" : "var(--border)"}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <section className="glass rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>What the book already shows</h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-subtle)" }}>Previous investments, positions that have held, and positions that have gone against the book. Read from the current snapshot and your saved decisions.</p>
        <div className="space-y-3">
          {memory.lines.map((line) => (
            <div key={line.label}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-gold)" }}>{line.label}</div>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{line.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Summary */}
      {completeness === 100 && (
        <div
          className="glass rounded-xl p-5 mb-6 fade-in"
          style={{ borderColor: "rgba(0,113,227,0.2)" }}
        >
          <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Your Investment DNA</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span style={{ color: "var(--text-muted)" }}>Sectors: </span><span style={{ color: "var(--accent-blue-light)" }}>{selectedSectors.join(", ")}</span></div>
            <div><span style={{ color: "var(--text-muted)" }}>Stages: </span><span style={{ color: "var(--accent-gold)" }}>{selectedStages.join(", ")}</span></div>
            <div><span style={{ color: "var(--text-muted)" }}>Geography: </span><span style={{ color: "var(--accent-green)" }}>{selectedGeos.join(", ")}</span></div>
            <div><span style={{ color: "var(--text-muted)" }}>Check Size: </span><span style={{ color: "var(--text-primary)" }}>{checkSize}</span></div>
          </div>
        </div>
      )}

      {saveError && <p className="text-sm mb-3" role="alert" style={{ color: "var(--accent-red, #BA3D52)" }}>{saveError}</p>}
      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="w-full py-4 rounded-full font-semibold transition-all hover:opacity-90"
        style={{ background: "var(--accent-blue)", color: "#fff" }}
      >
        {saving ? "Saving…" : saved ? "Strategy saved — Discover uses it" : "Save investment strategy"}
      </button>

      {saved && (
        <Link
          href="/discovery"
          className="mt-3 block w-full text-center py-3 rounded-full font-semibold transition-all hover:opacity-90 fade-in"
          style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          See re-ranked Deal Discovery →
        </Link>
      )}
    </div>
  );
}
