import assert from 'node:assert/strict';
import test from 'node:test';
import { EXERCISE_BY_ID } from '../src/data/exercises.ts';
import { INITIAL_SNAPSHOT, createProfile, recordMovementAssessment } from '../src/domain/profile.ts';
import { beginDailyWorkout, changeReturnPlan, refreshDailyQuest, updateTrainingLoadouts } from '../src/domain/questState.ts';
import { createDailyReadiness, recordDailyReadiness } from '../src/domain/readiness.ts';
import { generateRankTrial, generateWorkout, replaceExerciseInPlan } from '../src/domain/generator.ts';
import { getArcDirective, hasArcTrialEvidence, trainingHistoryBefore } from '../src/domain/arcDirective.ts';
import { loadProgressionOffer } from '../src/domain/loadProgression.ts';
import { lastNormalWorkout, returnPlanActive, returnProgress } from '../src/domain/returnTraining.ts';
import { completeWorkoutSet, workoutResumeBlock, workoutStepKey } from '../src/domain/workoutLifecycle.ts';
import { buildWeeklyProtocol, weeklyProtocolIsCurrent } from '../src/domain/weeklyProtocol.ts';
import { decodeSnapshot } from '../src/domain/persistence.ts';
import { backupChecksum, createBackup, parseBackup } from '../src/domain/backup.ts';
import { assertValidSnapshot } from '../src/domain/snapshotValidation.ts';
import type { AppSnapshot, DailyReadinessInput, WorkoutHistoryEntry } from '../src/domain/types.ts';

const day = '2026-09-15', now = new Date(`${day}T12:00:00`), curl = EXERCISE_BY_ID.get('dumbbell-curl')!;
function record(dateKey: string, overrides: Partial<WorkoutHistoryEntry> = {}): WorkoutHistoryEntry {
  return { id: `history-${dateKey}`, dateKey, date: new Date(`${dateKey}T14:00:00`).toISOString(), planId: `daily-${dateKey}`, title: 'Training', completed: true, difficulty: 1, perceivedDifficulty: 'perfect', durationSeconds: 120, xpEarned: 50,
    attributeXpEarned: { strength: 1, endurance: 0, agility: 0, vitality: 0, mobility: 0 }, statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
    results: [{ exerciseId: curl.id, targetPerSet: curl.maxReps, completedSets: 2, completedVolume: curl.maxReps * 2, recordedSets: [{ actual: curl.maxReps, loadKg: 10, effort: 'perfect' }, { actual: curl.maxReps, loadKg: 10, effort: 'perfect' }] }], ...overrides };
}
function snapshot(): AppSnapshot {
  let profile = recordMovementAssessment(createProfile({ goal: 'strength', experienceLevel: 'advanced', workoutDuration: 60, workoutsPerWeek: 7, availableEquipment: ['dumbbells'] }), {
    'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear',
  }, 'baseline', [], new Date('2026-09-01T12:00:00'));
  profile = { ...profile, totalWorkouts: 20 };
  profile = recordDailyReadiness(profile, createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }, now));
  return refreshDailyQuest({ ...INITIAL_SNAPSHOT, onboardingComplete: true, profile, history: [record('2026-09-14'), record('2026-09-12')] }, day);
}
function start(s = snapshot()) { return changeReturnPlan(s, day, s.profile!.returnPlan?.id ?? null, 'start', now); }
function withSignal(s: AppSnapshot, input: Partial<DailyReadinessInput>) {
  return { ...s.profile!, readinessLog: [createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false, ...input }, now)] };
}

test('explicit activation replaces only unstarted plans and retains history and earned progress', () => {
  const s = snapshot(), before = JSON.stringify(s), oldWeek = s.weeklyProtocol!;
  assert.ok(loadProgressionOffer(curl, s.profile!, s.history, day));
  const r = start(s);
  assert.equal(JSON.stringify(s), before);
  assert.equal(r.history, s.history);
  assert.equal(r.profile!.xp, s.profile!.xp);
  assert.equal(r.profile!.rank, s.profile!.rank);
  assert.equal(r.profile!.experienceLevel, s.profile!.experienceLevel);
  assert.equal(returnPlanActive(r.profile!), true);
  assert.equal(weeklyProtocolIsCurrent(oldWeek, r.profile!, day), false);
  assert.deepEqual(r.weeklyProtocol!.sessions.map((x) => x.dateKey), oldWeek.sessions.map((x) => x.dateKey));
  assert.equal(r.dailyQuest!.plan.returnBlockId, r.profile!.returnPlan!.id);
  assert.equal(changeReturnPlan(r, day, r.profile!.returnPlan!.id, 'start', now), r);
  assert.throws(() => changeReturnPlan(r, day, null, 'start', now), /changed/);
});

test('open work, stale day, first-time users and required checks block a return change', () => {
  const s = snapshot(), active = beginDailyWorkout(s, now);
  assert.ok(active.activeWorkout);
  assert.throws(() => start(active), /active workout/);
  assert.throws(() => changeReturnPlan(s, '2026-09-14', null, 'start', now), /new day/);
  assert.throws(() => start({ ...s, history: [] }), /first normal/);
  assert.throws(() => start({ ...s, pendingArcReviewId: 'pending' }), /checks/);
  assert.throws(() => start({ ...s, profile: { ...s.profile!, healthProfile: { ...s.profile!.healthProfile, safetySignals: ['chest-pain'] } } }), /checks/);
  assert.throws(() => changeReturnPlan(s, '2026-09-29', null, 'start', new Date('2026-09-29T12:00:00')), /checks/);
});

test('return work is capped and every readiness band keeps its stronger restriction', () => {
  const r = start(), plan = r.dailyQuest!.plan;
  assert.ok(plan.exercises.some((x) => x.exercise.exerciseType === 'strength'));
  for (const p of plan.exercises) {
    assert.ok(p.exercise.difficulty <= 2);
    if (!['warmup', 'mobility'].includes(p.exercise.exerciseType)) { assert.ok(p.sets <= 2); assert.equal(p.target, p.exercise.minReps); }
  }
  const reduced = generateWorkout(withSignal(r, { energy: 'low' }), r.history, day);
  assert.ok(reduced.exercises.filter((x) => !['warmup', 'mobility'].includes(x.exercise.exerciseType)).every((x) => x.sets === 1));
  assert.equal(generateWorkout(withSignal(r, { soreness: 'high' }), r.history, day).kind, 'recovery');
  assert.equal(generateWorkout(withSignal(r, { painOrWarning: true }), r.history, day).kind, 'safety-hold');
  assert.equal(loadProgressionOffer(curl, r.profile!, r.history, day), null);
  assert.notEqual(generateRankTrial(r.profile!, r.history, day, 'D').kind, 'rank-trial');
  const replacement = replaceExerciseInPlan(plan, plan.exercises.findIndex((x) => x.exercise.exerciseType === 'strength'), r.profile!);
  if (replacement) for (const p of replacement.exercises.filter((x) => !['warmup', 'mobility'].includes(x.exercise.exerciseType))) assert.equal(p.target, p.exercise.minReps);
});

test('progress requires marked normal work on distinct real completed days', () => {
  const r = start(), id = r.profile!.returnPlan!.id;
  const entries = [record(day, { returnBlockId: id }), record(day, { id: 'duplicate-day', returnBlockId: id }),
    record('2026-09-16', { returnBlockId: id }), record('2026-09-17', { returnBlockId: id }),
    record('2026-09-18', { returnBlockId: id, completed: false }), record('2026-09-19', { returnBlockId: id, planId: 'rank-trial-D' }),
    record('2026-09-20', { returnBlockId: id, results: [] }), record('2026-09-21', { returnBlockId: 'other' })];
  assert.equal(returnProgress(r.profile!, entries, now), 0);
  assert.equal(returnProgress(r.profile!, entries, new Date('2026-09-16T18:00:00')), 2);
  assert.equal(returnProgress(r.profile!, entries, new Date('2026-09-21T18:00:00')), 3);
  assert.equal(returnPlanActive(r.profile!), true);
  assert.equal(returnProgress(r.profile!, [record('2026-09-14', { returnBlockId: id })], now), 0);
  assert.equal(lastNormalWorkout([record(day), record('2026-09-14', { planId: 'rank-trial-D' })], now), null);
});

test('three completed sessions keep limits until confirmation and establish a new evidence boundary', () => {
  const r = start(), id = r.profile!.returnPlan!.id;
  r.history = [record(day, { returnBlockId: id }), record('2026-09-16', { returnBlockId: id }), record('2026-09-17', { returnBlockId: id }), ...r.history];
  const endNow = new Date('2026-09-17T18:00:00');
  assert.equal(getArcDirective(r.profile!, '2026-09-17').progressionAllowed, false);
  const ended = changeReturnPlan(r, '2026-09-17', id, 'end', endNow);
  assert.equal(ended.profile!.returnPlan!.exitReason, 'completed');
  assert.equal(ended.history, r.history);
  assert.equal(returnPlanActive(ended.profile!), false);
  assert.equal(changeReturnPlan(ended, '2026-09-17', id, 'end', endNow), ended);
  assert.equal(getArcDirective(ended.profile!, '2026-09-18').evidenceStart, endNow.toISOString());
  assert.deepEqual(trainingHistoryBefore(ended.history, '2026-09-18', endNow.toISOString()), []);
  assert.equal(hasArcTrialEvidence(ended.profile!, ended.history, '2026-09-18'), false);
  const profile = recordDailyReadiness(ended.profile!, createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }, new Date('2026-09-20T12:00:00')));
  assert.equal(loadProgressionOffer(curl, profile, ended.history, '2026-09-20'), null);
  assert.ok(loadProgressionOffer(curl, profile, [record('2026-09-19'), record('2026-09-18'), ...ended.history], '2026-09-20'));
});

test('early exit keeps old evidence excluded and cannot reopen a completed daily quest', () => {
  const s = snapshot(); s.dailyQuest = { ...s.dailyQuest!, status: 'complete' };
  const r = start(s), id = r.profile!.returnPlan!.id;
  assert.equal(r.dailyQuest, s.dailyQuest);
  const ended = changeReturnPlan(r, day, id, 'end', new Date(`${day}T13:00:00`));
  assert.equal(ended.dailyQuest, s.dailyQuest);
  assert.equal(ended.profile!.returnPlan!.exitReason, 'early-exit');
  assert.equal(hasArcTrialEvidence({ ...ended.profile!, trainingArcs: [] }, ended.history, '2026-09-16'), false);
  assert.throws(() => changeReturnPlan(ended, day, 'old-id', 'start', now), /changed/);
});

test('arc decisions, transitions, exclusions and loadout changes preserve the block', () => {
  const r = start();
  for (const decision of ['advance', 'continue', 'recalibrate', 'recovery', 'hold'] as const) {
    const p = { ...r.profile!, trainingArcs: r.profile!.trainingArcs.map((a) => ({ ...a, entryDecision: decision, directiveReviewedAt: now.toISOString() })) };
    assert.equal(getArcDirective(p, day).progressionAllowed, false);
    const plan = generateWorkout(p, r.history, day);
    if (decision === 'hold') assert.equal(plan.kind, 'safety-hold');
    else assert.ok(plan.exercises.filter((x) => !['warmup', 'mobility'].includes(x.exercise.exerciseType)).every((x) => x.sets <= 2 && x.target === x.exercise.minReps));
  }
  const p = recordMovementAssessment(r.profile!, { 'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear' }, 'reassessment', r.history, new Date('2026-09-29T12:00:00'));
  assert.deepEqual(p.returnPlan, r.profile!.returnPlan);
  const home = updateTrainingLoadouts(r, { active: 'home', home: ['none'], gym: ['none', 'dumbbells'] }, [], now);
  assert.deepEqual(home.profile!.returnPlan, r.profile!.returnPlan);
  assert.ok(home.dailyQuest!.plan.exercises.every((x) => x.exercise.requiredEquipment.every((e) => e === 'none')));
  const excluded = { ...home.profile!, excludedExercises: [home.dailyQuest!.plan.exercises[0]!.exercise.id] };
  assert.ok(generateWorkout(excluded, r.history, day).exercises.every((x) => !excluded.excludedExercises.includes(x.exercise.id)));
});

test('resume and confirmation reject stale or over-limit plans while preserving valid checkpoints', () => {
  const r = start(), active = beginDailyWorkout(r, now);
  assert.equal(workoutResumeBlock(active, now), null);
  const restored = decodeSnapshot(JSON.stringify(active));
  assert.equal(workoutResumeBlock(restored, now), null);
  assert.deepEqual(restored.activeWorkout, active.activeWorkout);
  const stale = structuredClone(active); delete stale.activeWorkout!.plan.returnBlockId;
  assert.match(workoutResumeBlock(stale, now)!, /return plan/);
  assert.equal(completeWorkoutSet(stale, workoutStepKey(stale.activeWorkout!), now), stale);
  const tooMuch = structuredClone(active); const work = tooMuch.activeWorkout!.plan.exercises.find((x) => x.exercise.exerciseType === 'strength')!; work.sets = 5;
  assert.match(workoutResumeBlock(tooMuch, now)!, /return plan/);
  assert.throws(() => assertValidSnapshot(tooMuch), /return plan limits/);
  assert.throws(() => changeReturnPlan(active, day, active.profile!.returnPlan!.id, 'end', now), /active workout/);
});

test('legacy migration and Vault retain return decisions without inventing old blocks', async () => {
  const s = snapshot(), legacy = { ...s, schemaVersion: 14 };
  const upgraded = decodeSnapshot(JSON.stringify(legacy));
  assert.equal(upgraded.schemaVersion, 17);
  assert.equal(upgraded.profile!.returnPlan, undefined);
  assert.deepEqual(upgraded.history, s.history);
  const oldVault = await createBackup(s, false, async () => '');
  const raw = JSON.parse(JSON.stringify(oldVault)); raw.payload.snapshot.schemaVersion = 14; raw.checksum = backupChecksum(JSON.stringify(raw.payload));
  assert.equal(parseBackup(JSON.stringify(raw)).payload.snapshot.schemaVersion, 17);
  const r = start();
  for (const data of [r, changeReturnPlan(r, day, r.profile!.returnPlan!.id, 'end', new Date(`${day}T13:00:00`))]) {
    const vault = await createBackup(data, false, async () => '');
    assert.deepEqual(parseBackup(JSON.stringify(vault)).payload.snapshot.profile!.returnPlan, data.profile!.returnPlan);
  }
});

test('invalid return metadata and mismatched active blocks are rejected', () => {
  const r = start();
  for (const override of [{ endedAt: now.toISOString() }, { endDateKey: day }, { exitReason: 'unknown' }, { startDateKey: '2026-02-31' }, { endedAt: '2026-09-14T12:00:00Z', endDateKey: '2026-09-14', exitReason: 'early-exit' }]) {
    const bad = structuredClone(r); Object.assign(bad.profile!.returnPlan!, override);
    assert.throws(() => assertValidSnapshot(bad), /Invalid Player data/);
  }
  const active = beginDailyWorkout(r, now); active.activeWorkout!.plan.returnBlockId = 'other';
  assert.throws(() => assertValidSnapshot(active), /active return plan/);
});

test('weekly rebuild never silently releases return limits after the third logged day', () => {
  const r = start(), id = r.profile!.returnPlan!.id;
  const history = [record(day, { returnBlockId: id }), record('2026-09-16', { returnBlockId: id }), record('2026-09-17', { returnBlockId: id })];
  const week = buildWeeklyProtocol(r.profile!, history, '2026-09-22');
  for (const session of week.sessions) {
    assert.equal(session.plan.returnBlockId, id);
    assert.ok(session.plan.exercises.filter((x) => !['warmup', 'mobility'].includes(x.exercise.exerciseType)).every((x) => x.sets <= 2));
  }
});
