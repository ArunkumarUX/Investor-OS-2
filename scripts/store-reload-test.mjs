import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const storage = new Map();
const pipeline = { initialDeals: [{ companyId: 'nova-ai', stageId: 'discovered' }] };
const source = await readFile(new URL('../lib/store.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function reload() {
  const testModule = { exports: {} };
  const context = vm.createContext({ exports: testModule.exports, module: testModule, require: () => pipeline,
    window: { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } },
    console, Date, Map, Set });
  vm.runInContext(compiled, context);
  return testModule.exports;
}
let store = reload();
const base = { companyId: 'nova-ai', confidence: 60, rationale: 'Review', createdAt: new Date().toISOString(), priorStage: 'discovered' };
store.applyServerDecisions([{ ...base, verdict: 'watch', revision: '1' }]);
assert.equal(store.getDealStages()['nova-ai'], 'contacted');
const reopened = { ...base, verdict: 'undo', revision: '2' };
store.applyServerDecisions([reopened]);
assert.equal(store.getDealStages()['nova-ai'], 'discovered');
store.setDealStage('nova-ai', 'diligence');
store = reload();
store.applyServerDecisions([reopened]);
assert.equal(store.getDealStages()['nova-ai'], 'diligence');
store.applyServerDecisions([{ ...base, verdict: 'invest', revision: '3' }]);
assert.equal(store.getDealStages()['nova-ai'], 'invested');
console.log('PASS: reopen followed by manual stage change survives reload; a new decision still updates the stage.');
