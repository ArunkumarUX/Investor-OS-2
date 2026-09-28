import type { Metadata } from "next";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Investment Committee | INVEST OS™",
  description: "Prepare and record invest / watch / pass decisions",
};

export default function CommitteeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
