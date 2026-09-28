"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { useRef,useState } from "react";
import { Menu,X,LogOut,Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { visibleSections, visibleSettings, sectionForPath, sectionLabel } from "@/lib/navigation";
export default function MobileNav(){const path=usePathname();const router=useRouter();const {user,logout}=useAuth();const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);const active=sectionForPath(path)?.id;const settings=visibleSettings(user);
 return <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[var(--border)]" onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);trigger.current?.focus();}}}>
 <div className="flex items-center justify-between px-4 py-2"><Link className="font-bold tracking-tight text-lg" href={user?.home??"/dashboard"}><Image src="/nextgen-logo.svg" alt="Next Gen" width={169} height={44} priority className="h-auto w-[150px]" /></Link><button ref={trigger} aria-label={open?"Close menu":"Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={()=>setOpen(!open)} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-[var(--bg-surface-2)]">{open?<X size={21}/>:<Menu size={21}/>}</button></div>
 {open&&<div id="mobile-menu" className="p-3 border-t border-[var(--border)]"><nav aria-label="Primary" className="space-y-1">{visibleSections(user).map(section=><Link key={section.id} href={section.items[0].href} onClick={()=>setOpen(false)} className={`main-nav-link ${active===section.id?"is-active":""}`} aria-current={active===section.id?"true":undefined}><section.icon size={19} aria-hidden="true"/>{sectionLabel(section)}</Link>)}</nav><div className="border-t border-[var(--border)] mt-3 pt-3">{settings.length>0&&<Link href={settings[0].href} onClick={()=>setOpen(false)} className="main-nav-link"><Settings size={18}/>{settings.length===1?settings[0].label:"Settings & help"}</Link>}<button className="main-nav-link w-full" onClick={()=>{logout();setOpen(false);router.replace("/login");}}><LogOut size={18}/>Sign out</button></div></div>}
 </header>;
}
