import Link from "next/link";
import { ArrowRight, Construction, type LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Shared scaffold for Investor OS sections being built out.             */
/* Matches the internal AI look: white cards, indigo accent, lucide.   */
/* ------------------------------------------------------------------ */

export interface StatTile {
  label: string;
  value: string;
  tone?: "blue" | "gold" | "green";
}

export interface FeatureRow {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface CrossLink {
  href: string;
  label: string;
}

const toneColor: Record<string, string> = {
  blue: "var(--accent-blue)",
  gold: "var(--accent-gold)",
  green: "var(--accent-green)",
};

export default function SectionStub({
  icon: Icon,
  title,
  kicker,
  intro,
  stats,
  features,
  links,
}: {
  icon: LucideIcon;
  title: string;
  kicker: string;
  intro: string;
  stats?: StatTile[];
  features: FeatureRow[];
  links?: CrossLink[];
}) {
  return (
    <div className="p-4 md:p-8 fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-2">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#eef0ff", border: "1px solid rgba(81,70,229,0.18)", color: "var(--accent-blue)" }}
        >
          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-blue)" }}>
            {kicker}
          </div>
          <h1 className="t-h2" style={{ color: "var(--text-primary)" }}>
            {title}
          </h1>
        </div>
      </div>

      <p className="text-sm md:text-base leading-relaxed max-w-2xl mb-6" style={{ color: "var(--text-muted)" }}>
        {intro}
      </p>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-xl p-4">
              <div className="text-2xl font-bold mb-1 tnum" style={{ color: s.tone ? toneColor[s.tone] : "var(--text-primary)" }}>
                {s.value}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
        {features.map(({ icon: FIcon, title: ft, desc }) => (
          <div key={ft} className="glass rounded-xl p-5 card-hover">
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#eef0ff", color: "var(--accent-blue)" }}
              >
                <FIcon size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="t-h4 uppercase" style={{ color: "var(--text-primary)" }}>
                {ft}
              </h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "rgba(148,96,18,0.07)", border: "1px solid rgba(148,96,18,0.2)" }}
      >
        <div className="flex items-center gap-3">
          <Construction size={18} strokeWidth={1.75} aria-hidden="true" style={{ color: "var(--accent-gold)" }} />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            This section is scaffolded — the workflows above are being wired up. Demo data only.
          </span>
        </div>
        {links && links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs px-3 py-2 rounded-full font-medium transition-all hover:opacity-90 inline-flex items-center gap-1.5"
                style={{ background: "var(--accent-blue)", color: "#fff" }}
              >
                {l.label}
                <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
