import type { WeeklyReviewInput } from './aiContracts.ts';
import { formatRecordedSet } from './setPerformance.ts';

export interface ReviewEvidence { id: string; kind: 'fact' | 'workout' | 'exercise' | 'measurement' | 'wellbeing' | 'test' | 'adherence'; title: string; detail: string; sourceIds: string[]; available: boolean }
export function reviewEvidence(input: WeeklyReviewInput): Map<string, ReviewEvidence> {
  const entries = new Map<string, ReviewEvidence>();
  const add = (entry: ReviewEvidence) => {
    const old = entries.get(entry.id);
    if (old && JSON.stringify(old) !== JSON.stringify(entry)) throw new Error('Ambiguous evidence identifier.');
    entries.set(entry.id, entry);
  };
  for (const scope of [input, ...(input.historyContext ? [input.historyContext] : [])]) {
    for (const w of scope.training) add({ id: w.id, kind: 'workout', title: `${w.dateKey} · ${w.context}`, detail: `${w.completed ? 'Completed' : 'Not completed'} · ${w.durationSeconds} recorded seconds. A record is not a planned-session denominator.`, sourceIds: [], available: true });
    for (const e of scope.exerciseExposures) add({ id: e.id, kind: 'exercise', title: `${e.dateKey} · ${e.exerciseId}`, detail: `${e.context}; ${e.actualVolume === null ? 'actual volume unavailable' : `${e.actualVolume} actual ${e.unit}`}; ${e.missingActualSets} missing actual sets. ${e.recordedSets.map((s, i) => formatRecordedSet(s, i, e.unit, e.loading ?? undefined)).join('. ')}. ${e.warmupSets.map((s, i) => formatRecordedSet(s, i, e.unit, e.loading ?? undefined, true)).join('. ')}`, sourceIds: [e.workoutId], available: e.actualVolume !== null });
    for (const m of scope.body.records) add({ id: m.id, kind: 'measurement', title: `Body measurements · ${m.measuredOn}`, detail: `${m.protocolId}; kg/cm. ${Object.entries(m.values).map(([key, value]) => `${key}: ${value ?? 'not measured'}`).join('; ')}. Recorded ${m.recordedAt}.`, sourceIds: [], available: true });
    for (const w of scope.wellbeing) add({ id: w.id, kind: 'wellbeing', title: `Wellbeing · ${w.dateKey}`, detail: `Self-report: energy ${w.energy}, sleep ${w.sleep}, soreness ${w.soreness}, warning ${w.painOrWarning ? 'reported' : 'not reported'}, band ${w.band}.`, sourceIds: [], available: true });
    for (const t of [...scope.tests.records, ...(scope.arcContext ? [scope.arcContext.checkpoints.baseline, scope.arcContext.checkpoints.completion].filter(t => t !== null) : [])]) add({ id: t.id, kind: 'test', title: `Movement check · ${t.dateKey}`, detail: `Self-report, ${t.kind}: ${Object.entries(t.results).map(([key, value]) => `${key}: ${value}`).join('; ')}. These are categories, not measured joint angles.`, sourceIds: [], available: true });
    for (const a of scope.archivedAdherence) add({ id: a.id, kind: 'adherence', title: 'Archived cycle adherence', detail: `${a.completedSessions}/${a.scheduledSessions}, target source ${a.targetSource}. Scope: archived cycle, not the review week.`, sourceIds: [], available: true });
    for (const f of scope.facts) add({ id: f.id, kind: 'fact', title: f.metric, detail: `${f.value === null ? 'Unavailable — insufficient comparable records' : `${f.value} ${f.unit}`} · ${f.period.from} – ${f.period.to}. ${f.method}`, sourceIds: [...f.sourceIds], available: f.value !== null });
  }
  for (const e of entries.values()) if (e.sourceIds.some((id) => !entries.has(id))) throw new Error('Unresolved source evidence.');
  return entries;
}
