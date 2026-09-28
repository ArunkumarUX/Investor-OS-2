import type { Metadata } from "next";
import { companies } from "@/lib/mock-data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = companies.find((x) => x.id === id);
  return {
    title: c ? `Investment Committee — ${c.name} | INVEST OS™` : "Investment Committee | INVEST OS™",
    description: c ? `Bull vs bear AI debate and decision for ${c.name}` : undefined,
  };
}

export default function CommitteeDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
