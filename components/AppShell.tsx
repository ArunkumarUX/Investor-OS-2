import DecisionSync from "./DecisionSync";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import SectionNavigation from "@/components/SectionNavigation";
import AuthGuard from "@/components/AuthGuard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="app-main flex-1 min-w-0 min-h-screen" style={{ background: "var(--bg-base)" }}>
          <MobileNav />
          <SectionNavigation />
          <DecisionSync />
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
