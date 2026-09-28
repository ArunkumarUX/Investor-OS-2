# INVEST OS design system

Preserve the existing NEXTGEN identity with a quiet, light operating interface. This is a workspace for repeated use, not a marketing site.

- Gilroy / Plus Jakarta Sans with system fallbacks, self-hosted assets.
- Dark text #202B40; secondary #53647E; subtle #606F84.
- White surfaces on #F7F9FC; fine #DCE4F1 borders; black primary actions.
- Green, amber and red reserved for semantic states; include text, never color alone.
- 32px desktop page heading; 26.4px phone; 14–16px body; 12–13px metadata.
- 12px panel corners, pill-shaped CTA buttons, 8–9px form controls, 44px minimum new primary control height.
- Page padding 36px desktop, 16px phone. Max width 1280px.
- Sidebar desktop, menu on smaller screens. Primary five destinations first; secondary groups collapsed by default.
- Native inputs, labeled forms, visible keyboard focus, skip link, reduced motion.
- One obvious primary action per surface. Empty states explain what to do next. Save errors preserve entered text.

Shared classes are in app/globals.css. Navigation comes from lib/navigation.ts. RecordWorkspace provides consistent create/edit/search/export states. Legacy screens are progressively aligned with this system; they are not a fully unified component library yet.

## Command Center

The dashboard extends the light Next Gen shell with a deep teal opportunity map and a pale sage decision brief. Four interactive stage columns reflect saved pipeline counts; selection reveals company links. Portfolio allocation uses actual sample holdings, with K/M/B normalized to millions. Lower sections prioritize value, thesis matches and actionable tasks. Motion is restricted to map bars and honors reduced-motion preferences. Mobile stacks the decision brief beneath the map while retaining all four stage controls.

Opportunity Intelligence replaces the dashboard match list with a sector-filtered, ranked shortlist and a selected-company detail panel. Ranking methodology and sample provenance remain visible. Actions hand off to the existing evidence and analysis routes.

Market Signals leads with curated CB Insights and Fortune research. Source, publication date and access limits accompany every entry. Reported facts are separate from product interpretations; related sample companies are sector matches, never claimed subjects of source reports. Search, sector/source filters and local bookmarks support scanning. General web research and topic monitoring sit in secondary disclosures.
