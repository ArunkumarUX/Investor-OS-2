"use client";
import ThesisUpdates from "@/components/ThesisUpdates";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Download, MoreHorizontal, Search, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { downloadCSV } from "@/lib/export";
import { liveHoldings, type Holding } from "@/lib/portfolio-book";
import { classifyNote, lpBrief, watchBoard } from "@/lib/operating-picture";
import { subscribeStore, getStoreSnapshot, getStoreServerSnapshot, parseSnapshot } from "@/lib/store";
import styles from "./portfolio.module.css";

const TONES = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#22c55e"];

function mark(name: string) {
  return name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function tone(name: string) {
  return TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
}

function healthOf(status: Holding["status"]) {
  if (status === "red") return { label: "At risk", color: "#ef4444" };
  if (status === "yellow") return { label: "Watch", color: "#f59e0b" };
  return { label: "Healthy", color: "#22c55e" };
}

function answerFor(question: string, holdings: Holding[], invested: number, current: number, multiple: number | null) {
  const text = question.toLowerCase();
  const hit = holdings.find((item) => text.includes(item.name.toLowerCase()));
  if (hit) {
    const note = hit.alerts[0] ?? "No alert is on the record.";
    return `${hit.name} is marked at ${hit.invested} cost and ${hit.currentValue} value, ${hit.multiple}. ${note}`;
  }
  if (/alert|risk|watch/.test(text)) {
    const flagged = holdings.filter((item) => item.alerts.length > 0);
    if (!flagged.length) return "No portfolio alert is on the record.";
    return flagged.map((item) => `${item.name}: ${item.alerts.join(" ")}`).join(" ");
  }
  if (/cost|value|multiple|total|book/.test(text)) {
    return `Marked cost is $${invested.toFixed(1)}M and marked value is $${current.toFixed(1)}M${multiple ? `, ${multiple.toFixed(2)}× on that snapshot` : ""}. That ratio is a current snapshot, not a period return.`;
  }
  return "This book has no passage for that question. It will not answer from outside the portfolio record.";
}

export default function PortfolioPage() {
  const stages = parseSnapshot(useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreServerSnapshot)).stages;
  const portfolio = liveHoldings(stages);
  const watch = watchBoard(stages);
  const brief = lpBrief(portfolio);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [sector, setSector] = useState("all");
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const stageOptions = [...new Set(portfolio.map((item) => item.stage))];
  const sectorOptions = [...new Set(portfolio.map((item) => item.sector))];
  const rows = portfolio.filter((item) => {
    const haystack = `${item.name} ${item.sector} ${item.stage}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase()) && (stage === "all" || item.stage === stage) && (sector === "all" || item.sector === sector);
  });

  const health = useMemo(() => {
    const bands = [
      { key: "green" as const, label: "Healthy", color: "#22c55e" },
      { key: "yellow" as const, label: "Watch", color: "#f59e0b" },
      { key: "red" as const, label: "At risk", color: "#ef4444" },
    ];
    return bands.map((band) => {
      const n = portfolio.filter((item) => item.status === band.key).length;
      return { ...band, n, share: portfolio.length ? Math.round((n / portfolio.length) * 100) : 0 };
    });
  }, [portfolio]);

  const donut = useMemo(() => {
    let cursor = 0;
    const stops = health.map((band) => {
      const start = cursor;
      cursor += band.share;
      return `${band.color} ${start}% ${cursor}%`;
    });
    return stops.join(", ") || "#e8eef5 0 100%";
  }, [health]);

  const byStage = useMemo(() => {
    const map = new Map<string, number>();
    portfolio.forEach((item) => map.set(item.stage, (map.get(item.stage) ?? 0) + 1));
    return [...map.entries()];
  }, [portfolio]);

  const bySector = useMemo(() => {
    const map = new Map<string, number>();
    portfolio.forEach((item) => {
      const value = parseFloat(item.currentValue.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(value)) map.set(item.sector, (map.get(item.sector) ?? 0) + (/k/i.test(item.currentValue) ? value / 1000 : value));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [portfolio]);

  const alerts = portfolio.filter((item) => item.alerts.length > 0);
  const changes = alerts.flatMap((item) => item.alerts.map((note) => ({ id: item.id, name: item.name, note, kind: classifyNote(note) })));
  const maxStage = Math.max(1, ...byStage.map((entry) => entry[1]));
  const maxSector = Math.max(1, ...bySector.map((entry) => entry[1]));
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const ask = (text: string) => {
    const next = text.trim();
    if (!next) return;
    setQuestion(next);
    setAnswer(answerFor(next, portfolio, brief.invested, brief.current, brief.multiple));
    setAsking(true);
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1>Portfolio Intelligence</h1>
          <p>A complete view of the book: marked cost, marked value, and the alerts on the record.</p>
        </div>
        <div className={styles.tools}>
          <span className={styles.quiet}>{today}</span>
          <span className={styles.quiet}>Current snapshot</span>
          <button type="button" className={styles.ask} onClick={() => setAsking((open) => !open)}><Sparkles size={14} aria-hidden="true" />Ask about portfolio</button>
        </div>
      </header>

      {asking && (
        <section className={styles.askPanel}>
          <form onSubmit={(event) => { event.preventDefault(); ask(question); }}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about a holding or an alert" aria-label="Ask about the portfolio" />
            <button type="submit">Ask</button>
          </form>
          {answer && <p className={styles.answer}>{answer}</p>}
          <div className={styles.prompts}>
            {["What is the book worth?", "Which holdings have an alert?", "Tell me about TerraByte"].map((prompt) => (
              <button key={prompt} type="button" onClick={() => ask(prompt)}>{prompt}</button>
            ))}
          </div>
        </section>
      )}

      <section className={styles.kpis} aria-label="Book snapshot">
        <article className={styles.kpi}><i><Wallet size={16} /></i><b>${brief.invested.toFixed(1)}M</b><span>Marked cost</span><small>Current book. No prior period is on file.</small></article>
        <article className={styles.kpi}><i><TrendingUp size={16} /></i><b>${brief.current.toFixed(1)}M</b><span>Marked value</span><small>Sum of marked holding values.</small></article>
        <article className={styles.kpi}><i><TrendingUp size={16} /></i><b>{brief.multiple ? `${brief.multiple.toFixed(2)}×` : "—"}</b><span>Snapshot multiple</span><small>Value divided by cost. Not a period return.</small></article>
        <article className={styles.kpi}><i><AlertTriangle size={16} /></i><b>{brief.flagged}</b><span>With an alert</span><small>{portfolio.length} companies in the book.</small></article>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHead}>
          <div>
            <h2>Portfolio overview</h2>
            <p className={styles.sub}>Holdings with the cost and value marked on the record.</p>
          </div>
          <div className={styles.filters}>
            <label><Search size={14} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search holdings" aria-label="Search holdings" /></label>
            <label>
              <select aria-label="Stage" value={stage} onChange={(event) => setStage(event.target.value)}>
                <option value="all">All stages</option>
                {stageOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <select aria-label="Sector" value={sector} onChange={(event) => setSector(event.target.value)}>
                <option value="all">All sectors</option>
                {sectorOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <button type="button" className={styles.export} onClick={() => downloadCSV("portfolio", ["Company", "Sector", "Stage", "Invested", "Current value", "Multiple", "Status", "Alert"], rows.map((item) => [item.name, item.sector, item.stage, item.invested, item.currentValue, item.multiple, healthOf(item.status).label, item.alerts[0] ?? ""]))}><Download size={14} />Export</button>
          </div>
        </header>
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Company</th><th>Stage</th><th>Invested</th><th>Value</th><th>Multiple</th><th>Health</th><th>On the record</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const health = healthOf(item.status);
                return (
                  <tr key={item.id}>
                    <td>
                      <Link className={styles.company} href={`/company/${item.id}`}>
                        <span className={styles.mark} style={{ background: tone(item.name) }}>{mark(item.name)}</span>
                        <span><strong>{item.name}</strong><small>{item.sector}</small></span>
                      </Link>
                    </td>
                    <td><span className={styles.pill}>{item.stage}</span></td>
                    <td>{item.invested}</td>
                    <td>{item.currentValue}</td>
                    <td>{item.multiple}</td>
                    <td><span className={styles.health}><i className={styles.dot} style={{ background: health.color }} />{health.label}</span></td>
                    <td className={styles.change}>{item.alerts[0] ?? "No alert"}</td>
                    <td><Link className={styles.open} href={`/company/${item.id}`} aria-label={`Open ${item.name}`}><MoreHorizontal size={16} /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className={styles.empty}>No holding matches that filter.</p>}
        </div>
      </section>

      <div className={styles.sectionHead}>
        <div><h2>What the book is showing</h2><p className={styles.sub}>Coloured names are alerts on the record. The other lines are the company file, not a live feed.</p></div>
      </div>
      <section className={styles.insights}>
        {watch.columns.map((column) => (
          <article key={column.id} className={styles.insight}>
            <h3>{column.label}</h3>
            <ul>
              {column.items.slice(0, 5).map((item) => (
                <li key={item.id + item.note} data-alert={String(item.alert)}>
                  <Link href={`/company/${item.id}`}><b>{item.name}</b> {item.note}</Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <div className={styles.sectionHead}>
        <h2>Portfolio alerts <span style={{ color: "#2563eb" }}>{alerts.length}</span></h2>
        <Link href="#changes">On the record</Link>
      </div>
      <section className={styles.alerts}>
        {alerts.map((item) => (
          <Link key={item.id} className={styles.alert} href={`/company/${item.id}`}>
            <span className={styles.mark} style={{ background: tone(item.name), width: 28, height: 28 }}>{mark(item.name)}</span>
            <strong>{item.name}</strong>
            <p>{item.alerts[0]}</p>
            <small>{classifyNote(item.alerts[0])} · on the record{item.alerts.length > 1 ? ` · ${item.alerts.length} notes` : ""}</small>
          </Link>
        ))}
      </section>

      <div className={styles.split} id="changes">
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <div><h2>Changes on the record</h2><p className={styles.sub}>Alerts written on the portfolio. Opening one does not mark it reviewed.</p></div>
          </header>
          <ul className={styles.review}>
            {changes.map((item) => (
              <li key={item.id + item.note}>
                <span className={styles.badge}>{mark(item.name)}</span>
                <div><strong>{item.name}</strong><p>{item.note}</p></div>
                <Link href={`/company/${item.id}`}>Review</Link>
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.card}>
          <header className={styles.cardHead}><h2>Portfolio health</h2></header>
          <div className={styles.healthGrid}>
            <div className={styles.donut} style={{ background: `conic-gradient(${donut})` }}><b>{portfolio.length}</b></div>
            <ul className={styles.legend}>
              {health.map((band) => (
                <li key={band.key}><i className={styles.dot} style={{ background: band.color }} /><span>{band.label}</span><b>{band.n}</b><span>{band.share}%</span></li>
              ))}
            </ul>
          </div>
          <div className={styles.bars}>
            <div>
              <h3>Stage</h3>
              {byStage.map(([label, count]) => (
                <div key={label} className={styles.bar}><span>{label}</span><i><span style={{ width: `${(count / maxStage) * 100}%` }} /></i><b>{count}</b></div>
              ))}
            </div>
            <div>
              <h3>Value by sector</h3>
              {bySector.map(([label, value]) => (
                <div key={label} className={styles.bar}><span>{label}</span><i><span style={{ width: `${(value / maxSector) * 100}%` }} /></i><b>${value.toFixed(1)}M</b></div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <div className={styles.later}><ThesisUpdates /></div>
    </div>
  );
}
