import { EXERCISE_BY_ID } from '../data/exercises.ts';
import { bodyMeasurementStats, isMeasurementDay } from './bodyMeasurements.ts';
import type { ExerciseExposure, ReviewFact, ReviewPeriod, WeeklyReviewInput } from './aiContracts.ts';
import type { AppSnapshot } from './types.ts';

export function buildWeeklyReview(snapshot: AppSnapshot, period: ReviewPeriod, requestId: string): WeeklyReviewInput {
  if (!requestId || !isMeasurementDay(period.from) || !isMeasurementDay(period.to) || period.from > period.to || period.bounds !== 'inclusive-local-dates') throw new Error('Invalid review period or request ID.');
  try { new Intl.DateTimeFormat('en', { timeZone: period.timeZone }); } catch { throw new Error('Invalid review time zone.'); }
  const calendarDays = (Date.parse(period.to) - Date.parse(period.from)) / 86400000 + 1;
  const within = (day: string) => day >= period.from && day <= period.to;
  const profile = snapshot.profile;
  const history = snapshot.history.filter((w) => within(w.dateKey)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const context = (w: typeof history[number]) => w.planId.startsWith('rank-trial-') ? 'trial' as const : w.returnBlockId ? 'return' as const : 'training' as const;
  const training = history.map((w) => ({ id: w.id, dateKey: w.dateKey, completed: w.completed, durationSeconds: w.durationSeconds, context: context(w) }));
  const completed = history.filter((w) => w.completed && context(w) !== 'trial' && w.results.some((r) => r.completedSets > 0));
  const exerciseExposures: ExerciseExposure[] = [];
  for (const w of history.filter((w) => w.completed)) for (const [index, r] of w.results.entries()) {
    const e = EXERCISE_BY_ID.get(r.exerciseId);
    const sets = r.recordedSets ?? Array.from({ length: r.completedSets }, () => null);
    const missing = sets.filter((s) => s === null).length;
    const machineIds = new Set(sets.map((s) => s?.machineSetup ? JSON.stringify([s.machineSetup.id, s.machineSetup.location, s.machineSetup.label]) : null));
    const comparable = context(w) === 'training' && e && e.exerciseType !== 'warmup' && !missing && sets.length > 0
      && (e.loading !== 'stack' || machineIds.size === 1 && !machineIds.has(null));
    exerciseExposures.push({ id: `exposure:${w.id}:${index}`, workoutId: w.id, dateKey: w.dateKey, exerciseId: r.exerciseId,
      unit: e?.repType ?? 'unknown', loading: e?.loading ?? null,
      comparisonKey: comparable ? JSON.stringify([e.id, e.repType, e.loading ?? 'bodyweight', e.loading === 'stack' ? [...machineIds][0] : null]) : null,
      recordedSets: sets, warmupSets: r.warmupSets ?? [], actualVolume: missing || !e ? null : sets.reduce((sum, s) => sum + s!.actual, 0),
      externalLoadVolume: missing || e?.repType !== 'reps' || !e.loading || sets.some((s) => s?.loadKg === null) ? null : sets.reduce((sum, s) => sum + s!.actual * s!.loadKg!, 0),
      prescribedVolume: r.targetPerSet * r.completedSets, missingActualSets: missing,
      context: e?.exerciseType === 'warmup' ? 'warmup' : context(w),
    });
    // Explicit warm-up sets stay outside the work facts and comparison groups.
  }
  const wellbeing = (profile?.readinessLog ?? []).filter((r) => within(r.dateKey)).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const bodyRecords = (profile?.bodyMeasurements ?? []).filter((m) => within(m.measuredOn));
  const statistics = bodyMeasurementStats(bodyRecords, period);
  const facts: ReviewFact[] = [];
  const fact = (id: string, metric: string, value: number | null, unit: string, sourceIds: string[], method: string) => facts.push({ id, type: 'FACT', metric, value, unit, sourceIds, method, period: { ...period } });
  fact('training:completed', 'Completed training sessions', completed.length, 'sessions', completed.map((w) => w.id), 'Completed non-trial sessions with logged sets, including explicitly marked return sessions.');
  const activeDays = new Set(completed.map((w) => w.dateKey)).size;
  fact('training:active-days', 'Active training days', activeDays, 'days', completed.map((w) => w.id), 'Distinct recorded training dates; not a planned-session adherence percentage.');
  for (const [metric, s] of Object.entries(statistics.metrics)) {
    fact(`body:${metric}:latest`, `Latest ${metric}`, s.latest?.value ?? null, s.unit, s.latest ? [s.latest.id] : [], 'Latest non-null recorded value in the requested period.');
    fact(`body:${metric}:change`, `${metric} change`, s.change, s.unit, s.latest && s.previous ? [s.previous.id, s.latest.id] : [], 'Latest minus previous value on an earlier date, same protocol and metric units.');
    fact(`body:${metric}:mean`, `Mean ${metric}`, s.mean, s.unit, s.evidenceIds, 'Mean of daily means, same protocol as the latest value; no missing-day imputation.');
  }
  const groups = new Map<string, ExerciseExposure[]>();
  for (const e of exerciseExposures) if (e.comparisonKey) groups.set(e.comparisonKey, [...(groups.get(e.comparisonKey) ?? []), e]);
  for (const [key, samples] of groups) {
    const latest = samples.at(-1)!;
    const before = samples.find((s) => s.dateKey < latest.dateKey);
    fact(`exercise:${key}:actual-change`, `${latest.exerciseId} recorded volume change`, before ? latest.actualVolume! - before.actualVolume! : null, latest.unit,
      before ? [before.id, latest.id] : [latest.id], 'Latest exposure minus first earlier-day exposure within one exercise/loading/machine group. Session volume is not a strength estimate.');
    const uniformLoad = (sample: ExerciseExposure) => {
      const load = sample.recordedSets[0]?.loadKg;
      return typeof load === 'number' && sample.recordedSets.every((s) => s?.loadKg === load) ? load : null;
    };
    const firstLoad = before ? uniformLoad(before) : null, lastLoad = uniformLoad(latest);
    fact(`exercise:${key}:load-change`, `${latest.exerciseId} recorded load change`, firstLoad !== null && lastLoad !== null ? lastLoad - firstLoad : null,
      latest.loading === 'per-hand' ? 'kg-per-hand' : latest.loading === 'stack' ? 'kg-marked-stack' : 'kg-total', before ? [before.id, latest.id] : [latest.id],
      'Uniform recorded work-set load only, same comparison group and distinct days. No estimate of strength or next-session load.');
    fact(`exercise:${key}:load-volume-change`, `${latest.exerciseId} external load volume change`, before?.externalLoadVolume !== null && before?.externalLoadVolume !== undefined && latest.externalLoadVolume !== null ? latest.externalLoadVolume - before.externalLoadVolume : null,
      latest.loading === 'per-hand' ? 'kg-per-hand × reps' : 'kg × reps', before ? [before.id, latest.id] : [latest.id], 'Sum of actual reps × logged external load. Per-hand values are not doubled; body mass is excluded.');
  }
  const wellbeingDays = new Set(wellbeing.map((r) => r.dateKey)).size;
  // The current weekly schedule is mutable and only one week is retained. Do not
  // invent an original denominator for an arbitrary historical review window.
  const result: WeeklyReviewInput = {
    contractVersion: 'weekly-review.v1', requestId, locale: 'en', period: { ...period }, facts, training, exerciseExposures,
    adherence: { completedTrainingSessions: completed.length, activeDays, plannedSessions: null, rate: null, reason: 'Original schedule coverage is not retained for arbitrary review periods. Current frequency is not a historical target.' },
    archivedAdherence: (profile?.trainingArcReviews ?? []).filter((r) => within(r.dateKey)).map((r) => ({ id: r.id, ...r.adherence, scope: 'archived-cycle-not-review-period' })),
    wellbeing, tests: { method: 'self-report', records: (profile?.movementAssessments ?? []).filter((a) => within(a.dateKey)) },
    body: { records: bodyRecords, statistics },
    dataCoverage: { calendarDays, wellbeingDays, missingWellbeingDays: calendarDays - wellbeingDays, measurementDays: statistics.measuredDays, missingActualSets: exerciseExposures.reduce((sum, e) => sum + e.missingActualSets, 0) },
    photos: { status: 'no_pixels_attached', localAnalysis: 'not_run', manifest: (profile?.postureScans ?? []).filter((s) => within(s.dateKey)).map((s) => ({ id: s.id, recordedOn: s.dateKey, protocol: s.protocol ?? null, views: Object.keys(s.photos).sort() })) },
    constraints: { mayModifyPlan: false, mayDiagnose: false, mayEstimateBodyComposition: false },
  };
  // Detach all nested records: a provider must never mutate the application state.
  return JSON.parse(JSON.stringify(result)) as WeeklyReviewInput;
}
