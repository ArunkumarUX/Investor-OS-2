import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { companies } from "@/lib/mock-data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = companies.find((x) => x.id === id);
  return {
    title: c ? `${c.name} — Company Intelligence | INVEST OS™` : "Company Intelligence | INVEST OS™",
    description: c ? c.tagline : undefined,
  };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
