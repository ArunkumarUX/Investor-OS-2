import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 grid-bg"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold glow-blue"
        style={{ background: "linear-gradient(135deg, #0071E3, #42A5FF)" }}
      >
        IO
      </div>
      <div className="text-center">
        <div className="text-6xl font-bold mb-2 gradient-text-blue">404</div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          This deal doesn&apos;t exist
        </h1>
        <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
          The page you&apos;re looking for was moved, closed, or never sourced. The AI never misses a deal — but URLs sometimes slip through.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "var(--accent-blue)", color: "#fff" }}
        >
          ← Command Center
        </Link>
        <Link
          href="/discovery"
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          Browse deals →
        </Link>
      </div>
    </div>
  );
}
