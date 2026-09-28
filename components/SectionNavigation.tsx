"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { sectionForPath,ownsPath } from "@/lib/navigation";
import { useAuth,canAccess } from "@/lib/auth";
import { companies } from "@/lib/mock-data";
import { requestDiligencePlay } from "@/components/DiligenceSequence";
export default function SectionNavigation(){const path=usePathname();const {user}=useAuth();const section=sectionForPath(path);const detail=/^\/(company|deal|diligence|committee|memo)\/([^/]+)$/.exec(path);
 if(detail){const id=detail[2];const name=companies.find(c=>c.id===id)?.name??"Company";const links=[{href:`/company/${id}`,label:"Overview"},{href:`/deal/${id}`,label:"Workspace"},{href:`/diligence/${id}`,label:"Diligence"},{href:`/committee/${id}`,label:"Decision"},{href:`/memo/${id}`,label:"Memo"}].filter(i=>canAccess(user,i.href));return <div className="section-bar"><div className="deal-crumb"><Link href="/pipeline" className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:underline"><ArrowLeft size={14}/>Deals</Link><span className="text-xs text-[var(--text-muted)]">/</span><span className="text-sm font-semibold">{name}</span></div><nav className="section-links workflow-links" aria-label={`${name} workflow`}>{links.map(i=><Link key={i.href} href={i.href} aria-current={path===i.href?"page":undefined} className={path===i.href?"selected":""} onClick={i.label==="Diligence"?()=>requestDiligencePlay(id):undefined}>{i.label}</Link>)}</nav></div>;}
 if(!section)return null;const items=section.items.filter(i=>canAccess(user,i.href));if(items.length<2)return null;
 return <div className="section-bar"><nav className={section.id === "fund" || section.id === "settings" || section.id === "discover" || section.id === "deals" ? "section-links workflow-links" : "section-links"} aria-label={`${section.label} sections`}>{items.map(i=><Link key={i.href} href={i.href} aria-current={ownsPath(i,path)?"page":undefined} className={ownsPath(i,path)?"selected":""}>{i.label}</Link>)}</nav></div>;
}
