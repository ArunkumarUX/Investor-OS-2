import { House, Search, FolderKanban, ChartColumn, Landmark, Settings, type LucideIcon } from "lucide-react";
import { canAccess, type Persona } from "./auth";
export type Destination = { href: string; label: string; aliases?: string[] };
export type NavigationSection = { id: string; label: string; icon: LucideIcon; items: Destination[] };
export const navigation: NavigationSection[] = [
  { id: "today", label: "Command Center", icon: House, items: [
    {href:"/dashboard",label:"Overview"}, {href:"/work",label:"My tasks"},
  ]},
  { id: "discover", label: "Discover", icon: Search, items: [
    {href:"/discovery",label:"Companies"}, {href:"/signals",label:"Market signals"}, {href:"/research",label:"Research",aliases:["/ask"]},
  ]},
  { id: "deals", label: "Deals", icon: FolderKanban, items: [
    {href:"/pipeline",label:"Pipeline",aliases:["/library","/company","/deal","/diligence","/memo"]},
    {href:"/committee",label:"Reviews"}, {href:"/memory",label:"History",aliases:["/insights"]}, {href:"/founder-portal",label:"Submissions"},
  ]},
  { id: "portfolio", label: "Portfolio", icon: ChartColumn, items: [{href:"/portfolio",label:"Portfolio"}] },
  { id: "fund", label: "Fund", icon: Landmark, items: [
    {href:"/fund",label:"Overview"}, {href:"/commitments",label:"Commitments"}, {href:"/lp",label:"Reports"}, {href:"/contacts",label:"Contacts"},
  ]},
];
export const settingsSection: NavigationSection = { id:"settings",label:"Settings",icon:Settings,items:[
  {href:"/settings",label:"Workspace"}, {href:"/dna",label:"Investment strategy"}, {href:"/marketplace",label:"Integrations"}, {href:"/training",label:"Help"},
]};
export function matchesPath(path:string,href:string){return path===href||path.startsWith(href+"/");}
export function ownsPath(item:Destination,path:string){return [item.href,...(item.aliases??[])].some(href=>matchesPath(path,href));}
export function sectionForPath(path:string){return [...navigation,settingsSection].find(s=>s.items.some(i=>ownsPath(i,path)));}
export function visibleSections(user:Persona|null){return navigation.map(s=>({...s,items:s.items.filter(i=>canAccess(user,i.href))})).filter(s=>s.items.length);}
export function sectionLabel(section:NavigationSection){return section.items.length===1&&["fund","deals"].includes(section.id)?section.items[0].label:section.label;}
export function visibleSettings(user:Persona|null){return settingsSection.items.filter(i=>canAccess(user,i.href));}
