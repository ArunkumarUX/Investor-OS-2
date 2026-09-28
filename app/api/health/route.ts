import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";
import { activeEngine, engineLabel } from "@/lib/ai-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = authorize(request, ["/dashboard", "/settings", "/marketplace", "/research", "/signals"]);
  if ("error" in gate) return gate.error;
  const engine = activeEngine();
  return NextResponse.json({
    ok: true,
    engine,
    engineLabel: engineLabel(engine),
    aiConfigured: engine !== "none",
    aiConnected: false,
    connectionStatus: "unverified",
    bedrock: engine === "bedrock-agent",
    openaiCompat: engine === "openai-compatible",
    anthropic: engine === "anthropic",
    model: process.env.OPENAI_COMPAT_MODEL || process.env.ANTHROPIC_MODEL || null,
  });
}
