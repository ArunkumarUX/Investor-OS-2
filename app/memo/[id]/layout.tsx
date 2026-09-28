import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { companies } from "@/lib/mock-data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = companies.find((x) => x.id === id);
  return {
    title: c ? `Living Memo — ${c.name} | INVEST OS™` : "Living Memo | INVEST OS™",
    description: c ? `AI-updated investment memo for ${c.name}` : undefined,
  };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
