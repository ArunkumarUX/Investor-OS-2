import type { CaptureItem, CaptureKind } from "./capture";

const BASE = "/api/capture";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`capture API ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchCaptures(companyId: string): Promise<CaptureItem[]> {
  const { items } = await json<{ items: CaptureItem[] }>(
    await fetch(`${BASE}?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" })
  );
  return items;
}

export async function fetchAllCaptures(): Promise<CaptureItem[]> {
  const { items } = await json<{ items: CaptureItem[] }>(
    await fetch(BASE, { cache: "no-store" })
  );
  return items;
}

export async function fetchCaptureSummary(): Promise<
  Record<string, { total: number; kinds: Record<string, number> }>
> {
  const { summary } = await json<{ summary: Record<string, { total: number; kinds: Record<string, number> }> }>(
    await fetch(`${BASE}?summary=1`, { cache: "no-store" })
  );
  return summary;
}

export async function addCapture(input: {
  companyId: string;
  kind: CaptureKind;
  body: string;
  author?: string;
  meta?: Record<string, unknown>;
}): Promise<CaptureItem> {
  const { item } = await json<{ item: CaptureItem }>(
    await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return item;
}

export async function updateCapture(
  id: string,
  patch: { body?: string; meta?: Record<string, unknown> }
): Promise<CaptureItem> {
  const { item } = await json<{ item: CaptureItem }>(
    await fetch(BASE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
  );
  return item;
}

export async function deleteCapture(id: string): Promise<void> {
  await json(await fetch(`${BASE}?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" } }));
}
