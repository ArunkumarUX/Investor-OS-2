"use client";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PERSONAS, useAuth, safeNext, type PersonaId } from "@/lib/auth";
import { ArrowRight, Check, FolderSearch, Scale, ChartNoAxesCombined } from "lucide-react";
function LoginInner() {
  const { user, ready, login } = useAuth(); const router = useRouter(); const params = useSearchParams();
  const [selected,setSelected] = useState<PersonaId>("partner");
  const [busy,setBusy] = useState(false);
  const persona = PERSONAS.find(p => p.id === selected)!;
  useEffect(() => {
    if (ready && user) router.replace(safeNext(user, params.get("next") || ""));
  }, [ready, user, params, router]);
  const signIn = () => {
    setBusy(true); const p = login(selected); const next = params.get("next") || "";
    if(p) router.replace(safeNext(p, next));
  };
  return <main className="min-h-screen grid lg:grid-cols-2 bg-white">
    <section className="hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-[#edf1f5]">
      <Image src="/nextgen-logo.svg" alt="Next Gen" width={169} height={44} priority className="h-auto w-[150px]" />
      <div className="max-w-md"><h2 className="text-4xl leading-tight tracking-tight mb-6">A clearer path from<br/>opportunity to conviction.</h2><p className="text-base leading-relaxed text-[var(--text-muted)] mb-10">Your investment work, connected. Discover companies, test the thesis, and keep every decision in context.</p><div className="space-y-6">{[{icon:FolderSearch,title:"Find what fits",text:"Explore companies against your investment strategy."},{icon:Scale,title:"See both sides",text:"Review evidence, risks and unanswered questions."},{icon:ChartNoAxesCombined,title:"Stay on top of your portfolio",text:"Keep the next action in focus."}].map(({icon:Icon,title,text})=><div key={title} className="flex gap-4"><Icon size={21} className="shrink-0 mt-1"/><div><h2 className="text-sm font-semibold">{title}</h2><p className="text-sm text-[var(--text-muted)] mt-1">{text}</p></div></div>)}</div></div>
      <p className="text-xs text-[var(--text-muted)]">Human judgment at every investment decision.</p>
    </section>
    <section className="flex items-center justify-center p-6 sm:p-12"><div className="w-full max-w-md">
      <div className="lg:hidden mb-10"><Image src="/nextgen-logo.svg" alt="Next Gen" width={169} height={44} priority className="h-auto w-[150px]" /></div><h1 className="text-3xl font-semibold tracking-tight">Welcome to your workspace</h1><p className="page-description mb-7">Choose a role to explore a complete sample fund. No password or personal details needed.</p>
      <form onSubmit={e=>{e.preventDefault();signIn();}}><fieldset><legend className="field-label mb-3">How would you like to explore?</legend><div className="space-y-2">{PERSONAS.map(p=><label key={p.id} className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors" style={{borderColor:selected===p.id?"var(--text-primary)":"var(--border)",background:selected===p.id?"var(--bg-surface-2)":"white"}}><input className="accent-black w-4 h-4" type="radio" name="role" value={p.id} checked={selected===p.id} onChange={()=>setSelected(p.id)}/><span className="flex-1"><span className="block text-sm font-semibold">{p.role}</span><span className="block text-xs leading-relaxed mt-1 text-[var(--text-muted)]">{p.blurb}</span></span>{selected===p.id&&<Check size={16}/>}</label>)}</div></fieldset><button type="submit" className="button w-full mt-6" disabled={busy}>{busy?"Opening workspace…":`Continue as ${persona.role}`}<ArrowRight size={17}/></button></form>
      <p className="text-xs leading-relaxed text-center text-[var(--text-muted)] mt-5">Sample data · changes are saved on this device and local server.<br/>The role is sent with each request. There is no password.</p>
    </div></section>
  </main>;
}
export default function LoginPage(){return <Suspense fallback={<div className="page" role="status">Loading sign in…</div>}><LoginInner/></Suspense>;}
