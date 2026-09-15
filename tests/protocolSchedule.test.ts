import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_SNAPSHOT, createProfile, recordMovementAssessment } from '../src/domain/profile.ts';
import { nextProtocolTrainingDateKey, weeklySessionStatus } from '../src/domain/protocolSchedule.ts';
import { createDailyReadiness, recordDailyReadiness } from '../src/domain/readiness.ts';
import { buildWeeklyProtocol, ensureWeeklyProtocol } from '../src/domain/weeklyProtocol.ts';
import { beginDailyWorkout, refreshDailyQuest } from '../src/domain/questState.ts';
import { decodeSnapshot } from '../src/domain/persistence.ts';
import type { ActiveWorkout, DailyReadinessInput, UserProfile, WeeklyProtocolSession, WorkoutHistoryEntry } from '../src/domain/types.ts';

function player(start = '2026-09-01', frequency: UserProfile['workoutsPerWeek'] = 3): UserProfile {
  const profile = recordMovementAssessment(createProfile({ goal: 'general-fitness', experienceLevel: 'beginner', workoutDuration: 30, workoutsPerWeek: frequency, availableEquipment: ['none'] }), {
    'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear',
  }, 'baseline', [], new Date(`${start}T12:00:00`));
  return { ...profile, totalWorkouts: 4 };
}
function ready(profile: UserProfile, date: string, input: Partial<DailyReadinessInput> = {}): UserProfile {
  return recordDailyReadiness(profile, createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false, ...input }, new Date(`${date}T12:00:00`)));
}
function record(session: WeeklyProtocolSession, overrides: Partial<WorkoutHistoryEntry> = {}): WorkoutHistoryEntry {
  return { id: 'history-1', date: `${session.dateKey}T14:00:00`, dateKey: session.dateKey, planId: session.plan.id, title: session.title, completed: true, durationSeconds: 60, difficulty: 1, perceivedDifficulty: 'perfect', xpEarned: 0,
    attributeXpEarned: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 }, statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
    results: [{ exerciseId: session.plan.exercises[0]!.exercise.id, targetPerSet: 8, completedSets: 1, completedVolume: 8 }], ...overrides };
}

test('next date follows Tuesday-start locked contract and crosses its week boundary', () => {
  const profile = player(), protocol = buildWeeklyProtocol(profile, [], '2026-09-09');
  assert.deepEqual(protocol.sessions.map((s) => s.dateKey), ['2026-09-08', '2026-09-10', '2026-09-12']);
  assert.equal(nextProtocolTrainingDateKey(profile, protocol, '2026-09-09'), '2026-09-10');
  assert.equal(nextProtocolTrainingDateKey(profile, protocol, '2026-09-12'), '2026-09-15');
  const next = ensureWeeklyProtocol(protocol, profile, [], '2026-09-15');
  assert.equal(next.sessions[0]!.dateKey, '2026-09-15');
});

test('next date honors current locked dates and discards stale planning fingerprints', () => {
  const profile = player(), protocol = buildWeeklyProtocol(profile, [], '2026-09-09');
  const changed = { ...protocol, sessions: protocol.sessions.map((s) => s.code === 'B' ? { ...s, dateKey: '2026-09-11' } : s) };
  assert.equal(nextProtocolTrainingDateKey(profile, changed, '2026-09-09'), '2026-09-11');
  const fewer = { ...profile, workoutsPerWeek: 2 as const };
  assert.equal(nextProtocolTrainingDateKey(fewer, protocol, '2026-09-09'), '2026-09-11');
  assert.equal(nextProtocolTrainingDateKey(profile, { ...changed, profileFingerprint: 'old-loadout' }, '2026-09-09'), '2026-09-10');
});

test('next date crosses year and local clock changes while preserving all supported frequencies', () => {
  for (const start of ['2026-12-29', '2026-10-20']) {
    for (const frequency of [2, 3, 4, 5, 6, 7] as const) {
      const profile = player(start, frequency), protocol = buildWeeklyProtocol(profile, [], start);
      for (let i = 0; i < protocol.sessions.length - 1; i += 1) {
        assert.equal(nextProtocolTrainingDateKey(profile, protocol, protocol.sessions[i]!.dateKey), protocol.sessions[i + 1]!.dateKey);
      }
      const last = protocol.sessions.at(-1)!.dateKey;
      const next = nextProtocolTrainingDateKey(profile, protocol, last)!;
      assert.ok(next > last);
      assert.ok(buildWeeklyProtocol(profile, [], next).sessions.some((s) => s.dateKey === next));
    }
  }
});

test('re-scan gate stops date promises until the next arc exists', () => {
  const profile = player(), protocol = buildWeeklyProtocol(profile, [], '2026-09-26');
  assert.equal(nextProtocolTrainingDateKey(profile, protocol, '2026-09-26'), null);
  assert.equal(nextProtocolTrainingDateKey(profile, protocol, '2026-09-29'), null);
  assert.equal(nextProtocolTrainingDateKey(player('2026-09-29'), null, '2026-09-29'), '2026-10-01');
});

test('profiles without an arc keep their locked first week and existing calendar schedule', () => {
  const profile = { ...player(), trainingArcs: [], totalWorkouts: 0 };
  const first = buildWeeklyProtocol(profile, [], '2026-09-08');
  assert.equal(nextProtocolTrainingDateKey(profile, null, '2026-09-08'), '2026-09-10');
  assert.equal(nextProtocolTrainingDateKey(profile, first, '2026-09-09'), '2026-09-10');
  const established = { ...profile, totalWorkouts: 1 };
  assert.equal(nextProtocolTrainingDateKey(established, null, '2026-09-09'), '2026-09-11');
});

test('uncompleted past sessions differ from readiness recovery, holds and unavailable plans', () => {
  const profile = player(), session = buildWeeklyProtocol(profile, [], '2026-09-08').sessions[0]!;
  assert.equal(weeklySessionStatus(session, profile, [], '2026-09-09'), 'missed');
  assert.equal(weeklySessionStatus(session, ready(profile, session.dateKey, { soreness: 'high' }), [], '2026-09-09'), 'recovery');
  assert.equal(weeklySessionStatus(session, ready(profile, session.dateKey, { painOrWarning: true }), [], '2026-09-09'), 'hold');
  assert.equal(weeklySessionStatus(session, ready(profile, session.dateKey, { energy: 'low' }), [], '2026-09-09'), 'missed');
  assert.equal(weeklySessionStatus({ ...session, plan: { ...session.plan, kind: 'safety-hold' } }, profile, [], '2026-09-09'), 'unavailable');
});

test('completion requires the same date and distinguishes a different completed protocol', () => {
  const profile = player(), session = buildWeeklyProtocol(profile, [], '2026-09-08').sessions[0]!;
  assert.equal(weeklySessionStatus(session, profile, [record(session)], '2026-09-09'), 'cleared');
  assert.equal(weeklySessionStatus(session, profile, [record(session, { planId: 'daily-other' })], '2026-09-09'), 'trained');
  for (const bad of [{ dateKey: '2026-09-07' }, { completed: false }, { results: [] }, { planId: 'rank-trial-D' }]) {
    assert.equal(weeklySessionStatus(session, profile, [record(session, bad)], '2026-09-09'), 'missed');
  }
  assert.equal(weeklySessionStatus(session, ready(profile, session.dateKey, { soreness: 'high' }), [record(session)], '2026-09-09'), 'cleared');
});

test('today requires readiness, active work is retained, and future evidence cannot clear a session', () => {
  const profile = player(), session = buildWeeklyProtocol(profile, [], '2026-09-08').sessions[0]!;
  assert.equal(weeklySessionStatus(session, profile, [], session.dateKey), 'readiness');
  assert.equal(weeklySessionStatus(session, ready(profile, session.dateKey), [], session.dateKey), 'ready');
  const active: ActiveWorkout = { plan: session.plan, questId: 'quest', exerciseIndex: 0, completedSets: session.plan.exercises.map(() => 0), startedAt: `${session.dateKey}T12:00:00` };
  assert.equal(weeklySessionStatus(session, profile, [], session.dateKey, active), 'active');
  assert.equal(weeklySessionStatus(session, profile, [], '2026-09-09', active), 'active');
  assert.equal(weeklySessionStatus(session, ready(profile, session.dateKey, { painOrWarning: true }), [], session.dateKey, active), 'hold');
  assert.equal(weeklySessionStatus(session, profile, [record(session)], '2026-09-07', active), 'queued');
});

test('status projection preserves snapshot, resume, history and rewards without catch-up work', () => {
  const profile = ready(player(), '2026-09-10');
  const snapshot = refreshDailyQuest({ ...INITIAL_SNAPSHOT, onboardingComplete: true, profile }, '2026-09-10');
  const before = JSON.stringify(snapshot), protocol = snapshot.weeklyProtocol!;
  for (const session of protocol.sessions) weeklySessionStatus(session, profile, [], '2026-09-10');
  nextProtocolTrainingDateKey(profile, protocol, '2026-09-10');
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(snapshot.dailyQuest!.plan.weeklySession!.code, 'B');
  const active = beginDailyWorkout(snapshot, new Date('2026-09-10T12:00:00'));
  assert.ok(active.activeWorkout);
  assert.deepEqual(active.activeWorkout.plan.exercises, protocol.sessions[1]!.plan.exercises);
  const restored = decodeSnapshot(JSON.stringify(active));
  assert.deepEqual(restored.activeWorkout, active.activeWorkout);
  assert.deepEqual(restored.profile, active.profile);
  assert.deepEqual(restored.history, []);
  assert.equal(weeklySessionStatus(protocol.sessions[0]!, restored.profile!, [], '2026-09-10', restored.activeWorkout), 'missed');
});
