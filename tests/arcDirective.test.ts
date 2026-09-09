import assert from 'node:assert/strict';
import test from 'node:test';

import { EXERCISES } from '../src/data/exercises.ts';
import { getArcDirective, hasArcTrialEvidence, masteredTwice, trainingHistoryBefore } from '../src/domain/arcDirective.ts';
import { generateDailyProtocol, generateRankTrial, generateWorkout, replaceExerciseInPlan } from '../src/domain/generator.ts';
import { migrateSnapshot, type StoredSnapshot } from '../src/domain/migrations.ts';
import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment, updateCorrectiveProfile } from '../src/domain/profile.ts';
import { rankTrialEligibility } from '../src/domain/progression.ts';
import { acknowledgeTrainingArcReview, beginDailyWorkout, refreshDailyQuest } from '../src/domain/questState.ts';
import { createDailyReadiness, recordDailyReadiness } from '../src/domain/readiness.ts';
import { buildWeeklyProtocol, ensureWeeklyProtocol } from '../src/domain/weeklyProtocol.ts';
import type { AppSnapshot, TrainingArcDecision, UserProfile, WorkoutHistoryEntry, WorkoutPlan } from '../src/domain/types.ts';

const clear = { 'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear' } as const;
const weekThree = '2026-10-13';
const ready = { energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false } as const;

function player(decision: TrainingArcDecision = 'advance'): UserProfile {
  const base = recordMovementAssessment(createProfile({ goal: 'strength', experienceLevel: 'advanced', workoutDuration: 30, workoutsPerWeek: 7, availableEquipment: ['none'] }), clear, 'baseline', [], new Date('2026-09-29T10:00:00Z'));
  const profile: UserProfile = {
    ...base, id: 'directive-player', totalWorkouts: 20, level: 6, streak: 5, activeTrainingWeeks: ['w1', 'w2', 'w3', 'w4'],
    excludedExercises: EXERCISES.filter((exercise) => !['wall-pushup', 'knee-pushup', 'pushup', 'arm-circles', 'cat-cow'].includes(exercise.id)).map((exercise) => exercise.id),
    trainingArcs: base.trainingArcs.map((arc) => ({ ...arc, entryDecision: decision })),
  };
  return recordDailyReadiness(profile, createDailyReadiness({ ...ready, soreMuscles: [] }, new Date(`${weekThree}T08:00:00Z`)));
}

function session(dateKey: string, overrides: Partial<WorkoutHistoryEntry> = {}): WorkoutHistoryEntry {
  return {
    id: `session-${dateKey}`, dateKey, date: `${dateKey}T18:00:00Z`, planId: `daily-${dateKey}`, title: 'TEST PROTOCOL',
    completed: true, durationSeconds: 1200, difficulty: 1, perceivedDifficulty: 'perfect',
    results: [{ exerciseId: 'wall-pushup', completedSets: 2, targetPerSet: 10, completedVolume: 20 }], xpEarned: 100,
    attributeXpEarned: { strength: 18, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
    statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 }, ...overrides,
  };
}

const work = (plan: WorkoutPlan) => plan.exercises.filter((item) => !['warmup', 'mobility'].includes(item.exercise.exerciseType));
const push = (plan: WorkoutPlan) => {
  const item = plan.exercises.find((item) => item.exercise.progressionGroup === 'pushup');
  assert.ok(item, 'Expected a push-up family exercise');
  return item;
};
const freshEvidence = () => [session('2026-10-02'), session('2026-10-06')];
const snapshot = (profile: UserProfile, history: WorkoutHistoryEntry[] = []): AppSnapshot => ({ ...INITIAL_SNAPSHOT, onboardingComplete: true, profile, history });

test('ADVANCE progresses only in week three with two successful exposures from the current cycle', () => {
  const profile = player();
  const old = [session('2026-09-20'), session('2026-09-23')];
  const before = push(generateWorkout(profile, old, weekThree));
  assert.equal(before.exercise.id, 'wall-pushup');
  assert.equal(before.target, 10);
  const progressed = push(generateWorkout(profile, freshEvidence(), weekThree));
  assert.ok(progressed.exercise.progressionLevel > before.exercise.progressionLevel);
  assert.equal(push(generateWorkout(profile, freshEvidence(), '2026-10-07')).exercise.id, 'wall-pushup');
  assert.equal(push(generateWorkout(profile, freshEvidence(), '2026-10-20')).exercise.id, 'wall-pushup');
});

test('CONTINUE preserves targets and variants even after success, but permits a too-hard reduction', () => {
  const profile = player('continue');
  const kept = push(generateWorkout(profile, freshEvidence(), weekThree));
  assert.equal(kept.exercise.id, 'wall-pushup');
  assert.equal(kept.target, 10);
  const lowered = push(generateWorkout(profile, [session('2026-10-06', { perceivedDifficulty: 'too-hard' })], weekThree));
  assert.ok(lowered.target < kept.target);
});

test('invalid, duplicate, same-day, future and trial records cannot authorize overload', () => {
  const profile = player();
  const good = session('2026-10-02');
  const rejected = [
    session('2026-10-06', { completed: false }),
    session('2026-10-06', { perceivedDifficulty: 'too-hard' }),
    session('2026-10-06', { results: [{ exerciseId: 'wall-pushup', completedSets: 0, targetPerSet: 10, completedVolume: 0 }] }),
    session('2026-10-06', { results: [{ exerciseId: 'wall-pushup', completedSets: 2, targetPerSet: 10, completedVolume: 10 }] }),
    session('2026-10-06', { planId: 'rank-trial-D-2026-10-06' }),
    session('2026-10-02', { id: 'same-date-second-session' }),
    session('2026-10-14'), good,
  ];
  for (const other of rejected) {
    const history = [good, other];
    const eligible = trainingHistoryBefore(history, weekThree);
    assert.equal(masteredTwice(eligible, 'wall-pushup', getArcDirective(profile, weekThree).evidenceStart), false);
    assert.equal(push(generateWorkout(profile, history, weekThree)).exercise.id, 'wall-pushup');
  }
});

test('RECALIBRATE survives report acknowledgement and opens only after a saved confirmation, including unchanged targets', () => {
  const profile: UserProfile = { ...player('recalibrate'), correctiveProfile: { configured: true, targets: [{ goal: 'pelvic-control', priority: 'primary', sources: ['self-observation'] }], updatedAt: '2026-09-10T10:00:00Z' } };
  const initial = { ...snapshot(profile), pendingArcReviewId: 'previous-report' };
  const acknowledged = acknowledgeTrainingArcReview(initial, weekThree);
  assert.equal(acknowledged.pendingArcReviewId, null);
  assert.equal(acknowledged.dailyQuest?.plan.kind, 'directive-review');
  assert.equal(generateWorkout(profile, [], weekThree).kind, 'directive-review');
  assert.equal(generateRankTrial(profile, [], weekThree, 'D').kind, 'directive-review');
  assert.equal(beginDailyWorkout(acknowledged, new Date(`${weekThree}T10:00:00Z`)).activeWorkout, null);
  const confirmed = updateCorrectiveProfile(profile, profile.correctiveProfile, new Date(`${weekThree}T10:00:00Z`));
  assert.ok(confirmed.trainingArcs[0]?.directiveReviewedAt);
  assert.equal(confirmed.correctiveHistory.length, 1);
  assert.deepEqual(confirmed.correctiveProfile.targets, profile.correctiveProfile.targets);
  const plan = generateWorkout(confirmed, freshEvidence(), weekThree);
  assert.equal(plan.kind, 'training');
  assert.ok(work(plan).every((item) => item.sets <= 2 && item.exercise.difficulty <= 2));
  assert.equal(push(plan).target, 10);
  assert.equal(updateCorrectiveProfile(confirmed, confirmed.correctiveProfile), confirmed);
});

test('RECOVERY starts at minimum targets and one set, then stays capped with no overload', () => {
  const profile = player('recovery');
  const old = [session('2026-09-23', { results: [{ exerciseId: 'pushup', completedSets: 4, targetPerSet: 99, completedVolume: 396 }] })];
  const first = generateWorkout(profile, old, '2026-09-29');
  assert.ok(work(first).every((item) => item.sets === 1 && item.target === item.exercise.minReps && item.exercise.difficulty === 1));
  for (const day of ['2026-10-06', weekThree, '2026-10-20']) {
    const plan = generateWorkout(profile, old, day);
    assert.ok(work(plan).every((item) => item.sets <= 2 && item.exercise.difficulty <= 2 && item.target === item.exercise.minReps));
    assert.equal(push(plan).exercise.id, 'wall-pushup');
  }
});

test('HOLD needs both a later pain-free movement check and clear warnings, then starts a protected week', () => {
  const held = player('hold');
  assert.equal(generateDailyProtocol(held, [], weekThree).kind, 'safety-hold');
  const checked = recordMovementAssessment(held, clear, 'reassessment', [], new Date('2026-10-10T10:00:00Z'));
  const warning = { ...checked, healthProfile: { ...checked.healthProfile, safetySignals: ['fainting-dizziness' as const] } };
  assert.equal(generateWorkout(warning, [], weekThree).kind, 'safety-hold');
  const resumed = generateWorkout(checked, [], weekThree);
  assert.equal(resumed.kind, 'training');
  assert.ok(work(resumed).every((item) => item.exercise.difficulty === 1 && item.sets === 1 && item.target === item.exercise.minReps));
  assert.equal(getArcDirective(checked, '2026-10-17').protectedEntry, false);
  assert.equal(getArcDirective(checked, '2026-10-17').progressionAllowed, false);
});

test('exercise substitution preserves minimum rebuilding targets and protected difficulty and sets', () => {
  const profile: UserProfile = { ...player('recovery'), excludedExercises: [] };
  const plan = generateWorkout(profile, [], '2026-09-29');
  let substitutions = 0;
  for (let index = 0; index < plan.exercises.length; index += 1) {
    const replacement = replaceExerciseInPlan(plan, index, profile);
    if (!replacement) continue;
    substitutions += 1;
    const item = replacement.exercises[index]!;
    assert.equal(item.target, item.exercise.minReps);
    assert.equal(item.sets, 1);
    assert.equal(item.exercise.difficulty, 1);
    assert.deepEqual(item.exercise.requiredEquipment, ['none']);
  }
  assert.ok(substitutions > 0);
});

test('Rank Trial cannot bypass a cycle directive or reuse previous-cycle evidence', () => {
  const profile = player();
  assert.equal(hasArcTrialEvidence(profile, [session('2026-09-20'), session('2026-09-23')], weekThree), false);
  assert.equal(rankTrialEligibility(profile, weekThree, []).eligible, false);
  assert.equal(generateRankTrial(profile, [], weekThree, 'D').kind, 'recovery');
  assert.equal(rankTrialEligibility(profile, weekThree, freshEvidence()).eligible, true);
  assert.equal(generateRankTrial(profile, freshEvidence(), weekThree, 'D').kind, 'rank-trial');
  for (const readinessLog of [[], [createDailyReadiness({ ...ready, energy: 'low', soreMuscles: [] }, new Date(`${weekThree}T08:00:00Z`))]]) {
    assert.notEqual(generateRankTrial({ ...profile, readinessLog }, freshEvidence(), weekThree, 'D').kind, 'rank-trial');
  }
  for (const decision of ['continue', 'recovery', 'recalibrate', 'hold'] as const) {
    assert.equal(rankTrialEligibility(player(decision), weekThree, freshEvidence()).eligible, false);
    assert.notEqual(generateRankTrial(player(decision), freshEvidence(), weekThree, 'D').kind, 'rank-trial');
  }
});

test('a same-ID weekly contract is replaced when its directive changes, including the cached daily plan', () => {
  const original = player();
  const history = freshEvidence();
  const old = refreshDailyQuest(snapshot(original, history), weekThree);
  const changed = player('continue');
  const protocol = ensureWeeklyProtocol(old.weeklyProtocol, changed, history, weekThree);
  assert.equal(protocol.id, old.weeklyProtocol?.id);
  assert.notEqual(protocol.profileFingerprint, old.weeklyProtocol?.profileFingerprint);
  const next = refreshDailyQuest({ ...old, profile: changed }, weekThree);
  assert.equal(next.dailyQuest?.plan.trainingArc?.entryDecision, 'continue');
  assert.equal(push(next.dailyQuest!.plan).exercise.id, 'wall-pushup');
});

test('acknowledgement cannot reopen a cleared daily workout and gates override cached completed quests', () => {
  const cleared = session(weekThree);
  const old = refreshDailyQuest(snapshot(player(), [cleared]), weekThree);
  const acknowledged = acknowledgeTrainingArcReview({ ...old, pendingArcReviewId: 'report' }, weekThree);
  assert.equal(acknowledged.dailyQuest?.status, 'complete');
  assert.equal(beginDailyWorkout(acknowledged, new Date(`${weekThree}T20:00:00Z`)).activeWorkout, null);
  const gated = refreshDailyQuest({ ...old, profile: player('recalibrate') }, weekThree);
  assert.equal(gated.dailyQuest?.plan.kind, 'directive-review');
  assert.equal(gated.weeklyProtocol, null);
});

test('starting a stale quest checks current date, directive and readiness again', () => {
  const old = refreshDailyQuest(snapshot(player()), weekThree);
  assert.ok(beginDailyWorkout(old, new Date(`${weekThree}T10:00:00Z`)).activeWorkout);
  const nextDay = beginDailyWorkout(old, new Date('2026-10-14T10:00:00Z'));
  assert.equal(nextDay.activeWorkout, null);
  assert.equal(nextDay.dailyQuest?.dateKey, '2026-10-14');
  const reduced = recordDailyReadiness(old.profile!, createDailyReadiness({ ...ready, energy: 'low', soreMuscles: [] }, new Date(`${weekThree}T09:00:00Z`)));
  const adapted = beginDailyWorkout({ ...old, profile: reduced }, new Date(`${weekThree}T10:00:00Z`));
  assert.equal(adapted.activeWorkout?.plan.readinessBand, 'reduced');
  assert.ok(work(adapted.activeWorkout!.plan).every((item) => item.sets < work(old.dailyQuest!.plan).find((before) => before.exercise.id === item.exercise.id)!.sets));
  const gated = beginDailyWorkout({ ...old, profile: player('recalibrate') }, new Date(`${weekThree}T10:00:00Z`));
  assert.equal(gated.activeWorkout, null);
  assert.equal(gated.dailyQuest?.plan.kind, 'directive-review');
});

test('v10 migration preserves archives and pending confirmation; confirmed v11 review survives reload', () => {
  const old = JSON.parse(JSON.stringify(snapshot(player('recalibrate'), freshEvidence())));
  old.schemaVersion = 10;
  delete old.profile.trainingArcs[0].directiveReviewedAt;
  const migrated = migrateSnapshot(old as StoredSnapshot);
  assert.equal(migrated.schemaVersion, 11);
  assert.equal(migrated.profile?.trainingArcs[0]?.directiveReviewedAt, null);
  assert.deepEqual(migrated.history, old.history);
  const profile = updateCorrectiveProfile(migrated.profile!, migrated.profile!.correctiveProfile, new Date(`${weekThree}T10:00:00Z`));
  const restored = migrateSnapshot({ ...migrated, profile });
  assert.equal(getArcDirective(restored.profile!, weekThree).needsDirectiveReview, false);
  assert.deepEqual(restored.profile?.trainingArcReviews, migrated.profile?.trainingArcReviews);
});

test('NONE equipment and readiness constraints remain stronger than all cycle directives and weekly sessions', () => {
  for (const decision of ['advance', 'continue', 'recalibrate', 'recovery', 'hold'] as const) {
    let profile: UserProfile = { ...player(decision), excludedExercises: [] };
    if (decision === 'recalibrate') profile = updateCorrectiveProfile(profile, profile.correctiveProfile);
    for (const day of ['2026-09-29', '2026-10-06', weekThree, '2026-10-20']) {
      const protocol = buildWeeklyProtocol(profile, freshEvidence(), day);
      for (const session of protocol.sessions) for (const item of session.plan.exercises) assert.deepEqual(item.exercise.requiredEquipment, ['none']);
    }
    const hold = recordDailyReadiness(profile, createDailyReadiness({ ...ready, soreMuscles: [], painOrWarning: true }, new Date(`${weekThree}T08:00:00Z`)));
    assert.equal(generateDailyProtocol(hold, [], weekThree).exercises.length, 0);
  }
});
