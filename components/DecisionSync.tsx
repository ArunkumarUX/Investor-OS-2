"use client";
import { useEffect, useState } from "react";
import { refreshServerDecisions } from "@/lib/store";
export default function DecisionSync() {
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => {
      refreshServerDecisions()
        .then(() => setError(""))
        .catch(() =>
          setError(
            "Server decisions could not load. Reconnect before recording a verdict.",
          ),
        );
    };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);
  return error ? (
    <p className="error-note m-4" role="alert">
      {error}
      <button
        className="underline ml-2"
        onClick={() =>
          refreshServerDecisions()
            .then(() => setError(""))
            .catch(() => {})
        }
      >
        Retry
      </button>
    </p>
  ) : null;
}
