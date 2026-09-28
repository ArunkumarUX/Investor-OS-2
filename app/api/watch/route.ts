import { applyWatchMatches } from "@/lib/watch-matches";
import { authorize } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import {
  changeIntelligence,
  readIntelligence,
  requiredText,
} from "@/lib/intelligence";
import { searchPublicResearch } from "@/lib/public-research";
import { companies } from "@/lib/mock-data";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  const gate = authorize(request, ["/signals"]);
  if ("error" in gate) return gate.error;
  const state = await readIntelligence();
  return NextResponse.json({
    watches: state.watches,
    heartbeat: state.monitorHeartbeat ?? null,
  });
}
export async function POST(request: Request) {
  const gate = authorize(request, ["/signals"]);
  if ("error" in gate) return gate.error;
  try {
    const body = await request.json();
    if (body.action === "create") {
      const query = requiredText(body.query, "Public topic", 120);
      const location = body.location === undefined || body.location === "" ? "" : requiredText(body.location, "Location", 60);
      if ([query, location].filter(Boolean).join(" ").length > 120) throw new Error("Keep the topic and location together under 120 characters.");
      if (query.length < 2) throw new Error("Use at least two characters.");
      if (!companies.some((c) => c.id === body.companyId))
        throw new Error("Choose a company.");
      const item = await changeIntelligence((s) => {
        if (s.watches.length >= 20)
          throw new Error(
            "This local workspace supports up to 20 watch topics.",
          );
        if (
          s.watches.some(
            (w) =>
              w.companyId === body.companyId &&
              w.query.toLowerCase() === query.toLowerCase() &&
              (w.location || "").toLowerCase() === location.toLowerCase(),
          )
        )
          throw new Error("This topic is already watched for this company.");
        const item = {
          id: crypto.randomUUID(),
          companyId: body.companyId,
          query,
          location,
          enabled: true,
          createdAt: new Date().toISOString(),
          seenIds: [],
        };
        s.watches.push(item);
        return item;
      });
      return NextResponse.json({ item }, { status: 201 });
    }
    if (body.action === "toggle") {
      if (typeof body.enabled !== "boolean")
        throw new Error("Choose enabled or paused.");
      await changeIntelligence((s) => {
        const w = s.watches.find((w) => w.id === body.id);
        if (!w) throw new Error("Watch topic not found.");
        w.enabled = body.enabled;
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action !== "check") throw new Error("Unknown action.");
    if (body.worker)
      await changeIntelligence((s) => {
        s.monitorHeartbeat = new Date().toISOString();
      });
    const snapshot = await readIntelligence();
    const watches = snapshot.watches.filter(
      (w) => w.enabled && (!body.id || w.id === body.id),
    );
    let added = 0;
    for (const watch of watches) {
      try {
        const results = await searchPublicResearch([watch.query, watch.location].filter(Boolean).join(" "));
        added += await changeIntelligence((s) =>
          applyWatchMatches(
            s,
            watch.id,
            results.items,
            results.warnings,
            new Date().toISOString(),
          ),
        );
      } catch {
        await changeIntelligence((s) => {
          const w = s.watches.find((w) => w.id === watch.id);
          if (w)
            w.error =
              "Public source check failed. Previous results are preserved.";
        });
      }
    }
    return NextResponse.json({ checked: watches.length, added });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update monitoring.",
      },
      { status: 400 },
    );
  }
}
