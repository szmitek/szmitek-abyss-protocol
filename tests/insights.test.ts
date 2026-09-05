import assert from 'node:assert/strict';
import test from 'node:test';

import { buildActivityWeeks, buildExerciseInsights } from '../src/domain/insights.ts';
import type { WorkoutHistoryEntry } from '../src/domain/types.ts';

function historyEntry(id: string, dateKey: string, exerciseId: string, target: number, volume: number, completed = true): WorkoutHistoryEntry {
  return {
    id,
    date: `${dateKey}T18:00:00.000Z`,
    dateKey,
    planId: `plan-${id}`,
    title: 'DAILY PROTOCOL',
    completed,
    durationSeconds: 900,
    difficulty: 1,
    perceivedDifficulty: 'perfect',
    results: [{ exerciseId, completedSets: 3, targetPerSet: target, completedVolume: volume }],
    xpEarned: 100,
    attributeXpEarned: { strength: 12, endurance: 12, agility: 0, vitality: 0, mobility: 0 },
    statGains: { strength: 1, endurance: 1, agility: 0, vitality: 0, mobility: 0 },
  };
}

test('exercise insights calculate chronological target progress and total volume', () => {
  const history = [
    historyEntry('latest', '2026-09-08', 'wall-pushup', 12, 36),
    historyEntry('other', '2026-09-05', 'bodyweight-squat', 10, 30),
    historyEntry('first', '2026-09-01', 'wall-pushup', 8, 24),
    historyEntry('ignored', '2026-09-09', 'wall-pushup', 99, 297, false),
  ];
  const insights = buildExerciseInsights(history);
  const pushup = insights.find((insight) => insight.exerciseId === 'wall-pushup');
  assert.ok(pushup);
  assert.equal(pushup.sessions, 2);
  assert.equal(pushup.firstTarget, 8);
  assert.equal(pushup.latestTarget, 12);
  assert.equal(pushup.bestTarget, 12);
  assert.equal(pushup.totalVolume, 60);
  assert.equal(insights[0]?.exerciseId, 'wall-pushup');
  assert.deepEqual(pushup.samples.map((sample) => sample.workoutId), ['first', 'latest']);
});

test('exercise archive skips zero-set results and preserves retired exercise records without invented units', () => {
  const skipped = historyEntry('skipped', '2026-09-02', 'wall-pushup', 99, 0);
  skipped.results[0]!.completedSets = 0;
  const retired = historyEntry('old', '2026-09-01', 'retired-exercise', 10, 30);
  const insights = buildExerciseInsights([skipped, retired]);
  assert.equal(insights.length, 1);
  assert.equal(insights[0]?.exerciseId, 'retired-exercise');
  assert.equal(insights[0]?.repType, null);
  assert.equal(insights[0]?.totalVolume, 30);
});

test('activity buckets preserve empty weeks and separate reps from seconds across a year boundary', () => {
  const history = [
    historyEntry('before-window', '2026-12-13', 'wall-pushup', 10, 30),
    historyEntry('sunday', '2026-12-27', 'wall-pushup', 10, 30),
    historyEntry('monday', '2026-12-28', 'wall-pushup', 12, 36),
    historyEntry('timed', '2026-12-28', 'cat-cow', 30, 90),
    historyEntry('incomplete', '2027-01-01', 'wall-pushup', 10, 30, false),
    historyEntry('future', '2027-01-04', 'wall-pushup', 10, 30),
  ];
  const original = structuredClone(history);
  const weeks = buildActivityWeeks(history, '2027-01-03', 3);
  assert.deepEqual(weeks.map((week) => week.startDateKey), ['2026-12-14', '2026-12-21', '2026-12-28']);
  assert.equal(weeks[0]?.sessions, 0);
  assert.equal(weeks[1]?.sessions, 1);
  assert.deepEqual(weeks[2], { startDateKey: '2026-12-28', sessions: 2, activeDays: 1, sets: 6, seconds: 1800, repetitions: 36, timedVolume: 90 });
  assert.deepEqual(history, original);
});

test('weekly chart does not shift at daylight-saving transitions and excludes future days in the current week', () => {
  const weeks = buildActivityWeeks([
    historyEntry('sat', '2026-10-24', 'wall-pushup', 10, 30),
    historyEntry('sun', '2026-10-25', 'wall-pushup', 10, 30),
    historyEntry('mon', '2026-10-26', 'wall-pushup', 10, 30),
    historyEntry('tue', '2026-10-27', 'wall-pushup', 10, 30),
  ], '2026-10-26', 2);
  assert.deepEqual(weeks.map((week) => [week.startDateKey, week.sessions]), [['2026-10-19', 2], ['2026-10-26', 1]]);
});
