import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "INVEST OS — Your investment workspace",
  description: "Discover opportunities, review evidence, and record clear investment decisions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
