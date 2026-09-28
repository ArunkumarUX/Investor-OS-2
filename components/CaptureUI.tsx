"use client";
import { useState } from "react";
import type { CaptureItem, CaptureKind } from "@/lib/capture";
import { addCapture, updateCapture, deleteCapture } from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/* Shared capture UI primitives — reused across every capture tab      */
/* ------------------------------------------------------------------ */

const KIND_META: Record<CaptureKind, { icon: string; label: string; color: string }> = {
  comment: { icon: "💬", label: "Comment", color: "#42A5FF" },
  pitch: { icon: "🎯", label: "Pitch", color: "#B7791F" },
  question: { icon: "❓", label: "Question", color: "#6D28D9" },
  answer: { icon: "💡", label: "Answer", color: "#1E9E52" },
  task: { icon: "☑️", label: "Task", color: "#0369A1" },
  meeting: { icon: "🗓️", label: "Meeting", color: "#BE123C" },
  vote: { icon: "🗳️", label: "IC Vote", color: "#B7791F" },
  document: { icon: "📄", label: "Document", color: "#1E9E52" },
  video: { icon: "🎬", label: "Video", color: "#0369A1" },
  diligence: { icon: "🔬", label: "Diligence", color: "#6D28D9" },
  decision: { icon: "⚖️", label: "Decision", color: "#1E9E52" },
};

export function kindMeta(kind: CaptureKind) {
  return KIND_META[kind] ?? KIND_META.comment;
}

export const fieldStyle = {
  background: "var(--bg-surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
} as const;

export function TextInput({
  value,
  onChange,
  placeholder,
  label,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  type?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
        style={fieldStyle}
      />
    </label>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-label={label ?? placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all resize-y"
        style={fieldStyle}
      />
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
        style={fieldStyle}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PrimaryButton({
  onClick,
  children,
  disabled,
  tone = "blue",
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: "blue" | "green" | "ghost";
}) {
  const bg =
    tone === "green"
      ? "rgba(30,158,82,0.15)"
      : tone === "ghost"
        ? "var(--bg-surface-2)"
        : "var(--accent-blue)";
  const color = tone === "blue" ? "#fff" : tone === "green" ? "var(--accent-green)" : "var(--text-muted)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: bg,
        color,
        border: tone === "blue" ? "none" : "1px solid var(--border)",
      }}
    >
      {children}
    </button>
  );
}

export function CaptureCard({
  item,
  onChange,
  onDelete,
  children,
}: {
  item: CaptureItem;
  onChange: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
}) {
  const meta = kindMeta(item.kind);
  return (
    <div
      className="glass rounded-xl p-4 fade-in"
      style={{ borderLeft: `3px solid ${meta.color}` }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span aria-hidden="true">{meta.icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-[11px] truncate" style={{ color: "var(--text-subtle)" }}>
            {item.author} · {new Date(item.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            aria-label={`Delete ${meta.label.toLowerCase()}`}
            className="text-xs flex-shrink-0 px-2 py-1 rounded transition-all hover:opacity-70"
            style={{ color: "var(--text-subtle)" }}
          >
            ✕
          </button>
        )}
      </div>
      {item.body && (
        <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>
          {item.body}
        </p>
      )}
      {children}
      {/* hidden onChange hook keeps parent refresh wired */}
      <span className="hidden" aria-hidden="true" onClick={onChange} />
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div
      className="rounded-xl border border-dashed py-10 px-6 text-center"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="text-2xl mb-2" aria-hidden="true">{icon}</div>
      <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {title}
      </div>
      <div className="text-xs max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>
        {hint}
      </div>
    </div>
  );
}

/** Shared mutation helper: post/patch/delete then refresh. Throws on failure so callers can show honest feedback. */
export function useCaptureMutations(refresh: () => void) {
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setLastError(null);
    try {
      const result = await fn();
      refresh();
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed — check connection and retry";
      console.error(e);
      setLastError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    lastError,
    clearError: () => setLastError(null),
    add: (input: Parameters<typeof addCapture>[0]) => run(() => addCapture(input)),
    patch: (id: string, patch: Parameters<typeof updateCapture>[1]) =>
      run(() => updateCapture(id, patch)),
    remove: (id: string) => run(() => deleteCapture(id)),
  };
}
