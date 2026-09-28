"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    router.replace(user ? user.home : "/login");
  }, [ready, user, router]);
  return <main className="page" role="status">Opening workspace…</main>;
}
