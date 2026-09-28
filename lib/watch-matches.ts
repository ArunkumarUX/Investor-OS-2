import type { IntelligenceState, PublicResult } from "./intelligence-types";
// Apply fetched metadata atomically; callers fetch outside the storage lock.
export function applyWatchMatches(
  state: IntelligenceState,
  watchId: string,
  items: PublicResult[],
  warnings: string[],
  now: string,
): number {
  const watch = state.watches.find((w) => w.id === watchId);
  if (!watch || !watch.enabled) return 0;
  const fresh = watch.lastChecked
    ? items.filter((item) => !watch.seenIds.includes(item.id))
    : [];
  watch.lastChecked = now;
  watch.error = warnings.join(" ") || undefined;
  watch.seenIds = [
    ...new Set([...items.map((item) => item.id), ...watch.seenIds]),
  ].slice(0, 2000);
  let count = 0;
  for (const item of fresh) {
    if (
      state.events.some(
        (e) => e.companyId === watch.companyId && e.sourceUrl === item.url,
      )
    )
      continue;
    const event = {
      id: crypto.randomUUID(),
      companyId: watch.companyId,
      title: item.title,
      detail: `Public topic match for “${watch.query}”. ${item.context} Review relevance and company identity before changing the thesis.`,
      sourceUrl: item.url,
      impact: "neutral" as const,
      createdAt: now,
      acknowledged: false,
    };
    state.events.unshift(event);
    state.versions.unshift({
      id: crypto.randomUUID(),
      companyId: watch.companyId,
      createdAt: now,
      trigger: "Public source watch · review needed",
      body: `${event.title}\n\n${event.detail}\nSource: ${item.url}\nPublished: ${item.publishedAt || "Unknown"}`,
      sourceIds: [event.id],
    });
    count++;
  }
  return count;
}
