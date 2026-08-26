import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_HEALTH_PROFILE, INITIAL_SNAPSHOT } from '../domain/profile.ts';
import { totalAttributeXpForValue, trainingWeekKey } from '../domain/progression.ts';
import { STAT_KEYS, type AppSnapshot, type StatBlock, type UserProfile, type WorkoutHistoryEntry } from '../domain/types.ts';

const STORAGE_KEY = '@abyss-protocol/app-snapshot-v1';
const EMPTY_STATS: StatBlock = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };
type StoredSnapshot = Omit<Partial<AppSnapshot>, 'schemaVersion'> & { schemaVersion?: number };

function migrateProfile(profile: UserProfile, history: WorkoutHistoryEntry[]): UserProfile {
  const legacy = profile as UserProfile & { attributeXp?: StatBlock; activeTrainingWeeks?: string[]; healthProfile?: UserProfile['healthProfile']; movementAssessments?: UserProfile['movementAssessments']; trainingArcs?: UserProfile['trainingArcs']; postureScans?: UserProfile['postureScans']; readinessLog?: UserProfile['readinessLog'] };
  const attributeXp = legacy.attributeXp ?? { ...EMPTY_STATS };
  if (!legacy.attributeXp) {
    for (const key of STAT_KEYS) attributeXp[key] = totalAttributeXpForValue(profile[key]);
  }
  const activeTrainingWeeks = legacy.activeTrainingWeeks
    ?? [...new Set(history.filter((entry) => entry.completed).map((entry) => trainingWeekKey(entry.dateKey)))];
  return { ...profile, attributeXp, activeTrainingWeeks, healthProfile: legacy.healthProfile ?? { ...EMPTY_HEALTH_PROFILE }, movementAssessments: legacy.movementAssessments ?? [], trainingArcs: legacy.trainingArcs ?? [], postureScans: legacy.postureScans ?? [], readinessLog: legacy.readinessLog ?? [] };
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
  return { ...INITIAL_SNAPSHOT, ...parsed, schemaVersion: 6, profile, history, lastCompletion };
}

export async function loadSnapshot(): Promise<AppSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SNAPSHOT;
    const parsed = JSON.parse(raw) as StoredSnapshot;
    if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2 && parsed.schemaVersion !== 3 && parsed.schemaVersion !== 4 && parsed.schemaVersion !== 5 && parsed.schemaVersion !== 6) return INITIAL_SNAPSHOT;
    return migrateSnapshot(parsed);
  } catch {
    return INITIAL_SNAPSHOT;
  }
}

export async function saveSnapshot(snapshot: AppSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
