import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCorrectiveProfile } from '../src/domain/correctiveProfile.ts';
import { generateDailyProtocol } from '../src/domain/generator.ts';
import { createProfile, updateCorrectiveProfile } from '../src/domain/profile.ts';
import { createDailyReadiness, recordDailyReadiness } from '../src/domain/readiness.ts';
import { registerAssessmentWithTrainingArcs } from '../src/domain/trainingArc.ts';
import { ensureWeeklyProtocol, weeklyProtocolIsCurrent, weeklyWorkingSets } from '../src/domain/weeklyProtocol.ts';
import { EQUIPMENT, GOALS, type DailyReadinessInput, type UserProfile } from '../src/domain/types.ts';

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...createProfile({
      goal: GOALS.GENERAL,
      experienceLevel: 'beginner',
      workoutDuration: 30,
      workoutsPerWeek: 3,
      availableEquipment: [EQUIPMENT.NONE],
    }),
    id: 'weekly-player',
    ...overrides,
  };
}

function withReadiness(user: UserProfile, dateKey: string, input: DailyReadinessInput): UserProfile {
  return recordDailyReadiness(user, createDailyReadiness(input, new Date(`${dateKey}T12:00:00.000Z`)));
}

test('weekly protocol locks the selected number of named, spaced sessions', () => {
  const protocol = ensureWeeklyProtocol(null, profile(), [], '2026-09-07');
  assert.deepEqual(protocol.sessions.map((session) => session.code), ['A', 'B', 'C']);
  assert.deepEqual(protocol.sessions.map((session) => session.dateKey), ['2026-09-07', '2026-09-09', '2026-09-11']);
  assert.deepEqual(protocol.sessions.map((session) => session.objective), ['LOWER + PUSH', 'HINGE + PULL', 'FULL BODY + CORRECTIVE']);
  assert.ok(protocol.sessions.every((session, index) => session.plan.weeklySession?.sessionIndex === index));
  assert.ok(protocol.sessions.every((session) => session.plan.weeklySession?.sessionCount === 3));
});

test('A/B/C sessions follow distinct objectives instead of redrawing independent daily workouts', () => {
  const protocol = ensureWeeklyProtocol(null, profile(), [], '2026-09-07');
  const workMuscles = protocol.sessions.map((session) => new Set(session.plan.exercises
    .filter(({ exercise }) => !['warmup', 'mobility'].includes(exercise.exerciseType))
    .map(({ exercise }) => exercise.primaryMuscle)));
  assert.ok(workMuscles[0]?.has('quads'));
  assert.ok(workMuscles[0]?.has('chest'));
  assert.ok(workMuscles[1]?.has('hamstrings'));
  assert.ok(workMuscles[1]?.has('back'));
  assert.ok(workMuscles[2]?.has('full-body'));
});

test('confirmed corrective direction reserves compatible work in every weekly session', () => {
  const user = profile();
  const configured = updateCorrectiveProfile(user, buildCorrectiveProfile(user, ['pelvic-control'], 'pelvic-control'));
  const protocol = ensureWeeklyProtocol(null, configured, [], '2026-09-07');
  assert.ok(protocol.sessions.every((session) => session.plan.exercises.some((item) => item.selectionReasons?.some((reason) => reason.code === 'corrective'))));
  assert.ok(protocol.sessions.every((session) => session.plan.exercises.some((item) => item.selectionReasons?.some((reason) => reason.code === 'training-goal'))));
});

test('weekly primary-muscle working sets never exceed the protocol ceilings', () => {
  for (const frequency of [2, 3, 4, 5, 6, 7] as const) {
    const protocol = ensureWeeklyProtocol(null, profile({ workoutsPerWeek: frequency }), [], '2026-09-07');
    const used = weeklyWorkingSets(protocol);
    for (const [muscle, sets] of Object.entries(used)) {
      assert.ok((sets ?? 0) <= (protocol.volumeCaps[muscle as keyof typeof protocol.volumeCaps] ?? Number.POSITIVE_INFINITY), `${muscle} exceeded its cap at ${frequency} sessions.`);
    }
  }
});

test('Daily Readiness adapts a locked session without redrawing its exercises or targets', () => {
  const user = profile({ totalWorkouts: 1 });
  const protocol = ensureWeeklyProtocol(null, user, [], '2026-09-07');
  const planned = protocol.sessions[0]!.plan;
  const reducedProfile = withReadiness(user, '2026-09-07', { energy: 'low', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false });
  const reduced = generateDailyProtocol(reducedProfile, [], '2026-09-07', protocol);

  assert.deepEqual(reduced.exercises.map(({ exercise }) => exercise.id), planned.exercises.map(({ exercise }) => exercise.id));
  assert.deepEqual(reduced.exercises.map(({ target }) => target), planned.exercises.map(({ target }) => target));
  assert.ok(reduced.exercises.some((item, index) => item.sets < planned.exercises[index]!.sets));
  assert.equal(reduced.weeklySession?.code, 'A');
  assert.equal(reduced.readinessBand, 'reduced');
});

test('recovery and warning bands override the scheduled session while preserving the weekly protocol', () => {
  const user = profile({ totalWorkouts: 1 });
  const protocol = ensureWeeklyProtocol(null, user, [], '2026-09-07');
  const recoveryProfile = withReadiness(user, '2026-09-07', { energy: 'low', sleep: 'poor', soreness: 'none', soreMuscles: [], painOrWarning: false });
  const warningProfile = withReadiness(user, '2026-09-07', { energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: true });

  assert.equal(generateDailyProtocol(recoveryProfile, [], '2026-09-07', protocol).kind, 'recovery');
  assert.equal(generateDailyProtocol(warningProfile, [], '2026-09-07', protocol).kind, 'safety-hold');
  assert.equal(protocol.sessions[0]?.plan.kind, 'training');
});

test('equipment, pain and movement constraints remain stronger than weekly objectives', () => {
  const user = profile({
    healthProfile: { ...profile().healthProfile, scanCompleted: true, painAreas: ['wrists', 'knees'], updatedAt: '2026-09-01T12:00:00.000Z' },
  });
  const protocol = ensureWeeklyProtocol(null, user, [], '2026-09-07');
  assert.ok(protocol.sessions.every((session) => session.plan.exercises.every(({ exercise }) => exercise.requiredEquipment.length === 1 && exercise.requiredEquipment[0] === EQUIPMENT.NONE)));
  assert.ok(protocol.sessions.every((session) => session.plan.exercises.every(({ exercise }) => !['pushup', 'plank', 'lunge', 'squat'].includes(exercise.progressionGroup))));
});

test('protocol remains stable until the week or planning profile changes', () => {
  const user = profile({ totalWorkouts: 1 });
  const protocol = ensureWeeklyProtocol(null, user, [], '2026-09-07');
  assert.equal(ensureWeeklyProtocol(protocol, user, [], '2026-09-09'), protocol);
  assert.equal(weeklyProtocolIsCurrent(protocol, { ...user, workoutDuration: 45 }, '2026-09-09'), false);
  assert.notEqual(ensureWeeklyProtocol(protocol, user, [], '2026-09-14').id, protocol.id);
});

test('weekly windows follow the active Training Arc rather than resetting its phase mid-protocol', () => {
  const assessment = {
    id: 'weekly-baseline',
    kind: 'baseline' as const,
    date: '2026-09-01T12:00:00.000Z',
    dateKey: '2026-09-01',
    results: {
      'squat-control': 'clear',
      'overhead-reach': 'clear',
      'hip-hinge': 'clear',
      'single-leg-balance': 'clear',
      'plank-control': 'clear',
    } as const,
  };
  const user = profile({ totalWorkouts: 4, trainingArcs: registerAssessmentWithTrainingArcs([], assessment) });
  const protocol = ensureWeeklyProtocol(null, user, [], '2026-09-10');
  assert.equal(protocol.weekStartDateKey, '2026-09-08');
  assert.equal(protocol.trainingArcWeek, 2);
  assert.deepEqual(protocol.sessions.map((session) => session.dateKey), ['2026-09-08', '2026-09-10', '2026-09-12']);
});
