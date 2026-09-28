"use client";
import { useEffect, useState } from "react";

export default function ClockGreeting() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only state after the server render.
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
        &nbsp;
      </div>
    );
  }

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
      {greeting} · {dateStr} ·{" "}
      <span className="tnum">
        {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}
