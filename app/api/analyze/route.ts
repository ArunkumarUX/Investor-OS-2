import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";
import { runAI, extractJson, activeEngine } from "@/lib/ai-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = authorize(req, ["/diligence", "/research", "/ask"]);
  if ("error" in gate) return gate.error;
  const body = (await req.json().catch(() => ({}))) as {
    company?: Record<string, unknown>;
    question?: string;
    mode?: "diligence" | "research" | "ask";
  };

  const engine = activeEngine();
  if (engine === "none") {
    return NextResponse.json(
      { error: "No AI engine configured", hint: "Add Bedrock or ANTHROPIC_API_KEY credentials in .env.local" },
      { status: 503 }
    );
  }

  const mode = body.mode ?? (body.company && !body.question ? "diligence" : "ask");

  let prompt: string;
  if (mode === "diligence" && body.company) {
    prompt = `You are INVEST OS™'s AI investment analysis system. Analyze the following company as 5 specialized AI agents. Return ONLY a JSON object with these exact keys: market, technical, financial, legal, founder, memo, risks (array of 4 strings), questions (array of 5 strings).

Company: ${JSON.stringify(body.company)}

Each analysis section should be 2-3 sentences. This input is sample data, not verified evidence. Distinguish provided facts, inferences, and unknowns. Never claim to have reviewed documents, verified credentials, contacted references, or retrieved sources. Do not invent citations or new financial figures. No prose outside the JSON.`;
  } else {
    prompt = `You are INVEST OS™'s AI investment analyst. ${
      body.company ? `Context: ${JSON.stringify(body.company)}.` : ""
    } ${body.question ?? "Provide investment-grade analysis."} The context is sample information. Distinguish supplied facts from inference. Do not invent facts, citations, or completed verification. Answer concisely and specifically.`;
  }

  const result = await runAI(prompt);
  if (!result) {
    return NextResponse.json(
      { error: "AI engine unavailable", engine },
      { status: 502 }
    );
  }

  // Diligence mode must return structured JSON; ask/research return text
  if (mode === "diligence") {
    const parsed = extractJson(result.text);
    if (!parsed) {
      return NextResponse.json(
        { error: "Failed to parse AI response", engine: result.engine, raw: result.text.slice(0, 500) },
        { status: 502 }
      );
    }
    return NextResponse.json({ ...parsed, engine: result.engine });
  }

  return NextResponse.json({ text: result.text, engine: result.engine });
}
