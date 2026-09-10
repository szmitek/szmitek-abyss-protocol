import { INITIAL_SNAPSHOT } from './profile.ts';
import { migrateSnapshot, type StoredSnapshot } from './migrations.ts';
import { assertValidSnapshot } from './snapshotValidation.ts';
import type { AppSnapshot } from './types.ts';

export const STORAGE_KEY = '@abyss-protocol/app-snapshot-v1';
export const RECOVERY_KEY = '@abyss-protocol/pre-restore-v1';
export interface SnapshotStorage { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> }

export function decodeSnapshot(raw: string | null): AppSnapshot {
  if (raw === null) return INITIAL_SNAPSHOT;
  const parsed = JSON.parse(raw) as StoredSnapshot;
  if (!parsed || !Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion! < 1 || parsed.schemaVersion! > 11) throw new Error('Unsupported saved data version.');
  const snapshot = migrateSnapshot(parsed);
  assertValidSnapshot(snapshot);
  return snapshot;
}

export function createSnapshotRepository(storage: SnapshotStorage) {
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };
  return {
    load: () => enqueue(async () => decodeSnapshot(await storage.getItem(STORAGE_KEY))),
    save: (snapshot: AppSnapshot) => {
      const serialized = JSON.stringify(snapshot);
      return enqueue(() => storage.setItem(STORAGE_KEY, serialized));
    },
    replace: (snapshot: AppSnapshot) => {
      assertValidSnapshot(snapshot);
      const serialized = JSON.stringify(snapshot);
      return enqueue(async () => {
        const previous = await storage.getItem(STORAGE_KEY);
        // Preserve the exact old record, including a damaged one, before replacement.
        if (previous !== null) await storage.setItem(RECOVERY_KEY, previous);
        await storage.setItem(STORAGE_KEY, serialized);
      });
    },
    loadRecovery: () => enqueue(async () => {
      const raw = await storage.getItem(RECOVERY_KEY);
      if (raw === null) throw new Error('No pre-import recovery save exists on this device.');
      return decodeSnapshot(raw);
    }),
    restoreRecovery: () => enqueue(async () => {
      const raw = await storage.getItem(RECOVERY_KEY);
      if (raw === null) throw new Error('No pre-import recovery save exists on this device.');
      const snapshot = decodeSnapshot(raw);
      await storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      return snapshot;
    }),
  };
}
