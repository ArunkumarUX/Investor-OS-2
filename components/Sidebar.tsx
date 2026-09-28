"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { visibleSections, visibleSettings, sectionForPath, sectionLabel } from "@/lib/navigation";

const STORAGE_KEY = "invest-os-sidebar";

function setCollapsed(collapsed: boolean) {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "expanded");
}

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const active = sectionForPath(path)?.id;
  const sections = visibleSections(user);
  const settings = visibleSettings(user);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "collapsed") document.documentElement.dataset.sidebar = "collapsed";
    const button = document.querySelector<HTMLButtonElement>(".sidebar-toggle");
    if (!button) return;
    const collapsed = document.documentElement.dataset.sidebar === "collapsed";
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    button.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  }, []);

  function toggleSidebar(event: MouseEvent<HTMLButtonElement>) {
    const next = document.documentElement.dataset.sidebar !== "collapsed";
    setCollapsed(next);
    const button = event.currentTarget;
    button.setAttribute("aria-expanded", next ? "false" : "true");
    button.setAttribute("aria-label", next ? "Expand sidebar" : "Collapse sidebar");
  }

  return (
    <aside className="app-sidebar fixed left-0 top-0 h-full hidden lg:flex flex-col z-40 bg-white border-r border-[var(--border)]">
      <div className="sidebar-brand flex items-start justify-between gap-2 px-5 pt-7 pb-6">
        <Link href={user?.home ?? "/dashboard"} className="min-w-0">
          <Image src="/nextgen-logo.svg" alt="Next Gen" width={169} height={44} priority className="sidebar-expanded-only h-auto w-[150px]" />
          <span className="sidebar-collapsed-only w-9 h-9 items-center justify-center rounded-lg bg-[var(--bg-surface-2)] text-xs font-semibold">NG</span>
          <span className="sidebar-copy block text-xs text-[var(--text-muted)] mt-1">Your investment workspace</span>
        </Link>
        <button type="button" className="sidebar-toggle" aria-label="Collapse sidebar" aria-expanded="true" aria-controls="app-sidebar-nav" onClick={toggleSidebar}>
          <PanelLeftClose className="sidebar-expanded-only" size={18} aria-hidden="true" />
          <PanelLeftOpen className="sidebar-collapsed-only" size={18} aria-hidden="true" />
        </button>
      </div>
      <nav id="app-sidebar-nav" className="flex-1 px-3 space-y-2" aria-label="Primary">
        {sections.map(section => {
          const label = sectionLabel(section);
          return (
            <Link key={section.id} href={section.items[0].href} title={label} aria-current={active === section.id ? "true" : undefined} className={`main-nav-link ${active === section.id ? "is-active" : ""}`}>
              <section.icon size={19} strokeWidth={1.7} aria-hidden="true" />
              <span className="sidebar-copy">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 space-y-3">
        {settings.length > 0 && (
          <Link href={settings[0].href} title={settings.length === 1 ? settings[0].label : "Settings & help"} className={`main-nav-link ${active === "settings" ? "is-active" : ""}`} aria-current={active === "settings" ? "true" : undefined}>
            <Settings size={18} aria-hidden="true" />
            <span className="sidebar-copy">{settings.length === 1 ? settings[0].label : "Settings & help"}</span>
          </Link>
        )}
        <div className="sidebar-copy text-xs text-[var(--text-muted)] px-3">Sample workspace</div>
        {user && (
          <div className="sidebar-user flex items-center gap-3 pt-4 border-t border-[var(--border)]">
            <span className="w-9 h-9 bg-[var(--bg-surface-2)] rounded-full flex items-center justify-center text-xs font-semibold shrink-0" aria-hidden="true">{user.initials}</span>
            <div className="sidebar-copy flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user.role}</p>
            </div>
            <button className="flex w-11 h-11 items-center justify-center rounded-full hover:bg-[var(--bg-surface-2)] shrink-0" aria-label="Sign out" onClick={() => { logout(); router.replace("/login"); }}>
              <LogOut size={17} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
