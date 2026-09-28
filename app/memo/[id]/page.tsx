import { companies } from "@/lib/mock-data";
import { getAnalysis } from "@/lib/ai-content";
import { notFound } from "next/navigation";
import LivingMemo from "@/components/LivingMemo";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const c=companies.find(c=>c.id===id);if(!c)notFound();return <div className="page" style={{ maxWidth: "none", padding: 0 }}><LivingMemo company={c} thesis={getAnalysis(c).memo} /></div>;}
