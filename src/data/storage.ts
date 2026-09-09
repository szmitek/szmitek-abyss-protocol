import AsyncStorage from '@react-native-async-storage/async-storage';

import { INITIAL_SNAPSHOT } from '../domain/profile.ts';
import { migrateSnapshot, type StoredSnapshot } from '../domain/migrations.ts';
import type { AppSnapshot } from '../domain/types.ts';

const STORAGE_KEY = '@abyss-protocol/app-snapshot-v1';

export async function loadSnapshot(): Promise<AppSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SNAPSHOT;
    const parsed = JSON.parse(raw) as StoredSnapshot;
    if (!Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion! < 1 || parsed.schemaVersion! > 11) return INITIAL_SNAPSHOT;
    return migrateSnapshot(parsed);
  } catch {
    return INITIAL_SNAPSHOT;
  }
}

export async function saveSnapshot(snapshot: AppSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
