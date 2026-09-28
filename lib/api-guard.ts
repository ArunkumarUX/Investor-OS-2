import { NextResponse } from "next/server";
import type { Collection } from "./db";
import { canAccess, personaById, PERSONA_COOKIE, type Persona } from "./personas";

const READ: Record<Collection, string[]> = {
  deals: ["/pipeline", "/library", "/dashboard"],
  contacts: ["/contacts"],
  tasks: ["/work", "/dashboard"],
  commitments: ["/commitments", "/lp", "/fund"],
  research: ["/research"],
  strategy: ["/dna", "/training"],
  notifications: ["/dashboard", "/settings"],
  submissions: ["/founder-portal"],
  integrations: ["/marketplace", "/settings"],
};

const WRITE: Record<Collection, string[]> = {
  deals: ["/pipeline"],
  contacts: ["/contacts"],
  tasks: ["/work"],
  commitments: ["/commitments"],
  research: ["/research"],
  strategy: ["/dna"],
  notifications: ["/dashboard"],
  submissions: ["/founder-portal"],
  integrations: ["/marketplace", "/settings"],
};

export function personaFromRequest(request: Request): Persona | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|; )${PERSONA_COOKIE}=([^;]+)`));
  return personaById(match ? decodeURIComponent(match[1]) : null);
}

export function authorize(request: Request, paths: string[]): { persona: Persona } | { error: NextResponse } {
  const persona = personaFromRequest(request);
  if (!persona) return { error: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (!paths.some((path) => canAccess(persona, path))) {
    return { error: NextResponse.json({ error: "This role cannot use that action." }, { status: 403 }) };
  }
  return { persona };
}

export function authorizeCollection(request: Request, collection: Collection, method: string): { persona: Persona } | { error: NextResponse } {
  const paths = method === "GET" || method === "HEAD" ? READ[collection] : WRITE[collection];
  return authorize(request, paths);
}
