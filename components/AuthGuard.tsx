"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, canAccess } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!ready || user) return;
    router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [ready, user, path, router]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-muted)" }} role="status">
          <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-blue)", borderTopColor: "transparent" }} />
          Loading…
        </div>
      </div>
    );
  }

  if (!canAccess(user, path)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-base)" }}>
        <div className="max-w-md">
          <h1 className="text-xl font-semibold mb-2">This role cannot open this page</h1>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{user.role} does not include {path}.</p>
          <Link className="button" href={user.home}>Go to your workspace</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
