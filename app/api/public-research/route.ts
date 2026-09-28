import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";
import { searchPublicResearch } from "@/lib/public-research";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const gate = authorize(request, ["/research", "/signals", "/diligence"]);
  if ("error" in gate) return gate.error;
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 120)
    return NextResponse.json(
      { error: "Search with 2–120 characters." },
      { status: 400 },
    );
  try {
    return NextResponse.json(await searchPublicResearch(query));
  } catch {
    return NextResponse.json(
      {
        error:
          "Public sources are unavailable. No sample results were substituted.",
      },
      { status: 502 },
    );
  }
}
