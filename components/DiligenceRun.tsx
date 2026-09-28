"use client";

import { useCallback, useEffect, useState } from "react";
import DiligenceReport from "@/components/DiligenceReport";
import DiligenceSequence from "@/components/DiligenceSequence";
import IntelligenceReview from "@/components/IntelligenceReview";

export default function DiligenceRun({
  companyId,
  name,
}: {
  companyId: string;
  name: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [token, setToken] = useState(0);

  const play = useCallback(() => {
    setToken((value) => value + 1);
    setPlaying(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (sessionStorage.getItem("diligence-play") === companyId || params.get("play") === "1") {
      sessionStorage.removeItem("diligence-play");
      if (params.get("play") === "1") {
        params.delete("play");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState(null, "", next);
      }
      play();
    }
    const onPlay = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail && detail !== companyId) return;
      sessionStorage.removeItem("diligence-play");
      play();
    };
    window.addEventListener("diligence-play", onPlay);
    return () => window.removeEventListener("diligence-play", onPlay);
  }, [companyId, play]);

  return (
    <>
      {playing ? (
        <DiligenceSequence key={token} companyId={companyId} onDone={() => setPlaying(false)} />
      ) : (
        <DiligenceReport companyId={companyId} />
      )}
      <div hidden={playing}>
        <IntelligenceReview companyId={companyId} name={name} embedded />
      </div>
    </>
  );
}
