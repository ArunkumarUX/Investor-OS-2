"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Columns3,List } from "lucide-react";
export default function DealViewToggle(){const path=usePathname();return <nav aria-label="Pipeline view" className="inline-flex border border-[var(--border)] rounded-lg p-1 bg-white">{[{href:"/pipeline",label:"Board",icon:Columns3},{href:"/library",label:"List",icon:List}].map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={path===href?"page":undefined} className={`inline-flex gap-2 items-center px-3 min-h-10 rounded-md text-sm ${path===href?"bg-[var(--bg-surface-2)] font-semibold":"text-[var(--text-muted)]"}`}><Icon size={15}/>{label}</Link>)}</nav>;}
