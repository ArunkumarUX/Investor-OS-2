# INVEST OS product and delivery specification

## 1. Product architecture

The product is organized around an investment, not an AI conversation. A company anchors its source documents, research, questions, tasks, diligence results, committee decision, memo versions and portfolio signals. Today is a prioritized work queue. Research and AI are supporting tools, with explicit evidence limits and a human decision boundary.

Current local implementation: Next.js App Router + React; shared navigation and auth context; client-side demo roles; JSON-backed collection and capture APIs; server-persisted decision revisions, evidence, forecasts, review runs and memo versions; browser-backed stages and strategy; connected public research and server-side AI adapters. Production architecture is specified below and is not represented as implemented.

## 2. Complete user journey

1. Enter via login (no landing page). Choose a sample role; production will use a verified account.
2. Today shows decisions awaiting review, companies needing attention and open follow-ups.
3. Define sector, stage, geography and check size in investment strategy.
4. Search discovery and inspect a company profile. Check score provenance and missing evidence.
5. Open its workspace to capture pitch, questions, documents, notes and tasks.
6. Run optional AI analysis or explicitly open sample analysis. Inspect market, technical, financial, legal and founder perspectives.
7. Compare bull and bear cases, write a rationale, choose invest/watch/pass and confidence. This records a judgment; it does not transact.
8. Revisit the decision in history and the living memo. Add dated evidence updates.
9. Review portfolio signals, assign tasks, and prepare an investor report.

## 3. Screen inventory

| Surface | Route | User outcome |
|---|---|---|
| Login | /login | Enter a clear role-specific sample workspace |
| Today | /dashboard | Know the next useful action |
| Discovery | /discovery | Search and filter sample companies |
| Strategy | /dna | Save investment preferences |
| Research | /research | Ask a question, open/save/download a brief |
| Company intelligence | /company/:id | Understand the business and evidence limitations |
| Pipeline | /pipeline | Move deals using drag or an accessible stage selector |
| Deal workspace | /deal/:id | Capture information and follow-ups |
| Diligence | /diligence/:id | Review eight evidence-linked roles |
| Committee | /committee and /committee/:id | Review the agenda and record a decision |
| Memo | /memo/:id | Keep thesis, latest decision and dated updates together |
| Decision history | /memory | Inspect verdicts and pipeline activity |
| Portfolio | /portfolio | Review sample performance and alerts |
| Investor reports | /lp | Review/download a sample report |
| Tasks | /work | Create, edit, complete and reopen tasks |
| Contacts | /contacts | Maintain relationship records |
| Commitments | /commitments | Track committed and called capital |
| Fund overview | /fund | Inspect derived commitment totals |
| Founder submissions | /founder-portal | Save pitch information for review |
| Library | /library | Find deal records and completion state |
| Signals | /signals | Inspect labeled sample market signals |
| Integrations | /marketplace | See truthful configuration and availability |
| Guide | /training | Follow the journey and understand terminology |
| Settings | /settings | Understand access and persistence limits |

## 4. Wireframes

Desktop: narrow persistent navigation | page title and primary action | task-oriented content | optional supporting panel. Today: attention queue first; opportunities and workspace counts second. Company: identity → metrics → founder/market/risk/assessment → source limitations → diligence. Research: company and question → explicit run/sample action → labeled output and save/download → saved briefs. Memo: original thesis → risk questions → current decision → dated updates.

Phone: compact brand/menu → sample-context strip → stacked page heading/action → single-column content. Forms and buttons wrap without horizontal page scroll. Pipeline intentionally scrolls within its own board; each card has a native stage select for touch and keyboard use. Tablet retains the compact navigation while expanding forms into two columns when space permits.

## 5. UX flows and states

All new record workflows: list → inline form → validation → saving → saved feedback → updated list. Failure retains input. Search has an explicit reset/empty state. Tasks toggle completion reversibly. Research never silently substitutes sample text for a failed live request. Diligence finishes when the request finishes, not after a timer. Downloads do not imply delivery. Configuration does not imply a working connection.

The production decision flow must require an approved evidence packet, capture a versioned rationale and approval identity, and separate “approved to invest” from a settled investment. Avoid using a stage change as proof that money has moved.

## 6. Design system

See DESIGN.md. The visual priority is familiar controls, readable prose, clear hierarchy and restrained color. Avoid dense metrics before actions, unexplained acronyms, simulated progress, fake verification badges and unimplemented navigation promises. WCAG AA contrast and keyboard usability are release targets; a formal accessibility audit is still required.

## 7. Production database architecture

Use a transactional relational database. Proposed entities: organizations, users, memberships, funds, companies, deals, sources, claims, claim_sources, documents, research_runs, agent_outputs, questions, tasks, decisions, decision_events, memo_versions, investments, valuations, commitments, capital_calls, reports, audit_events, integration_connections and ingestion_jobs.

Every tenant-owned row has organization_id; fund-scoped data adds fund_id. All foreign keys enforce tenant boundaries. Money is a decimal plus currency, never a formatted string. Decisions and memo versions are append-only with actor, timestamp, previous version and source-set identifiers. Sources store provider, URL/document reference, retrieved time, effective time, license, checksum and freshness. Reports snapshot inputs at publication. Backups, tested restores and retention policies are required.

Current storage is deliberately limited: a single local JSON store and browser storage. It is not a multi-tenant production database.

## 8. AI agent architecture

General partner synthesizes the case; skeptic seeks falsifying evidence; market analyst studies demand/competition; technical analyst reviews documented architecture; financial analyst uses reconciled inputs; legal analyst flags issues for counsel; founder analyst uses verifiable professional history; portfolio analyst monitors changes.

Production agents receive an authorized, immutable evidence bundle. Outputs use a schema: claim, source IDs, observation/inference/unknown, confidence reason, caveats and recommended next check. A verifier rejects missing or mismatched citations. The orchestrator tracks real queued/running/succeeded/failed states and persists model, prompt, source version, latency and cost. Retries are bounded and idempotent. No agent independently executes investments, sends investor reports, or states that credentials were verified without evidence.

Current analysis executes eight separate role calls through the configured model, validates structured claim citations, freezes source packets and streams persisted status. Bounded correction and incomplete-role retries are implemented. Live Anthropic execution passed all eight roles. This is a local orchestrator, not a durable distributed agent service.

## 9. Backend architecture

Production: authenticated API layer; tenant-aware repositories; background job queue for ingestion and analysis; object storage with signed URLs; provider adapters; webhook verification; audit/event stream; monitoring and alerting. Keep model calls outside long database transactions. Use idempotency keys for imports, decisions and reports; concurrency/version checks for edits. Rate limits must be tenant- and user-aware.

The current local server exposes collection/capture APIs and optional AI generation. It is not safe for public deployment with private data.

## 10. API design

Current: GET/POST/PATCH/DELETE /api/data/:collection; capture CRUD /api/capture; POST /api/analyze; GET /api/health; GET /api/signals. New record writes validate required fields, data shapes and capital amounts. Unknown collections return 404; malformed records return 400.

Production endpoints should be explicit, versioned and authorized: /v1/funds, /v1/deals, /v1/deals/:id/evidence, /v1/research-runs, /v1/decisions, /v1/memos/:id/versions, /v1/portfolio/signals and /v1/reports. Paginate collection reads; use consistent error codes and request IDs. Never trust role, organization, author or verification state supplied by the client.

## 11. Security model

Required before production: verified authentication, secure server-managed sessions, organization membership checks on every request, role-based permissions plus row-level isolation, CSRF protection, secret management, encrypted storage and transport, signed document access, upload scanning, audit logs, rate limits, monitoring and restore testing. Test cross-tenant and role boundaries independently.

The current role selector controls presentation only. It is not authentication or API authorization. Do not deploy this build publicly or enter confidential financial or personal data. Reset APIs and generic collection endpoints must be replaced or locked down before release.

## 12. MVP roadmap

Phase 1 (this local delivery): usable sample journey, honest provenance, working forms, saved research/tasks, explicit sample analysis, decision rationale, memo updates and responsive navigation.

Phase 2: choose hosting/auth/database; migrate sample workspace behind real accounts; implement tenancy and authorized CRUD; establish backup and restore; migrate the existing server-persisted decision journal.

Phase 3: connect one licensed company-data provider and one document source; implement evidence ingestion and citations; monitor actual provider health; ship a reliable background job system.

Phase 4: pilot with fund teams. Measure first-review completion, time to find the next action, evidence coverage, failure recovery and decision rationale completeness. Resolve observed usability failures before launch.

## 13. Enterprise roadmap

SSO/SCIM, organization administration, fine-grained document permissions, approval policies, data residency, audit export, legal hold/retention, configurable review gates, source licensing controls, model policies, offline report snapshots, dedicated deployment where justified and documented service objectives. These are planned, not existing controls.

## 14. Pricing strategy

Proposed packaging, not current pricing: a team workspace subscription with included analysis allowance, transparent usage overages, and separately priced licensed data. Enterprise adds governance, support and contractual service objectives. Validate willingness to pay with pilot funds before setting prices. Avoid incentivizing unnecessary AI calls or charging users to view their own evidence.

## 15. Launch strategy

Begin with a private sample walkthrough, then a small authenticated pilot using consented or public data. Define a release gate: no broken core tasks, verified isolation, successful backup restore, citations for consequential claims, complete error recovery and usability testing with new analysts and partners. Publish product claims only when measured. “10/10” is a target; it is not a substitute for independent testing or production controls.
