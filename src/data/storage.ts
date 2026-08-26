import AsyncStorage from '@react-native-async-storage/async-storage';

import { INITIAL_SNAPSHOT } from '../domain/profile.ts';
import { totalAttributeXpForValue, trainingWeekKey } from '../domain/progression.ts';
import { STAT_KEYS, type AppSnapshot, type StatBlock, type UserProfile, type WorkoutHistoryEntry } from '../domain/types.ts';

const STORAGE_KEY = '@abyss-protocol/app-snapshot-v1';
const EMPTY_STATS: StatBlock = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };
type StoredSnapshot = Omit<Partial<AppSnapshot>, 'schemaVersion'> & { schemaVersion?: number };

function migrateProfile(profile: UserProfile, history: WorkoutHistoryEntry[]): UserProfile {
  const legacy = profile as UserProfile & { attributeXp?: StatBlock; activeTrainingWeeks?: string[] };
  const attributeXp = legacy.attributeXp ?? { ...EMPTY_STATS };
  if (!legacy.attributeXp) {
    for (const key of STAT_KEYS) attributeXp[key] = totalAttributeXpForValue(profile[key]);
  }
  const activeTrainingWeeks = legacy.activeTrainingWeeks
    ?? [...new Set(history.filter((entry) => entry.completed).map((entry) => trainingWeekKey(entry.dateKey)))];
  return { ...profile, attributeXp, activeTrainingWeeks };
}

function migrateSnapshot(parsed: StoredSnapshot): AppSnapshot {
  const history = (parsed.history ?? []).map((entry) => ({
    ...entry,
    attributeXpEarned: entry.attributeXpEarned ?? { ...EMPTY_STATS },
  }));
  const profile = parsed.profile ? migrateProfile(parsed.profile, history) : null;
  const lastCompletion = parsed.lastCompletion
    ? { ...parsed.lastCompletion, attributeXpEarned: parsed.lastCompletion.attributeXpEarned ?? { ...EMPTY_STATS } }
    : null;
  return { ...INITIAL_SNAPSHOT, ...parsed, schemaVersion: 2, profile, history, lastCompletion };
}

export async function loadSnapshot(): Promise<AppSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SNAPSHOT;
    const parsed = JSON.parse(raw) as StoredSnapshot;
    if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) return INITIAL_SNAPSHOT;
    return migrateSnapshot(parsed);
  } catch {
    return INITIAL_SNAPSHOT;
  }
}

export async function saveSnapshot(snapshot: AppSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
