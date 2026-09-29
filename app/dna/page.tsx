"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, Check, CircleAlert, Clock, Download, FileText, Globe2, Lightbulb, Save, Target, ThumbsUp, Wallet } from "lucide-react";
import { saveDNA, getDNA, subscribeStore, getStoreSnapshot, getStoreServerSnapshot, parseSnapshot } from "@/lib/store";
import { createRecord, fetchCollection, updateRecord } from "@/lib/data-client";
import { liveHoldings } from "@/lib/portfolio-book";
import styles from "./dna.module.css";

const sectors = ["AI/ML", "FinTech", "HealthTech", "SaaS", "CleanTech", "Infrastructure", "LegalTech", "Cybersecurity", "DeepTech", "Consumer", "EdTech", "PropTech"];
const stages = ["Pre-seed", "Seed", "Series A", "Series B", "Series C+"];
const geos = ["USA", "UK", "Europe", "APAC", "India", "Israel", "Global", "MENA"];
const checkSizes = ["$50K–$250K", "$250K–$1M", "$1M–$5M", "$5M–$15M", "$15M+"];
const LIMIT = 500;

type Baseline = { sectors: string[]; stages: string[]; geos: string[]; checkSize: string; thesis: string };

function brief(items: string[], max = 4) {
  if (!items.length) return "None";
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return `${shown.join(", ")}${extra ? ` (+${extra})` : ""}`;
}

function same(a: string[], b: string[]) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

function added(next: string[], prev: string[]) {
  return next.filter((item) => !prev.includes(item));
}

function Chip({ on, tone, label, onClick }: { on: boolean; tone: "blue" | "amber" | "green"; label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.chip} data-on={on} data-tone={tone} aria-pressed={on} onClick={onClick}>
      {on && <Check size={14} />}
      {label}
    </button>
  );
}

function Pills({ items, tone }: { items: string[]; tone: "blue" | "amber" | "green" }) {
  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;
  return (
    <div className={styles.pills}>
      {shown.map((item) => <span key={item} className={styles.pill} data-tone={tone}>{item}</span>)}
      {extra > 0 && <span className={`${styles.pill} ${styles.more}`}>+{extra}</span>}
      {items.length === 0 && <span className={styles.pill}>None yet</span>}
    </div>
  );
}

export default function DNAPage() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>(["AI/ML", "FinTech"]);
  const [selectedStages, setSelectedStages] = useState<string[]>(["Seed", "Series A"]);
  const [selectedGeos, setSelectedGeos] = useState<string[]>(["USA", "UK"]);
  const [checkSize, setCheckSize] = useState("$1M–$5M");
  const [thesis, setThesis] = useState("");
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const dna = getDNA();
    if (dna) {
      setSelectedSectors(dna.sectors);
      setSelectedStages(dna.stages);
      setSelectedGeos(dna.geos);
      setCheckSize(dna.checkSize);
      setSaved(true);
    }
    fetchCollection("strategy")
      .then((items) => {
        const row = items[0] as { sectors?: string[]; stages?: string[]; geos?: string[]; checkSize?: string; thesis?: string } | undefined;
        if (!row) return;
        const nextThesis = typeof row.thesis === "string" ? row.thesis.slice(0, LIMIT) : "";
        setThesis(nextThesis);
        if (!dna) {
          if (Array.isArray(row.sectors)) setSelectedSectors(row.sectors);
          if (Array.isArray(row.stages)) setSelectedStages(row.stages);
          if (Array.isArray(row.geos)) setSelectedGeos(row.geos);
          if (typeof row.checkSize === "string" && row.checkSize) setCheckSize(row.checkSize);
        }
        const source = dna ?? {
          sectors: Array.isArray(row.sectors) ? row.sectors : [],
          stages: Array.isArray(row.stages) ? row.stages : [],
          geos: Array.isArray(row.geos) ? row.geos : [],
          checkSize: typeof row.checkSize === "string" ? row.checkSize : "",
        };
        setBaseline({ ...source, thesis: nextThesis });
      })
      .catch(() => { if (!getDNA()) setSaveError("The saved strategy could not load. These chips stay empty of that file until it loads."); });
  }, []);

  const toggle = (list: string[], item: string, set: (value: string[]) => void) => {
    set(list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const profile = saveDNA({ sectors: selectedSectors, stages: selectedStages, geos: selectedGeos, checkSize });
      const items = await fetchCollection("strategy");
      const existing = items[0];
      const patch = { sectors: profile.sectors, stages: profile.stages, geos: profile.geos, checkSize: profile.checkSize, thesis, savedAt: profile.savedAt };
      if (existing) await updateRecord("strategy", existing.id, patch);
      else await createRecord("strategy", patch);
      setBaseline({ sectors: profile.sectors, stages: profile.stages, geos: profile.geos, checkSize: profile.checkSize, thesis });
      setSaved(true);
    } catch (reason) {
      setSaved(false);
      setSaveError(reason instanceof Error ? reason.message : "The strategy could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const snapshot = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot));
  const alerts = liveHoldings(snapshot.stages).filter((item) => item.alerts.length > 0 && selectedSectors.includes(item.sector));
  const outside = sectors.filter((item) => !selectedSectors.includes(item)).slice(0, 3);
  const focusOn = selectedSectors.length > 0;
  const stageOn = selectedStages.length > 0;
  const placeOn = selectedGeos.length > 0 && Boolean(checkSize);
  const completeness = Math.round(((focusOn ? 34 : 0) + (stageOn ? 33 : 0) + (placeOn ? 33 : 0)));
  const sizes = checkSizes.includes(checkSize) || !checkSize ? checkSizes : [checkSize, ...checkSizes];
  const changeBits = baseline
    ? [
        added(selectedSectors, baseline.sectors).length ? `Sectors added: ${added(selectedSectors, baseline.sectors).join(", ")}` : "",
        added(baseline.sectors, selectedSectors).length ? `Sectors removed: ${added(baseline.sectors, selectedSectors).join(", ")}` : "",
        !same(selectedStages, baseline.stages) ? "Stage selection changed" : "",
        !same(selectedGeos, baseline.geos) ? "Geography changed" : "",
        checkSize !== baseline.checkSize ? "Check size changed" : "",
        thesis !== baseline.thesis ? "Fund context changed" : "",
      ].filter(Boolean)
    : [];

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div>
          <p className={styles.kicker}>Investment strategy</p>
          <h1>Investment strategy</h1>
          <p className={styles.lede}>Define your investment preferences to personalise target company rankings.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={() => window.print()}><Download size={15} /> Export PDF</button>
          <button type="button" className={styles.primary} onClick={() => void handleSave()} disabled={saving}><Save size={15} /> {saving ? "Saving…" : "Save strategy"}</button>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card}>
            <h2><FileText size={16} /> Fund / Strategy context (optional)</h2>
            <p className={styles.hint}>Provide a short description of your fund, investment thesis, or strategic focus. This helps tailor company ranking and deal discovery.</p>
            <textarea className={styles.field} maxLength={LIMIT} value={thesis} onChange={(event) => { setThesis(event.target.value.slice(0, LIMIT)); setSaved(false); }} aria-label="Fund or strategy context" />
            <p className={styles.count}>{thesis.length}/{LIMIT}</p>
          </section>

          <section className={styles.card}>
            <div className={styles.meterHead}>
              <div>
                <h2>DNA profile completeness</h2>
                <p className={styles.hint}>Complete your DNA to unlock personalised deal discovery.</p>
              </div>
              <strong>{completeness}%</strong>
            </div>
            <div className={styles.track} role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100} aria-label="DNA profile completeness"><i style={{ width: `${completeness}%` }} /></div>
            <div className={styles.checks}>
              <span data-on={focusOn}><Check size={14} /> Strategic focus defined</span>
              <span data-on={stageOn}><Check size={14} /> Investment stage set</span>
              <span data-on={placeOn}><Check size={14} /> Geography & check size selected</span>
            </div>
          </section>

          <section className={styles.card}>
            <h2><Target size={16} /> Sectors focus <span style={{ fontWeight: 500, color: "#94a3b8" }}>(select all that apply)</span></h2>
            <p className={styles.hint}>Choose the sectors that align with your investment strategy.</p>
            <div className={styles.chips}>{sectors.map((item) => <Chip key={item} label={item} tone="blue" on={selectedSectors.includes(item)} onClick={() => toggle(selectedSectors, item, setSelectedSectors)} />)}</div>
          </section>

          <section className={styles.card}>
            <h2>Investment stage <span style={{ fontWeight: 500, color: "#94a3b8" }}>(select all that apply)</span></h2>
            <p className={styles.hint}>Select the stages you invest in.</p>
            <div className={styles.chips}>{stages.map((item) => <Chip key={item} label={item} tone="amber" on={selectedStages.includes(item)} onClick={() => toggle(selectedStages, item, setSelectedStages)} />)}</div>
          </section>

          <section className={styles.card}>
            <h2><Globe2 size={16} /> Geography <span style={{ fontWeight: 500, color: "#94a3b8" }}>(select all that apply)</span></h2>
            <p className={styles.hint}>Choose target regions for investment.</p>
            <div className={styles.chips}>{geos.map((item) => <Chip key={item} label={item} tone="green" on={selectedGeos.includes(item)} onClick={() => toggle(selectedGeos, item, setSelectedGeos)} />)}</div>
          </section>

          <section className={styles.card}>
            <h2><Wallet size={16} /> Check size</h2>
            <p className={styles.hint}>Select your typical investment size.</p>
            <div className={styles.chips}>{sizes.map((item) => <Chip key={item} label={item} tone="blue" on={checkSize === item} onClick={() => { setCheckSize(item); setSaved(false); }} />)}</div>
          </section>
        </div>

        <aside className={styles.side}>
          <section className={styles.card}>
            <h2><Target size={16} /> Strategy summary</h2>
            <div className={styles.row}><span>Strategic focus</span><Pills items={selectedSectors} tone="blue" /></div>
            <div className={styles.row}><span>Stage</span><Pills items={selectedStages} tone="amber" /></div>
            <div className={styles.row}><span>Geography</span><Pills items={selectedGeos} tone="green" /></div>
            <div className={styles.row}><span>Check size</span><Pills items={checkSize ? [checkSize] : []} tone="blue" /></div>
            <div className={styles.stats}>
              <div><b>{selectedSectors.length}</b><span>Focus areas</span></div>
              <div><b>{selectedStages.length}</b><span>Stages</span></div>
              <div><b>{selectedGeos.length}</b><span>Regions</span></div>
              <div><b>{checkSize ? 1 : 0}</b><span>Check size</span></div>
            </div>
            {saved && <div className={styles.saved}><Check size={16} /><div><strong>Strategy saved</strong>Your preferences are used to personalise target company rankings and deal discovery.</div></div>}
            {saveError && <p className={styles.error} role="alert">{saveError}</p>}
          </section>
        </aside>
      </div>

      <section className={`${styles.card} ${styles.tools}`}>
        <h2><Lightbulb size={16} /> What the tools already show</h2>
        <p className={styles.hint}>Based on your inputs, here is how this page changes company ranking. It does not add a new market feed.</p>
        <div className={styles.grid}>
          <article className={styles.insight}><Target size={16} color="#2563eb" /><div><strong>Primary investment thesis</strong><p>{thesis.trim() || "Add a fund context above. Until then, ranking uses only the sectors, stages, regions and check size you select."}</p></div></article>
          <article className={styles.insight}><ThumbsUp size={16} color="#15803d" /><div><strong>What helped</strong><p>{selectedGeos.length ? `${selectedGeos.join(", ")} ${selectedGeos.length === 1 ? "is" : "are"} included when a company is scored for geography.` : "No region is selected, so geography does not narrow the list."}</p></div></article>
          <article className={styles.insight}><Clock size={16} color="#b45309" /><div><strong>What has changed</strong><p>{changeBits.length ? changeBits.join(". ") + "." : "Nothing differs from the strategy loaded on this page."}</p></div></article>
          <article className={styles.insight}><CircleAlert size={16} color="#b45309" /><div><strong>What sits outside</strong><p>{outside.length ? `Companies whose sector is only ${outside.join(", ")} sit outside this strategy and rank lower.` : "Every listed sector is selected, so sector does not exclude a company."}</p></div></article>
          <article className={styles.insight}><Bell size={16} color="#b45309" /><div><strong>Open alerts</strong><p>{alerts.length ? alerts.map((item) => `${item.name}: ${item.alerts[0]}`).join(" ") : "No portfolio alert is in the sectors selected here."}</p></div></article>
          <article className={styles.insight}><FileText size={16} color="#2563eb" /><div><strong>Decision support</strong><p>Discover ranks companies from this strategic fit, stage, region and check size, together with the company file already in the workspace.</p></div></article>
        </div>
      </section>

      <section className={`${styles.card} ${styles.foot}`}>
        <div className={styles.summary}>
          <div><h3>Your investment DNA</h3><p>A summary of your current settings.</p></div>
          <div><span>Sectors</span><p>{brief(selectedSectors)}</p></div>
          <div><span>Stages</span><p>{selectedStages.length ? `${selectedStages.join(", ")} (${selectedStages.length})` : "None"}</p></div>
          <div><span>Geography</span><p>{brief(selectedGeos, 4)}</p></div>
          <div><span>Check size</span><p>{checkSize || "None"}</p></div>
        </div>
        <Link className={styles.dark} href="/discovery">{saved ? "Strategy saved — Discover deals" : "Discover deals"}</Link>
        <button type="button" className={styles.outline} onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving…" : "Save as market DNA discovery"}</button>
      </section>
    </div>
  );
}
