import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";
import { SAMPLE_SIGNALS } from "@/lib/signals";

export const dynamic = "force-dynamic";

// Live wiring point. REUBEN_DATA_API_KEY is read server-side only and never
// exposed to the client. Each provider (CB Insights/Signal, MAGNiTT, Bloomberg,
// Fortune 500, EIU) is a separate licensed API — add its endpoint + call here.
export async function GET(request: Request) {
  const gate = authorize(request, ["/signals"]);
  if ("error" in gate) return gate.error;
  const key = process.env.REUBEN_DATA_API_KEY;
  const live = Boolean(key);
  // TODO: when the provider + endpoint are confirmed, fetch live signals here
  // using `key` and map them into the MarketSignal shape.
  return NextResponse.json({
    live: false,
    keyConfigured: live,
    note: live
      ? "API key detected. Confirm the provider/endpoint to switch from sample to live signals."
      : "No REUBEN_DATA_API_KEY set — serving sample signals.",
    signals: SAMPLE_SIGNALS,
  });
}
