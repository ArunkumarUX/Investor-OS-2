import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export function validateStore(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid workspace object.');
  for (const [collection, records] of Object.entries(data)) {
    if (!Array.isArray(records)) throw new Error(`Invalid collection: ${collection}`);
    const ids = new Set();
    for (const record of records) {
      if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id || ids.has(record.id))
        throw new Error(`Invalid or duplicate record in ${collection}`);
      ids.add(record.id);
    }
  }
  return data;
}
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function backup(source, directory) {
  const data = validateStore(JSON.parse(await readFile(source, 'utf8')));
  const envelope = { format: 'invest-os-backup-v1', createdAt: new Date().toISOString(), sha256: digest(data), data };
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = path.join(directory, `invest-os-${Date.now()}-${randomUUID()}.json`);
  await writeFile(destination, JSON.stringify(envelope, null, 2), { flag: 'wx', mode: 0o600 });
  return destination;
}
export async function restore(source, destination) {
  const envelope = JSON.parse(await readFile(source, 'utf8'));
  if (envelope.format !== 'invest-os-backup-v1' || digest(envelope.data) !== envelope.sha256)
    throw new Error('Backup format or checksum is invalid.');
  validateStore(envelope.data);
  // Never overwrite an active workspace. Restore to a new path, inspect, then configure the app to use it.
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await writeFile(destination, JSON.stringify(envelope.data, null, 2), { flag: 'wx', mode: 0o600 });
  return destination;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [command, source, destination] = process.argv.slice(2);
  try {
    if (command === 'create') console.log(await backup(source || process.env.INVEST_OS_DATA_FILE || 'data/store.json', destination || 'data/backups'));
    else if (command === 'restore' && source && destination) console.log(await restore(source, destination));
    else throw new Error('Usage: node scripts/backup.mjs create [store] [backup-directory] | restore <backup> <new-store>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
