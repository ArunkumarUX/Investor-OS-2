import assert from "node:assert/strict";
const base = process.env.INVEST_OS_TEST_URL;
if (!base || new URL(base).port === "3333")
  throw new Error(
    "Use an isolated test server and store, not the working workspace.",
  );
async function post(body, expected = 200) {
  const response = await fetch(`${base}/api/intelligence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, expected, await response.clone().text());
  return response;
}
const companyId = "nova-ai";
await post(
  {
    action: "evidence",
    companyId,
    title: "Bad URL",
    body: "Invalid",
    url: "javascript:alert(1)",
  },
  400,
);
await post(
  {
    action: "forecast",
    companyId,
    statement: "Bad date",
    probability: 70,
    due: "2026-02-30",
  },
  400,
);
await post(
  {
    action: "forecast",
    companyId,
    statement: "Bad confidence",
    probability: 101,
    due: "2027-01-01",
  },
  400,
);
const evidence = await (
  await post(
    {
      action: "evidence",
      companyId,
      title: "Test evidence",
      body: "A test observation, not a real company fact.",
      url: "https://example.com/evidence",
    },
    201,
  )
).json();
const response = await post({ action: "run", companyId, mode: "sample" });
const events = (await response.text())
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
assert.equal(events.filter((e) => e.status === "complete").length, 8);
assert.ok(events.at(-1).done);
let state = await (await fetch(`${base}/api/intelligence`)).json();
const run = state.runs[0];
assert.equal(run.status, "complete");
assert.equal(run.evidence[0].id, evidence.item.id);
assert.equal(run.agents.length, 8);
assert.ok(state.versions.some((v) => v.trigger.includes("8/8")));
const captures = await (
  await fetch(`${base}/api/capture?companyId=${companyId}`)
).json();
assert.ok(captures.items.some((i) => i.kind === "diligence"));
const forecast = await (
  await post(
    {
      action: "forecast",
      companyId,
      statement: "Measurable test outcome",
      probability: 70,
      due: "2027-01-01",
    },
    201,
  )
).json();
await post({
  action: "outcome",
  companyId,
  id: forecast.item.id,
  outcome: true,
  note: "Observed in test evidence.",
});
await post(
  {
    action: "outcome",
    companyId,
    id: forecast.item.id,
    outcome: false,
    note: "Cannot overwrite original outcome.",
  },
  400,
);
await post(
  {
    action: "event",
    companyId,
    title: "Test change",
    detail: "Changed assumption for test",
    sourceUrl: "https://example.com/change",
    impact: "risk",
  },
  201,
);
const first = await (
  await post(
    {
      action: "decision",
      companyId,
      verdict: "watch",
      confidence: 65,
      rationale: "Needs primary evidence.",
      expectedRevision: null,
    },
    201,
  )
).json();
await post(
  {
    action: "decision",
    companyId,
    verdict: "invest",
    confidence: 90,
    rationale: "Stale edit should fail.",
    expectedRevision: null,
  },
  400,
);
await post(
  {
    action: "decision",
    companyId,
    verdict: "undo",
    confidence: 65,
    rationale: "Reopened for review.",
    expectedRevision: first.item.revision,
  },
  201,
);
state = await (await fetch(`${base}/api/intelligence`)).json();
assert.equal(state.decisions.length, 2);
assert.equal(state.decisions[0].verdict, "undo");
assert.equal(state.decisions[1].verdict, "watch");
assert.equal(state.forecasts[0].probability, 70);
assert.equal(state.forecasts[0].outcome, true);
assert.ok(state.versions.some((v) => v.trigger === "New risk event"));
const finalCaptures = await (
  await fetch(`${base}/api/capture?companyId=${companyId}`)
).json();
assert.equal(
  finalCaptures.items.filter((i) => i.kind === "decision").length,
  0,
);
await Promise.all(
  [1, 2, 3].map((n) =>
    post(
      {
        action: "evidence",
        companyId,
        title: `Concurrent ${n}`,
        body: "Concurrency test",
        url: `https://example.com/${n}`,
      },
      201,
    ),
  ),
);
state = await (await fetch(`${base}/api/intelligence`)).json();
assert.equal(state.evidence.length, 4);
assert.equal(
  state.runs[0].evidence.length,
  1,
  "Completed review packet must not change when evidence is added",
);
console.log(
  "PASS: validation, eight-role streamed review, frozen source packet, diligence capture, memo versions, prediction resolution, immutable outcome, decision revisions, stale-write rejection, reopen and concurrent persistence.",
);
