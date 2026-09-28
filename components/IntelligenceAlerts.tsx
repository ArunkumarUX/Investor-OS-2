"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function IntelligenceAlerts() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/intelligence")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (alive && data)
            setCount(
              data.events.filter(
                (e: { acknowledged: boolean }) => !e.acknowledged,
              ).length,
            );
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return count ? (
    <Link className="panel row-link mb-6" href="/portfolio">
      <div>
        <h2 className="font-semibold">
          {count} sourced {count === 1 ? "change needs" : "changes need"} a
          review
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Review the source and its impact before updating your investment view.
        </p>
      </div>
      <span aria-hidden="true">→</span>
    </Link>
  ) : null;
}
