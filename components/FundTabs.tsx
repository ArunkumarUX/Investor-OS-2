"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./fund-tabs.module.css";

const TABS = [
  { href: "/fund", label: "Overview" },
  { href: "/commitments", label: "Commitments" },
  { href: "/lp", label: "Reports" },
  { href: "/contacts", label: "Contacts" },
];

export default function FundTabs() {
  const path = usePathname();
  return (
    <nav className={styles.tabs} aria-label="Fund">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={path === tab.href ? "page" : undefined}>{tab.label}</Link>
      ))}
    </nav>
  );
}
