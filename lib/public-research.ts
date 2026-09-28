import type { PublicResult } from "@/lib/intelligence-types";
const cache = new Map<
  string,
  { at: number; items: PublicResult[]; warnings: string[] }
>();
const urlOrNull = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};
export async function searchPublicResearch(query: string) {
  const key = query.toLowerCase();
  const saved = cache.get(key);
  if (saved && Date.now() - saved.at < 300000)
    return {
      ...saved,
      retrievedAt: new Date(saved.at).toISOString(),
      cached: true,
    };
  const results = await Promise.allSettled([
    fetch(
      `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=8&query=${encodeURIComponent(query)}`,
      {
        signal: AbortSignal.timeout(12000),
        headers: { Accept: "application/json" },
      },
    ).then(async (response) => {
      if (!response.ok) throw new Error("Technology news unavailable");
      const data = await response.json();
      if (!Array.isArray(data.hits))
        throw new Error("Unexpected news response");
      return data.hits.flatMap((hit: Record<string, unknown>) => {
        if (typeof hit.title !== "string" || typeof hit.objectID !== "string")
          return [];
        const url =
          urlOrNull(hit.url) ??
          `https://news.ycombinator.com/item?id=${encodeURIComponent(hit.objectID)}`;
        return [
          {
            id: `hn-${hit.objectID}`,
            title: hit.title.slice(0, 500),
            url,
            publishedAt:
              typeof hit.created_at === "string" ? hit.created_at : "",
            source: "Hacker News / Algolia",
            context:
              "Community-submitted link. The linked article and company identity have not been verified.",
          },
        ];
      }) as PublicResult[];
    }),
    fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5&select=DOI,title,published,URL,publisher`,
      {
        signal: AbortSignal.timeout(12000),
        headers: { Accept: "application/json" },
      },
    ).then(async (response) => {
      if (!response.ok) throw new Error("Research index unavailable");
      const data = await response.json();
      if (!Array.isArray(data.message?.items))
        throw new Error("Unexpected research response");
      return data.message.items.flatMap(
        (item: {
          DOI?: string;
          title?: string[];
          published?: { "date-parts"?: number[][] };
          URL?: string;
          publisher?: string;
        }) => {
          const url = urlOrNull(item.URL);
          if (!url || !item.DOI || !item.title?.[0]) return [];
          const parts = item.published?.["date-parts"]?.[0];
          return [
            {
              id: `doi-${item.DOI}`,
              title: item.title[0].replace(/<[^>]*>/g, "").slice(0, 500),
              url,
              publishedAt: parts
                ? parts
                    .map((v, i) => (i ? String(v).padStart(2, "0") : String(v)))
                    .join("-")
                : "",
              source: `Crossref · ${item.publisher ?? "Research metadata"}`,
              context:
                "Publisher-supplied bibliographic metadata. The full paper has not been read or independently assessed.",
            },
          ];
        },
      ) as PublicResult[];
    }),
  ]);
  const items = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  );
  const warnings = results.flatMap((r, i) =>
    r.status === "rejected"
      ? [
          `${i === 0 ? "Technology news" : "Research index"} is unavailable. Retry later.`,
        ]
      : [],
  );
  if (results.every((r) => r.status === "rejected"))
    throw new Error(
      "Public sources are unavailable. No sample results were substituted.",
    );
  const entry = { at: Date.now(), items, warnings };
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(key, entry);
  return {
    ...entry,
    retrievedAt: new Date(entry.at).toISOString(),
    cached: false,
  };
}
