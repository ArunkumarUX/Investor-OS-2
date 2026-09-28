import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { backup, restore } from './backup.mjs';
const directory = await mkdtemp(path.join(os.tmpdir(), 'invest-recovery-'));
try {
  const source = path.join(directory, 'store.json');
  const restored = path.join(directory, 'restored.json');
  const original = { tasks: [{ id: 'task-1', title: 'Preserve me' }], 'intelligence-v1': [{ id: 'intelligence-v1', state: { decisions: [{ revision: 'revision-1' }] } }] };
  await writeFile(source, JSON.stringify(original));
  const archive = await backup(source, path.join(directory, 'backups'));
  await restore(archive, restored);
  assert.deepEqual(JSON.parse(await readFile(restored, 'utf8')), original);
  await assert.rejects(restore(archive, restored), { code: 'EEXIST' });
  const tampered = JSON.parse(await readFile(archive, 'utf8'));
  tampered.data.tasks[0].title = 'Tampered';
  await writeFile(archive, JSON.stringify(tampered));
  await assert.rejects(restore(archive, path.join(directory, 'bad.json')), /checksum/);
  await writeFile(source, JSON.stringify({ tasks: [{ id: 'duplicate' }, { id: 'duplicate' }] }));
  await assert.rejects(backup(source, directory), /duplicate/);
  console.log('PASS: exact recovery, overwrite protection, checksum validation and duplicate rejection.');
} finally { await rm(directory, { recursive: true, force: true }); }
