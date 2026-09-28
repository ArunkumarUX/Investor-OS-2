# INVEST OS

An interactive investment-workspace prototype with 18 fictional companies, preloaded evidence, eight-role reviews, memo histories, forecasts and portfolio updates. Use Run prototype review for an instant assessment without credentials. Optional public research and live AI remain available.

## Run

```sh
npm install
npm run dev -- --port 3333
```

Open http://localhost:3333. The root redirects to login; role selection is a local demonstration. Configure server-only AI credentials using `.env.example` as a guide. Never commit `.env.local`.

## Working workflows

Five primary areas organize discovery, deal review, portfolio and fund operations. Company analysis supports eight separately executed roles, frozen evidence packets, citation validation, streamed status, history and incomplete-role retries. Live Anthropic execution has completed all eight roles.

Public research retrieves Algolia/Hacker News stories and Crossref metadata with source links. These are research leads, not verified company fundamentals. Decisions have server-persisted revisions and rationale; forecasts accept evidenced outcomes; thesis events and new watched results create alerts and memo versions. Tasks, contacts, commitments, submissions and downloads also work.

Run public-topic monitoring alongside the app:

```sh
npm run monitor
```

Create topics in Discover → Market signals. The first check establishes a baseline. The worker checks every five minutes while running; manual checks are available.

## Verify

```sh
npm run lint
npm run build
node --experimental-strip-types scripts/watch-unit.mjs
```

For isolated API tests, start a separate built server with `INVEST_OS_DATA_FILE` pointing to a disposable file, then run `scripts/intelligence-smoke.mjs` with `INVEST_OS_TEST_URL` pointing to that server. It refuses the normal workspace port.

## Storage and limits

Server records use `data/store.json`; stages and strategy still use browser storage. Authentication, tenant isolation, durable jobs, managed storage, recovery and deployment remain production work. Sample-company claims are not verified investment evidence. Keep this local and use non-confidential data.

See [feature coverage](docs/FEATURE-COVERAGE.md), [product specification](docs/PRODUCT-SPECIFICATION.md), [verification](docs/VERIFICATION.md) and [design system](DESIGN.md).

## Local recovery

Create a point-in-time backup with `node scripts/backup.mjs create`. Backups contain workspace data but no environment credentials; keep them private.

Restore with `node scripts/backup.mjs restore <backup-file> <new-store-path>`. Restore validates the checksum and refuses to overwrite an existing file. Inspect the recovered store, stop the app, set `INVEST_OS_DATA_FILE` to that path and restart. Browser-only stages and strategy are not included. This remains single-process local storage; do not run multiple application instances against one file.

Recovery regressions: `node scripts/recovery-test.mjs`, `node scripts/storage-failure-test.mjs`, and `node scripts/store-reload-test.mjs`.
