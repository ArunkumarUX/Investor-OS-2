"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Building2, ChevronDown, Database, Download, Info, Shield, UserRound, Users } from "lucide-react";
import { PERSONAS, canAccess, useAuth, type PersonaId } from "@/lib/auth";
import { clearLocalWorkspace } from "@/lib/store";
import { downloadText } from "@/lib/export";
import styles from "./settings.module.css";

const BUCKETS = [
  { key: "documents", label: "Deal files", color: "#2563eb", collections: ["deals"] },
  { key: "analysis", label: "Analysis", color: "#a78bfa", collections: ["research", "strategy"] },
  { key: "people", label: "Contacts & tasks", color: "#22c55e", collections: ["contacts", "tasks"] },
  { key: "other", label: "Other records", color: "#cbd5e1", collections: ["commitments", "submissions", "integrations", "notifications"] },
] as const;

const SERVICES = [
  { name: "AI analysis", blurb: "Research briefs. A configured engine is not a tested connection.", href: "/research", tint: "#eef2ff" },
  { name: "Public research", blurb: "Public news and metadata. Company profiles stay sample data.", href: "/signals", tint: "#ecfdf3", ready: true },
  { name: "Google Drive", blurb: "Cloud document sync is not connected.", href: "/marketplace", tint: "#f8fafc" },
  { name: "Notion", blurb: "Memo export is not connected.", href: "/marketplace", tint: "#f8fafc" },
  { name: "PitchBook", blurb: "Comparable rounds are not connected.", href: "/marketplace", tint: "#f8fafc" },
  { name: "Slack", blurb: "Deal alerts are not connected.", href: "/marketplace", tint: "#f8fafc" },
];

const STEPS = [
  { href: "/marketplace", title: "Connect your data sources", text: "See which services are actually available." },
  { href: "/discovery", title: "Explore sample data", text: "Open the sample companies and the book." },
  { href: "/pipeline", title: "Walk through an investment review", text: "Open a sample company and the draft note." },
  { href: "/training", title: "Follow the first review", text: "The guide walks from strategy to a recorded decision." },
];

async function recordCount(collection: string): Promise<number | "hidden"> {
  const res = await fetch(`/api/data/${collection}`, { cache: "no-store" });
  if (res.status === 401 || res.status === 403) return "hidden";
  if (!res.ok) throw new Error("Records could not load.");
  const body = await res.json().catch(() => null);
  return Array.isArray(body?.items) ? body.items.length : 0;
}

export default function Settings() {
  const { user, login } = useAuth();
  const router = useRouter();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [security, setSecurity] = useState(false);
  const [counts, setCounts] = useState<Record<string, number | "hidden"> | null>(null);
  const [countsError, setCountsError] = useState("");
  const [ai, setAi] = useState<string>("Checking…");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all(BUCKETS.flatMap((bucket) => bucket.collections.map(async (name) => [name, await recordCount(name)] as const)))
      .then((rows) => { if (live) setCounts(Object.fromEntries(rows)); })
      .catch(() => { if (live) { setCounts({}); setCountsError("Some record counts could not load."); } });
    fetch("/api/health")
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((health) => { if (live) setAi(health.aiConfigured ? "Configured, untested" : "Not configured"); })
      .catch(() => { if (live) setAi("Status unavailable"); });
    return () => { live = false; };
  }, []);

  const totals = BUCKETS.map((bucket) => {
    const values = bucket.collections.map((name) => counts?.[name]);
    const hidden = values.every((value) => value === "hidden");
    const count = values.reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
    return { ...bucket, count, hidden };
  });
  const records = totals.reduce((sum, bucket) => sum + bucket.count, 0);

  function pick(id: PersonaId) {
    const next = login(id);
    setOpen(false);
    if (next && !canAccess(next, "/settings")) router.push(next.home);
  }

  function exportSummary() {
    const lines = [
      "Sample workspace",
      `Role: ${user?.role ?? "Not signed in"}`,
      "Records on this local server:",
      ...totals.map((bucket) => `${bucket.label}: ${counts ? bucket.count : "still loading"}`),
      "No cloud quota is on file.",
      "This file is a count summary, not a copy of the records.",
    ];
    downloadText("workspace-summary.txt", lines.join("\n"));
  }

  async function resetWorkspace() {
    setResetMsg("");
    const res = await fetch("/api/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const body = await res.json().catch(() => null);
    setConfirmReset(false);
    if (!res.ok) {
      setResetMsg(body?.error || "Workspace reset is disabled.");
      return;
    }
    clearLocalWorkspace();
    window.location.reload();
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h1>Workspace settings</h1>
          <div className={styles.switch}>
          <button type="button" className={styles.switchBtn} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)}>
            <Building2 size={15} aria-hidden="true" /> Switch role <ChevronDown size={14} aria-hidden="true" />
          </button>
          {open && (
            <div id={menuId} className={styles.menu} role="menu">
              {PERSONAS.map((persona) => (
                <button key={persona.id} type="button" role="menuitem" aria-current={user?.id === persona.id ? "true" : undefined} onClick={() => pick(persona.id)}>
                  <strong>{persona.role}</strong>
                  <span>{persona.name}</span>
                </button>
              ))}
              <p>One sample workspace. Switching changes the role, not a separate fund.</p>
            </div>
          )}
          </div>
        </div>
        <p>Understand your access, where your work is saved, and which services are connected.</p>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.identity}>
            <div className={styles.mark} aria-hidden="true">{user?.initials ?? "OS"}</div>
            <div>
              <h2>Your sample workspace <span className={styles.badge}>Sample environment</span></h2>
              <p>A private workspace for exploring the platform. Records stay on this local server.</p>
            </div>
          </div>
          <div className={styles.storage} id="storage">
            <div className={styles.storageHead}>
              <h2>Workspace storage</h2>
              <a href="#storage-breakdown">Record mix</a>
            </div>
            <div className={styles.barRow}>
              <div className={styles.bar} role="img" aria-label={counts ? `${records} records on this server` : "Counting records"}>
                {totals.map((bucket) => <i key={bucket.key} style={{ width: records ? `${(bucket.count / records) * 100}%` : 0, background: bucket.color }} />)}
              </div>
              <b className={styles.total}>{counts ? `${records} records${totals.some((bucket) => bucket.hidden) ? " this role can read" : ""}` : "—"}</b>
            </div>
            <p className={styles.cap}>Saved on this local server. No cloud quota is on file.</p>
            <ul className={styles.legend} id="storage-breakdown">
              {totals.map((bucket) => (
                <li key={bucket.key}><i style={{ background: bucket.color }} /><span>{bucket.label}</span><b>{!counts ? "—" : bucket.hidden ? "Outside this role" : bucket.count}</b></li>
              ))}
            </ul>
            {countsError && <p className={styles.note} role="alert">{countsError}</p>}
          </div>
        </div>
        <div className={styles.facts}>
          <div className={styles.fact}><UserRound size={18} aria-hidden="true" /><span>Current role</span><b>{user?.role ?? "—"}</b></div>
          <div className={styles.fact}><Database size={18} aria-hidden="true" /><span>Data storage</span><b>Saved on this local server</b></div>
          <div className={styles.fact}>
            <Shield size={18} aria-hidden="true" />
            <span>Account security</span>
            <b>Role access <button type="button" aria-expanded={security} aria-label="About role access" onClick={() => setSecurity((value) => !value)}><Info size={14} /></button></b>
          </div>
          {security && <p className={styles.security}>Each request sends the selected role, and the server rejects actions that role cannot take. There is still no password. Do not enter confidential deal information.</p>}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h2>Integrations</h2>
            <p className={styles.sub}>Connect and manage your data sources. View actual configuration and data sources.</p>
          </div>
          <Link href="/marketplace" className={styles.manage}><Building2 size={14} aria-hidden="true" /> Manage integrations</Link>
        </div>
        <div className={styles.grid}>
          {SERVICES.map((service) => {
            const status = service.name === "AI analysis" ? ai : service.ready ? "Public APIs available" : "Not connected";
            const live = status !== "Not connected" && status !== "Not configured" && status !== "Status unavailable";
            return (
              <Link key={service.name} href={service.href} className={styles.service}>
                <div className={styles.serviceHead}>
                  <span className={styles.tile} style={{ background: service.tint }}>{service.name.slice(0, 1)}</span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                </div>
                <h3>{service.name}</h3>
                <p>{service.blurb}</p>
                <span className={styles.status}><i className={live ? `${styles.dot} ${styles.live}` : styles.dot} />{status}</span>
              </Link>
            );
          })}
        </div>
        <p className={styles.quiet}>Nothing here has a last-sync time. A sample record is not a live connection.</p>
      </section>

      <div className={styles.split}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2>Getting started</h2>
              <p className={styles.sub}>Walk through your first investment review.</p>
            </div>
            <Link href="/training" className={styles.guide}>View guide</Link>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.href}>
                <Link href={step.href}>
                  <span className={styles.num}>{index + 1}</span>
                  <span><strong>{step.title}</strong><span>{step.text}</span></span>
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.card}>
          <h2>Quick actions</h2>
          <p className={styles.sub}>Common workspace tasks.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.action} style={{ background: "#f8fafc" }} onClick={() => setOpen(true)}>
              <i><Users size={15} /></i><strong>Sample roles</strong><span>The roles already on this workspace.</span>
            </button>
            <button type="button" className={styles.action} style={{ background: "#f8fafc" }} onClick={() => setSecurity(true)}>
              <i><Shield size={15} /></i><strong>Security and access</strong><span>Role checks on each request. No password.</span>
            </button>
            <a className={styles.action} style={{ background: "#f5f3ff" }} href="#storage">
              <i><Database size={15} /></i><strong>View storage</strong><span>See what is saved on this server.</span>
            </a>
            <button type="button" className={styles.action} style={{ background: "#f8fafc" }} onClick={exportSummary}>
              <i><Download size={15} /></i><strong>Export data</strong><span>Download a count summary, not the records.</span>
            </button>
            <Link className={styles.action} style={{ background: "#f8fafc" }} href="/dna">
              <i><Building2 size={15} /></i><strong>Investment preferences</strong><span>Sectors, stages and check size on file.</span>
            </Link>
            {user?.id === "partner" && <button type="button" className={`${styles.action} ${styles.reset}`} onClick={() => { setConfirmReset(true); setResetMsg(""); }}>
              <i><Database size={15} /></i><strong>Reset sample data</strong><span>Clear and reload the demo workspace.</span>
            </button>}
            {confirmReset && (
              <div className={styles.confirm}>
                <p>This restores the original sample records if the server allows it.</p>
                <button type="button" className={styles.cancel} onClick={() => setConfirmReset(false)}>Cancel</button>
                <button type="button" className={styles.clear} onClick={resetWorkspace}>Clear sample</button>
              </div>
            )}
          </div>
          {resetMsg && <p className={styles.note} role="status">{resetMsg}</p>}
        </section>
      </div>
    </div>
  );
}
