# Feature coverage — 26 September 2026

Current delivery scope: interactive local prototype using dummy data. Production accounts, deployment and live integrations are outside the requested prototype scope. This is not a production certification.

All 18 companies now have fictional source briefs, company-specific eight-role reviews and memo versions. Three sample forecasts and portfolio updates demonstrate follow-up workflows. Prototype reviews execute without credentials; live AI remains optional. Existing user work is preserved.

## Implemented in the local application

- Five primary navigation areas with contextual deal workflow navigation.
- Public technology-news search (Algolia/Hacker News) and publisher metadata search (Crossref), with retrieval dates, source URLs, partial-provider errors and bounded cache. Search results are research leads, not verified company facts.
- Evidence records with source URLs and excerpts; each analysis freezes its latest 12-source packet.
- Eight individually executed roles: market, technical, financial, legal, founder, skeptic, portfolio and general partner. Three concurrent tasks at a time; portfolio and synthesis run after the first six. Actual queued/running/complete/failed states stream to the UI and are saved. AI requests are bounded to 45 seconds per attempt, with one corrective retry. Incomplete reviews can retry failed roles while preserving completed outputs and the frozen source packet; the general partner then synthesizes the updated review. No silent sample fallback.
- AI output validates claim categories and citation IDs against the source packet. It does not establish that the cited text actually proves a claim.
- Explicitly labelled sample reviews, review history and downloadable reports.
- New decisions persisted server-side with rationale, confidence, revision conflicts and an append-only decision journal. Reopen retains old decisions. Decision capture and memo version save in the same local transaction.
- Predictions with probability and due date, one-time outcome recording with evidence notes, and a descriptive Brier score. This is calibration tracking, not an autonomously trained investment model.
- User-reported thesis events create an alert and a memo version together.
- Watched public topics establish a baseline, then create deduplicated neutral research alerts and memo versions for new matches. A local worker checks every five minutes while running; manual checks also work. Monitoring does not infer valuation changes or verify entities.
- Memo version history and report export.
- Web app manifest for supported browser installation. The application remains a responsive website, not separately built native iOS/Android applications.
- Checksum-validated local backups, restore-to-new-file protection and tested recovery; browser-only state is excluded.
- Disk writes are flushed before atomic replacement; failed writes retain the last saved cache.
- Cross-site API request protection and default-disabled reset endpoint. These do not replace authenticated authorization.

## Verification

Passed isolated API tests: invalid URLs/dates/probabilities, eight-role sample review, streamed completion, frozen evidence snapshot, diligence capture, memo versions, outcomes, decision revisions, stale-edit rejection, reopening and concurrent writes.

Passed deterministic monitoring tests: baseline, new match, linked memo version, duplicate IDs, duplicate URLs across indexes and paused watches.

Real public API retrieval returned results from both Algolia and Crossref.

Live Anthropic review completed all eight roles. An incomplete review was successfully retried, retaining completed work and regenerating the final synthesis. Outputs correctly identified the sample-company facts as unverified. No credentials are included here.

Final lint and optimized build passed (44 pages). Mobile analysis had no horizontal overflow. Cross-site rejection, disabled reset and duplicate-free public-source rechecks passed.

## Remaining master-prompt gaps

- Production accounts, server authorization, tenant isolation, managed database, durable job queue, deployment, operational monitoring and production recovery procedures.
- Verified private-company fundamentals, documents, founder claims, comprehensive patents/market feeds, and evidence-entailment verification.
- Autonomous outcome ingestion and learning from real investment returns. Current predictions use human-entered outcomes.
- Full financial modelling and an evidence-backed interactive competition map.
- Secure individualized LP access, approved report publication and delivery.
- Native mobile applications, independent accessibility/security audits and usability testing with representative investors.

Public web access cannot supply private contracts, prove sample-company claims, provision licensed feeds, or configure production identities. These gaps must remain visible rather than being represented as finished.
