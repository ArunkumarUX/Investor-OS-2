"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { companies } from "@/lib/mock-data";
import { AGENTS } from "@/lib/intelligence-types";
import styles from "@/app/diligence/sequence.module.css";

export function requestDiligencePlay(companyId: string) {
  sessionStorage.setItem("diligence-play", companyId);
  window.dispatchEvent(new CustomEvent("diligence-play", { detail: companyId }));
}

type Item = { label: string; result: string };
type Stage = { title: string; caption: string; items: Item[] };

function stagesFor(company: (typeof companies)[number]): Stage[] {
  const claims = [
    company.bulls[0],
    company.revenue,
    company.growth,
    company.founders[0] ? `${company.founders[0].name} background` : "Founder background",
    company.bulls[2] ?? company.bulls[1],
  ].filter(Boolean);
  return [
    {
      title: company.name,
      caption: "Diligence opened",
      items: [
        { label: company.tagline, result: "On file" },
        { label: `${company.stage} · ${company.sector}`, result: "On file" },
        { label: company.geography === "USA" ? "United States" : company.geography, result: "On file" },
      ],
    },
    {
      title: "Reading the file",
      caption: "Company record",
      items: [
        { label: "Revenue and round", result: "Read" },
        { label: "Team biographies", result: "Read" },
        { label: "Market sizes", result: "Read" },
        { label: "Stated risks", result: "Read" },
      ],
    },
    {
      title: "Checking sources",
      caption: "What is actually attached",
      items: [
        { label: "Company file", result: "Read" },
        { label: "Uploaded evidence", result: "Counted" },
        { label: "Independent sources", result: "None on file" },
      ],
    },
    {
      title: "Cross-checking claims",
      caption: "Each line stays company-reported until a source exists",
      items: claims.slice(0, 4).map((label) => ({ label, result: "Company only" })),
    },
    {
      title: "Evidence map",
      caption: "Support, gaps, and what is still open",
      items: [
        { label: "Claims listed", result: "Listed" },
        { label: "Independent support", result: "None yet" },
        { label: "Open checks", result: "Marked" },
      ],
    },
    {
      title: "Eight-role reading",
      caption: "Each role reads the same file",
      items: AGENTS.map((agent) => ({ label: agent.label, result: "Read" })),
    },
    {
      title: "Report ready",
      caption: "Opening the investment case",
      items: [{ label: "Nothing new was independently verified", result: "Shown in the report" }],
    },
  ];
}

export default function DiligenceSequence({
  companyId,
  onDone,
}: {
  companyId: string;
  onDone: () => void;
}) {
  const company = companies.find((item) => item.id === companyId);
  const stages = useMemo(() => (company ? stagesFor(company) : []), [company]);
  const [stage, setStage] = useState(0);
  const [step, setStep] = useState(0);
  const activeRef = useRef<HTMLElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [stage]);

  useEffect(() => {
    if (!stages.length) {
      doneRef.current();
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const timer = window.setTimeout(() => doneRef.current(), 280);
      return () => window.clearTimeout(timer);
    }
    let currentStage = 0;
    let currentStep = 0;
    let hold = false;
    let finish: number | undefined;
    const timer = window.setInterval(() => {
      const items = stages[currentStage].items;
      if (currentStep < items.length) {
        currentStep += 1;
        setStage(currentStage);
        setStep(currentStep);
        return;
      }
      if (currentStage >= stages.length - 1) {
        window.clearInterval(timer);
        finish = window.setTimeout(() => doneRef.current(), 900);
        return;
      }
      if (!hold) {
        hold = true;
        return;
      }
      hold = false;
      currentStage += 1;
      currentStep = 0;
      setStage(currentStage);
      setStep(0);
    }, 420);
    return () => {
      window.clearInterval(timer);
      if (finish) window.clearTimeout(finish);
    };
  }, [stages]);

  if (!company) return null;
  const progress = stages.length
    ? (stage + (stages[stage].items.length ? step / stages[stage].items.length : 1)) / stages.length
    : 0;

  return (
    <section className={styles.film} aria-label="Diligence in progress">
      <header className={styles.head}>
        <div>
          <p>AI diligence</p>
          <h1>{company.name}</h1>
          <p className={styles.now} role="status">{stages[stage]?.title}. {stages[stage]?.caption}.</p>
        </div>
        <button type="button" className={styles.skip} onClick={onDone}>Skip</button>
      </header>
      <div className={styles.meter} aria-hidden="true"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      <div className={styles.row}>
        {stages.map((item, index) => {
          const state = index < stage ? "done" : index === stage ? "active" : "wait";
          const shown = state === "done" ? item.items.length : state === "active" ? step : 0;
          return (
            <article
              key={item.title}
              ref={state === "active" ? activeRef : undefined}
              className={styles.card}
              data-state={state}
            >
              <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              <h2>{item.title}</h2>
              <p>{item.caption}</p>
              <ul>
                {item.items.map((line, lineIndex) => (
                  <li key={line.label} data-state={lineIndex < shown ? "done" : lineIndex === shown && state === "active" ? "now" : "wait"}>
                    <span>{line.label}</span>
                    {lineIndex < shown ? <em>{line.result}</em> : null}
                  </li>
                ))}
              </ul>
              {index === stages.length - 1 && state === "active" ? (
                <div className={styles.ring} style={{ background: `conic-gradient(#c4a574 ${Math.round(progress * 360)}deg, #2c4549 0deg)` }} aria-hidden="true">
                  <strong>Ready</strong>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
