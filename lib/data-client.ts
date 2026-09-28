// Browser helpers for the generic collection API + shared fetch hook.
import { useCallback, useEffect, useState } from "react";
import type { Record as DbRecord } from "./db";

export type ClientRecord = DbRecord;

const BASE = "/api/data";

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(body?.error || "Unable to save. Please try again."); }
  return (await res.json()) as T;
}

export async function fetchCollection(collection: string): Promise<ClientRecord[]> {
  const { items } = await parse<{ items: ClientRecord[] }>(
    await fetch(`${BASE}/${collection}`, { cache: "no-store" })
  );
  return items;
}

export async function createRecord(
  collection: string,
  input: Partial<ClientRecord>
): Promise<ClientRecord> {
  const { item } = await parse<{ item: ClientRecord }>(
    await fetch(`${BASE}/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return item;
}

export async function updateRecord(
  collection: string,
  id: string,
  patch: Partial<ClientRecord>
): Promise<ClientRecord> {
  const { item } = await parse<{ item: ClientRecord }>(
    await fetch(`${BASE}/${collection}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
  );
  return item;
}

export async function deleteRecord(collection: string, id: string): Promise<void> {
  await parse(await fetch(`${BASE}/${collection}?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" } }));
}

/** Tiny data hook: loads a collection, exposes refetch + optimistic helpers. */
export function useCollection(collection: string) {
  const [items, setItems] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await fetchCollection(collection));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only state after the server render.
    void reload();
  }, [reload]);

  const add = useCallback(
    async (input: Partial<ClientRecord>) => {
      const rec = await createRecord(collection, input);
      setItems((prev) => [rec, ...prev]);
      return rec;
    },
    [collection]
  );

  const edit = useCallback(
    async (id: string, patch: Partial<ClientRecord>) => {
      const rec = await updateRecord(collection, id, patch);
      setItems((prev) => prev.map((i) => (i.id === id ? rec : i)));
      return rec;
    },
    [collection]
  );

  const drop = useCallback(
    async (id: string) => {
      await deleteRecord(collection, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [collection]
  );

  return { items, loading, error, reload, add, edit, drop };
}
