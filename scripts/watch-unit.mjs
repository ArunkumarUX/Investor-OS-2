import assert from "node:assert/strict";
import { applyWatchMatches } from "../lib/watch-matches.ts";
const state = {
  watches: [
    {
      id: "watch",
      companyId: "nova-ai",
      query: "AI",
      enabled: true,
      createdAt: "2026-01-01",
      seenIds: [],
    },
  ],
  decisions: [],
  evidence: [],
  runs: [],
  forecasts: [],
  events: [],
  versions: [],
};
const old = {
  id: "a",
  title: "Existing article",
  url: "https://example.com/a",
  publishedAt: "2026-01-01",
  source: "test",
  context: "Unverified metadata",
};
const fresh = {
  ...old,
  id: "b",
  title: "New article",
  url: "https://example.com/b",
};
assert.equal(
  applyWatchMatches(state, "watch", [old], [], "2026-01-01T00:00:00Z"),
  0,
  "First check establishes baseline",
);
assert.equal(
  applyWatchMatches(state, "watch", [fresh, old], [], "2026-01-02T00:00:00Z"),
  1,
);
assert.equal(state.events.length, 1);
assert.equal(state.versions.length, 1);
assert.equal(state.events[0].impact, "neutral");
assert.equal(state.versions[0].sourceIds[0], state.events[0].id);
assert.equal(
  applyWatchMatches(state, "watch", [fresh, old], [], "2026-01-02T00:01:00Z"),
  0,
  "Repeated check must not duplicate alerts",
);
assert.equal(
  applyWatchMatches(
    state,
    "watch",
    [{ ...fresh, id: "different-index-id" }],
    [],
    "2026-01-02T00:02:00Z",
  ),
  0,
  "Same URL from another index must not duplicate an alert",
);
state.watches[0].enabled = false;
assert.equal(
  applyWatchMatches(
    state,
    "watch",
    [{ ...fresh, id: "c", url: "https://example.com/c" }],
    [],
    "2026-01-03T00:00:00Z",
  ),
  0,
  "Paused watches must not create alerts",
);
console.log(
  "PASS: monitoring baseline, new-source alert, linked memo version, repeated-result and cross-index deduplication, paused watch.",
);
