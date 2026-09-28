export type VideoPlayback = { kind: "file" | "embed"; src: string };

const FILE_EXT = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

export function videoPlayback(raw: string): VideoPlayback | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("/uploads/videos/")) return { kind: "file", src: value };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? { kind: "embed", src: `https://www.youtube.com/embed/${encodeURIComponent(id)}` } : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const id = url.searchParams.get("v") || (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : url.pathname.startsWith("/shorts/") ? url.pathname.split("/")[2] : "");
    return id ? { kind: "embed", src: `https://www.youtube.com/embed/${encodeURIComponent(id)}` } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter((part) => /^\d+$/.test(part))[0];
    return id ? { kind: "embed", src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (host === "loom.com" || host.endsWith(".loom.com")) {
    const id = url.pathname.split("/").filter(Boolean).pop();
    return id ? { kind: "embed", src: `https://www.loom.com/embed/${encodeURIComponent(id)}` } : null;
  }
  if (FILE_EXT.test(url.pathname)) return { kind: "file", src: url.href };
  return { kind: "embed", src: url.href };
}
