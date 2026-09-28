"use client";
import { useState } from "react";
import type { CaptureItem } from "@/lib/capture";
import { videoPlayback } from "@/lib/video";
import { EmptyState, PrimaryButton, TextInput } from "@/components/CaptureUI";

type Mut = {
  busy: boolean;
  add: (item: { companyId: string; kind: "video"; body: string; author: string; meta: { url: string; source: "link" | "upload" } }) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

function Player({ url, title }: { url: string; title: string }) {
  const playback = videoPlayback(url);
  if (!playback) {
    return <p className="text-sm text-[var(--text-muted)]">This link cannot be played here. Open it in a new tab.</p>;
  }
  if (playback.kind === "file") {
    return <video className="w-full rounded-lg bg-black" controls preload="metadata" src={playback.src} />;
  }
  return <iframe className="w-full aspect-video rounded-lg bg-black" src={playback.src} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
}

export default function VideoEvidence({
  companyId,
  items,
  author,
  mut,
}: {
  companyId: string;
  items: CaptureItem[];
  author: string;
  mut: Mut;
}) {
  const videos = items.filter((item) => item.kind === "video");
  const pitchUrl = items.find((item) => item.kind === "pitch")?.meta?.videoUrl?.trim() ?? "";
  const pitchAlreadyListed = videos.some((item) => item.meta?.url === pitchUrl);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function addLink() {
    setError("");
    const playback = videoPlayback(url);
    if (!playback || !/^https?:\/\//.test(url.trim())) {
      setError("Paste a YouTube, Vimeo, Loom, or direct video link.");
      return;
    }
    await mut.add({ companyId, kind: "video", body: title.trim() || "Video evidence", author, meta: { url: url.trim(), source: "link" } });
    setTitle("");
    setUrl("");
  }

  async function addFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/evidence-video", { method: "POST", body });
      const data = (await response.json()) as { url?: string; error?: string; name?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed.");
      await mut.add({
        companyId,
        kind: "video",
        body: title.trim() || data.name || file.name,
        author,
        meta: { url: data.url, source: "upload" },
      });
      setTitle("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 space-y-3">
        {pitchUrl && !pitchAlreadyListed && (
          <article className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1">Pitch recording</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">Saved with the pitch. It sits with the rest of the evidence.</p>
            <Player url={pitchUrl} title="Pitch recording" />
          </article>
        )}
        {videos.length === 0 && !pitchUrl && (
          <EmptyState icon="🎬" title="No videos yet" hint="Add a founder recording, product demo, or customer interview. A link or an uploaded file both count as evidence." />
        )}
        {videos.map((item) => (
          <article key={item.id} className="glass rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold">{item.body || "Video evidence"}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">{item.meta?.source === "upload" ? "Uploaded file" : "Linked recording"} · {item.author}</p>
              </div>
              <button type="button" className="text-xs underline text-[var(--text-muted)]" onClick={() => void mut.remove(item.id)}>Remove</button>
            </div>
            {item.meta?.url ? <Player url={item.meta.url} title={item.body || "Video evidence"} /> : <p className="text-sm text-[var(--text-muted)]">No playable address was saved.</p>}
          </article>
        ))}
      </div>
      <div className="glass rounded-xl p-5 lg:col-span-2 h-fit space-y-3">
        <h3 className="font-semibold">Add a video</h3>
        <p className="text-sm text-[var(--text-muted)]">Use a recording the same way you use a document. Paste a link, or upload a file from this computer.</p>
        <TextInput label="Title" value={title} onChange={setTitle} placeholder="Product demo, founder interview…" />
        <TextInput label="Link" value={url} onChange={setUrl} placeholder="https://www.youtube.com/watch?v=…" />
        <PrimaryButton onClick={() => void addLink()} disabled={!url.trim() || mut.busy || uploading}>Save link</PrimaryButton>
        <label className="block text-sm">
          <span className="block mb-2 text-[var(--text-muted)]">Or upload a video</span>
          <input
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            disabled={mut.busy || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void addFile(file);
            }}
          />
        </label>
        {uploading && <p role="status" className="text-xs text-[var(--text-muted)]">Uploading…</p>}
        {error && <p role="alert" className="text-sm" style={{ color: "var(--accent-red)" }}>{error}</p>}
      </div>
    </div>
  );
}
