export type PersonaId = "partner" | "analyst" | "cfo" | "lp" | "founder";

export interface Persona {
  id: PersonaId;
  name: string;
  role: string;
  initials: string;
  color: string;
  email: string;
  blurb: string;
  /** allowed top-level path prefixes, or "all" */
  access: string[] | "all";
  home: string;
}

export const PERSONA_COOKIE = "reuben_persona";
export const PERSONA_STORAGE_KEY = "reuben_persona";

export const PERSONAS: Persona[] = [
  {
    id: "partner",
    name: "Olivia Carter",
    role: "Managing Partner",
    initials: "OC",
    color: "#5146E5",
    email: "olivia@investoros.vc",
    blurb: "Full access — sourcing, decisions, fund and LP relations.",
    access: "all",
    home: "/dashboard",
  },
  {
    id: "analyst",
    name: "Marcus Webb",
    role: "Investment Analyst",
    initials: "MW",
    color: "#0E7C86",
    email: "marcus@investoros.vc",
    blurb: "Research, diligence and pipeline. No fund or LP data.",
    access: ["/dashboard", "/discovery", "/memory", "/research", "/pipeline", "/library", "/dna", "/committee", "/contacts", "/work", "/marketplace", "/training", "/signals", "/ask", "/settings", "/company", "/diligence", "/deal", "/memo", "/insights"],
    home: "/research",
  },
  {
    id: "cfo",
    name: "Priya Shah",
    role: "Fund Operations",
    initials: "PS",
    color: "#B7791F",
    email: "priya@investoros.vc",
    blurb: "Fund management, commitments, reporting and LP portal.",
    access: ["/dashboard", "/fund", "/commitments", "/portfolio", "/contacts", "/work", "/lp", "/signals", "/settings", "/ask", "/research"],
    home: "/fund",
  },
  {
    id: "lp",
    name: "David Klein",
    role: "Limited Partner",
    initials: "DK",
    color: "#2E7D32",
    email: "david@meridian-lp.com",
    blurb: "Your investor view — performance and updates only.",
    access: ["/lp", "/portfolio", "/training"],
    home: "/lp",
  },
  {
    id: "founder",
    name: "Sarah Chen",
    role: "Founder",
    initials: "SC",
    color: "#eb6834",
    email: "sarah@nova.ai",
    blurb: "Submit and track your pitch through the founder portal.",
    access: ["/founder-portal"],
    home: "/founder-portal",
  },
];

export function personaById(id: string | null | undefined): Persona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}

export function canAccess(user: Persona | null, path: string): boolean {
  if (!user) return false;
  if (user.access === "all") return true;
  const target = path.split("?")[0] || "/";
  return user.access.some((p) => target === p || target.startsWith(p + "/"));
}

export function safeNext(user: Persona, next: string): string {
  const allowed =
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\") &&
    next !== "/login" &&
    canAccess(user, next);
  return allowed ? next : user.home;
}
