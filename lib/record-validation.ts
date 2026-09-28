import type { Collection } from "./db";
export function validateRecord(collection: Collection, body: unknown, partial = false): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Send a JSON object.";
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length > 40) return "Too many fields.";
  if (Object.values(record).some(v => typeof v === "string" && v.length > 50000)) return "A field exceeds the 50,000 character limit.";
  const required: Partial<Record<Collection, string[]>> = { tasks:["title","owner"], contacts:["name","title"], submissions:["company","founder","email","summary"], commitments:["lp","vintage"], research:["title","body"] };
  for (const key of required[collection] ?? []) {
    if ((!partial || key in record) && (typeof record[key] !== "string" || !String(record[key]).trim())) return `${key} is required.`;
  }
  if (record.email && (typeof record.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))) return "Enter a valid email address.";
  if (collection === "integrations" && record.kind === "market-source") {
    if (typeof record.name !== "string" || !record.name.trim() || record.name.length > 80) return "Enter a source name under 80 characters.";
    try { const url = new URL(String(record.url)); if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.href.length > 2048) return "Use a public HTTP or HTTPS source URL without credentials."; } catch { return "Enter a valid source URL."; }
    if (record.status !== "saved") return "Custom sources must be saved before connecting an integration.";
  }
  if (collection === "commitments") {
    for (const key of ["committed","called"]) if ((!partial || key in record) && (typeof record[key] !== "number" || !Number.isFinite(record[key]) || Number(record[key]) < 0)) return `${key} must be a non-negative number.`;
    if (typeof record.called === "number" && typeof record.committed === "number" && record.called > record.committed) return "Called capital cannot exceed committed capital.";
  }
  if (collection === "tasks" && record.status && !["open","done"].includes(String(record.status))) return "Task status must be open or done.";
  if (collection === "submissions" && record.status && !["review","shortlisted","declined"].includes(String(record.status))) return "Submission status must be under review, shortlisted, or declined.";
  return null;
}
