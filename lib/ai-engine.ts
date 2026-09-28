// INVEST OS — AI engine layer
//
// Engine priority:
//   1. AWS Bedrock Agent      (BEDROCK_AGENT_ID + AWS keys)
//   2. OpenAI-compatible MaaS (OPENAI_COMPAT_BASE_URL + OPENAI_COMPAT_API_KEY)
//      — e.g. Alibaba Cloud Model Studio workspace endpoints
//   3. Direct Anthropic       (ANTHROPIC_API_KEY)
//   4. none → callers fall back to labelled demo content
//
// Credentials are read from the environment only. Never hardcode, never log.

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

export type AIEngine =
  | "bedrock-agent"
  | "openai-compatible"
  | "anthropic"
  | "none";

let cachedClient: BedrockAgentRuntimeClient | null = null;

/* ------------------------------- Bedrock ------------------------------- */

export function bedrockConfigured(): boolean {
  return Boolean(
    process.env.BEDROCK_AGENT_ID &&
      process.env.BEDROCK_AGENT_ALIAS_ID &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

function getClient(): BedrockAgentRuntimeClient | null {
  if (!bedrockConfigured()) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new BedrockAgentRuntimeClient({
    region: process.env.BEDROCK_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return cachedClient;
}

export async function invokeBedrockAgent(
  prompt: string,
  sessionId?: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const command = new InvokeAgentCommand({
      agentId: process.env.BEDROCK_AGENT_ID!,
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID!,
      sessionId: sessionId ?? crypto.randomUUID(),
      inputText: prompt,
    });

    const response = await client.send(command, { abortSignal: signal });
    if (!response.completion) return null;

    const decoder = new TextDecoder("utf-8");
    let text = "";
    for await (const event of response.completion) {
      if (event.chunk?.bytes)
        text += decoder.decode(event.chunk.bytes, { stream: true });
    }
    text += decoder.decode();
    return text.trim() || null;
  } catch (err) {
    console.error(
      "[bedrock] invoke failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/* ------------------------- OpenAI-compatible MaaS ------------------------ */

export function openaiCompatConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_COMPAT_BASE_URL && process.env.OPENAI_COMPAT_API_KEY,
  );
}

function compatBaseUrl(): string {
  // Accept either the workspace root or the full /compatible-mode/v1 path
  const raw = (process.env.OPENAI_COMPAT_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!raw) return "";
  return raw.endsWith("/v1") ? raw : `${raw}/compatible-mode/v1`;
}

export async function invokeOpenAICompat(
  prompt: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!openaiCompatConfigured()) return null;
  const base = compatBaseUrl();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_COMPAT_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_COMPAT_MODEL || "qwen-plus",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: Number(process.env.OPENAI_COMPAT_MAX_TOKENS || 2000),
      }),
      // MaaS cold starts can be slow
      signal:
        signal ??
        AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 120_000)),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[openai-compat] HTTP ${res.status}: ${detail.slice(0, 300)}`,
      );
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.error(
      "[openai-compat] invoke failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/* ------------------------------- Anthropic ------------------------------- */

export async function invokeAnthropic(
  prompt: string,
  signal?: AbortSignal,
  schema?: Record<string, unknown>,
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });
    const message = await client.messages.create(
      {
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
        max_tokens: schema ? 4000 : 2000,
        ...(schema
          ? {
              output_config: {
                format: { type: "json_schema" as const, schema },
              },
            }
          : {}),
        messages: [{ role: "user", content: prompt }],
      },
      { signal },
    );
    const block = message.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text.trim() : null;
  } catch (err) {
    console.error(
      "[anthropic] invoke failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/* -------------------------------- Router -------------------------------- */

export async function runAI(
  prompt: string,
  sessionId?: string,
  signal?: AbortSignal,
  schema?: Record<string, unknown>,
): Promise<{ text: string; engine: AIEngine } | null> {
  if (process.env.AI_PROVIDER === "anthropic") {
    const text = await invokeAnthropic(prompt, signal, schema);
    return text ? { text, engine: "anthropic" } : null;
  }
  if (process.env.AI_PROVIDER === "openai-compatible") {
    const text = await invokeOpenAICompat(prompt, signal);
    return text ? { text, engine: "openai-compatible" } : null;
  }
  const bedrock = await invokeBedrockAgent(prompt, sessionId, signal);
  if (bedrock) return { text: bedrock, engine: "bedrock-agent" };

  if (signal?.aborted) return null;
  const compat = await invokeOpenAICompat(prompt, signal);
  if (compat) return { text: compat, engine: "openai-compatible" };

  if (signal?.aborted) return null;
  const anthropic = await invokeAnthropic(prompt, signal, schema);
  if (anthropic) return { text: anthropic, engine: "anthropic" };

  return null;
}

/** Which engine would serve requests right now. */
export function activeEngine(): AIEngine {
  if (process.env.AI_PROVIDER === "anthropic")
    return process.env.ANTHROPIC_API_KEY ? "anthropic" : "none";
  if (process.env.AI_PROVIDER === "openai-compatible")
    return openaiCompatConfigured() ? "openai-compatible" : "none";
  if (bedrockConfigured()) return "bedrock-agent";
  if (openaiCompatConfigured()) return "openai-compatible";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

/** Human-readable engine label for the Settings UI. */
export function engineLabel(engine: AIEngine): string {
  switch (engine) {
    case "bedrock-agent":
      return "AWS Bedrock Agent";
    case "openai-compatible":
      return `OpenAI-compatible MaaS${
        process.env.OPENAI_COMPAT_MODEL
          ? ` · ${process.env.OPENAI_COMPAT_MODEL}`
          : ""
      }`;
    case "anthropic":
      return "Anthropic Claude";
    default:
      return "No engine configured";
  }
}

/** Best-effort extraction of a JSON object from model output. */
export function extractJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}
