import type { DailyReadiness, DailyReadinessInput } from './types.ts';

export type ReadinessDraft = {
  energy: DailyReadinessInput['energy'] | null;
  sleep: DailyReadinessInput['sleep'] | null;
  soreness: DailyReadinessInput['soreness'] | null;
  soreMuscles: DailyReadinessInput['soreMuscles'];
  painOrWarning: boolean;
};

export function readinessDraft(signal: DailyReadiness | null, dateKey: string): ReadinessDraft {
  if (!signal || signal.dateKey !== dateKey) return { energy: null, sleep: null, soreness: null, soreMuscles: [], painOrWarning: false };
  return { energy: signal.energy, sleep: signal.sleep, soreness: signal.soreness, soreMuscles: signal.soreness === 'none' ? [] : [...signal.soreMuscles], painOrWarning: signal.painOrWarning };
}

export function readinessInput(draft: ReadinessDraft): DailyReadinessInput | null {
  if (!draft.energy || !draft.sleep || !draft.soreness || (draft.soreness !== 'none' && draft.soreMuscles.length === 0)) return null;
  return { ...draft, energy: draft.energy, sleep: draft.sleep, soreness: draft.soreness, soreMuscles: draft.soreness === 'none' ? [] : [...new Set(draft.soreMuscles)] };
}

export function readinessDraftChanged(initial: ReadinessDraft, draft: ReadinessDraft): boolean {
  return initial.energy !== draft.energy || initial.sleep !== draft.sleep || initial.soreness !== draft.soreness
    || initial.painOrWarning !== draft.painOrWarning
    || [...initial.soreMuscles].sort().join(',') !== [...draft.soreMuscles].sort().join(',');
}
