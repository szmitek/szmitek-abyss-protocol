import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExerciseInsights } from '../src/domain/insights.ts';
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
});
