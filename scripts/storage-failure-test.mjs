import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';
import vm from 'node:vm';
const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'invest-storage-'));
const file = path.join(directory, 'store.json');
try {
  await fs.promises.writeFile(file, JSON.stringify({ tasks: [{ id: 'one', title: 'Saved' }] }));
  const source = await fs.promises.readFile(new URL('../lib/db.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const testModule = { exports: {} };
  vm.runInNewContext(compiled, { exports: testModule.exports, module: testModule, require: (name) => name === 'fs' ? fs : path,
    process: { env: { INVEST_OS_DATA_FILE: file }, pid: process.pid, cwd: () => directory }, structuredClone });
  const db = testModule.exports;
  const initial = await db.readDB();
  initial.tasks[0].title = 'External mutation';
  assert.equal((await db.readDB()).tasks[0].title, 'Saved');
  await fs.promises.rename(file, `${file}.original`);
  await fs.promises.mkdir(file);
  await assert.rejects(db.update('tasks', 'one', { title: 'Unsaved' }));
  assert.equal((await db.readDB()).tasks[0].title, 'Saved');
  await fs.promises.rmdir(file);
  await fs.promises.rename(`${file}.original`, file);
  await db.update('tasks', 'one', { title: 'Recovered' });
  assert.equal(JSON.parse(await fs.promises.readFile(file, 'utf8')).tasks[0].title, 'Recovered');
  console.log('PASS: read isolation, failed-write rollback and subsequent write recovery.');
} finally { await fs.promises.rm(directory, { recursive: true, force: true }); }
