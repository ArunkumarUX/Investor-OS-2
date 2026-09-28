"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where error reporting hooks in (Sentry etc.)
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6" style={{ background: "var(--bg-base)" }}>
      <div className="text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Something broke in the analysis pipeline
        </h1>
        <p className="text-sm max-w-sm mb-1" style={{ color: "var(--text-muted)" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-xs font-mono" style={{ color: "var(--text-subtle)" }}>ref: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "var(--accent-blue)", color: "#fff" }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          Back to Command Center
        </Link>
      </div>
    </div>
  );
}
