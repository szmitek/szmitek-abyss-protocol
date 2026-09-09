import assert from 'node:assert/strict';
import test from 'node:test';

import { migrateSnapshot, type StoredSnapshot } from '../src/domain/migrations.ts';
import { generateWorkout } from '../src/domain/generator.ts';
import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment, updateCorrectiveProfile } from '../src/domain/profile.ts';
import type { CorrectiveProfile } from '../src/domain/types.ts';

const results = { 'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear' } as const;
const baseline = () => recordMovementAssessment(createProfile({ goal: 'general-fitness', experienceLevel: 'beginner', workoutDuration: 20, workoutsPerWeek: 3, availableEquipment: ['none'] }), results, 'baseline', [], new Date('2026-09-01T10:00:00Z'));
const directive: CorrectiveProfile = { configured: true, updatedAt: null, targets: [{ goal: 'pelvic-control', priority: 'primary', sources: ['self-observation'] }] };

test('v9 migration preserves workout state and progress, freezes estimated targets and seeds only the known directive', () => {
  const profile = updateCorrectiveProfile(baseline(), directive, new Date('2026-09-02T10:00:00Z'));
  const raw = JSON.parse(JSON.stringify({ ...INITIAL_SNAPSHOT, profile, schemaVersion: 9, onboardingComplete: true }));
  delete raw.profile.correctiveHistory;
  delete raw.profile.trainingArcs[0].planSnapshot;
  raw.profile.xp = 1500;
  raw.profile.rank = 'D';
  raw.profile.attributeXp.strength = 240;
  const plan = generateWorkout(profile, [], '2026-09-02');
  raw.activeWorkout = { questId: 'quest-active', plan, exerciseIndex: 1, completedSets: [1], startedAt: '2026-09-02T12:00:00Z' };
  raw.dailyQuest = { id: 'quest-active', dateKey: '2026-09-02', status: 'active', plan };
  raw.history = [{ id: 'workout-legacy', date: '2026-09-01T12:00:00Z', dateKey: '2026-09-01', planId: 'old-plan', title: 'Earlier session', completed: true, durationSeconds: 1200, difficulty: 1, perceivedDifficulty: 'perfect', results: [{ exerciseId: 'wall-pushup', completedSets: 2, targetPerSet: 8, completedVolume: 16 }], xpEarned: 100, attributeXpEarned: { strength: 18, endurance: 0, agility: 0, vitality: 0, mobility: 0 }, statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 } }];
  const before = structuredClone(raw);
  const migrated = migrateSnapshot(raw as StoredSnapshot);
  assert.equal(migrated.schemaVersion, 11);
  assert.equal(migrated.profile?.xp, 1500);
  assert.equal(migrated.profile?.rank, 'D');
  assert.equal(migrated.profile?.attributeXp.strength, 240);
  assert.deepEqual(migrated.profile?.trainingArcs[0]?.planSnapshot, { workoutsPerWeek: 3, source: 'legacy-estimate' });
  assert.equal(migrated.profile?.correctiveHistory.length, 1);
  assert.equal(migrated.profile?.correctiveHistory[0]?.source, 'legacy-current');
  assert.equal(migrated.profile?.correctiveHistory[0]?.trainingArcId, null);
  assert.deepEqual(migrated.profile?.movementAssessments, profile.movementAssessments);
  assert.deepEqual(migrated.history, before.history);
  assert.deepEqual(migrated.activeWorkout, before.activeWorkout);
  assert.deepEqual(migrated.dailyQuest, before.dailyQuest);
  assert.deepEqual(raw, before);
  const reloaded = migrateSnapshot({ ...migrated, profile: { ...migrated.profile!, workoutsPerWeek: 7 } });
  assert.deepEqual(reloaded.profile?.trainingArcs[0]?.planSnapshot, { workoutsPerWeek: 3, source: 'legacy-estimate' });
  assert.equal(reloaded.profile?.correctiveHistory.length, 1);
});

test('current snapshot migration is idempotent and keeps reports and pending report gate', () => {
  const profile = recordMovementAssessment(baseline(), results, 'reassessment', [], new Date('2026-09-29T10:00:00Z'));
  const snapshot = { ...INITIAL_SNAPSHOT, profile, pendingArcReviewId: profile.trainingArcReviews[0]!.id };
  assert.deepEqual(migrateSnapshot(migrateSnapshot(snapshot)), snapshot);
  const legacy = JSON.parse(JSON.stringify(snapshot));
  delete legacy.profile.trainingArcReviews[0].adherence.targetSource;
  const migrated = migrateSnapshot(legacy as StoredSnapshot);
  assert.equal(migrated.profile?.trainingArcReviews[0]?.adherence.targetSource, 'legacy-estimate');
  assert.deepEqual(migrated.profile?.trainingArcReviews[0]?.reasons, snapshot.profile.trainingArcReviews[0]?.reasons);
  assert.equal(migrated.pendingArcReviewId, snapshot.pendingArcReviewId);
});

test('early snapshots without trainer modules retain their attributes and receive empty archives', () => {
  const raw = JSON.parse(JSON.stringify({ ...INITIAL_SNAPSHOT, schemaVersion: 1, profile: createProfile({ goal: 'general-fitness', experienceLevel: 'beginner', workoutDuration: 20, workoutsPerWeek: 3, availableEquipment: ['none'] }) }));
  for (const key of ['attributeXp', 'activeTrainingWeeks', 'healthProfile', 'correctiveProfile', 'correctiveHistory', 'movementAssessments', 'trainingArcs', 'trainingArcReviews', 'postureScans', 'readinessLog']) delete raw.profile[key];
  raw.profile.strength = 3;
  const migrated = migrateSnapshot(raw as StoredSnapshot);
  assert.equal(migrated.profile?.strength, 3);
  assert.equal(migrated.profile?.attributeXp.strength, 235);
  assert.deepEqual(migrated.profile?.correctiveHistory, []);
  assert.deepEqual(migrated.profile?.trainingArcs, []);
});

test('directive history retains independent snapshots and records disabling a target without duplicating unchanged confirmations', () => {
  const first = updateCorrectiveProfile(baseline(), structuredClone(directive), new Date('2026-09-02T10:00:00Z'));
  const unchanged = updateCorrectiveProfile(first, structuredClone(directive));
  assert.equal(unchanged, first);
  const second = updateCorrectiveProfile(first, { configured: true, targets: [], updatedAt: null }, new Date('2026-09-03T10:00:00Z'));
  assert.equal(second.correctiveHistory.length, 2);
  assert.deepEqual(second.correctiveHistory[0]?.targets, []);
  assert.equal(second.correctiveHistory[1]?.targets[0]?.goal, 'pelvic-control');
  assert.equal(second.correctiveHistory[0]?.trainingArcId, first.trainingArcs[0]?.id);
  first.correctiveProfile.targets[0]!.sources.push('movement-analysis');
  assert.deepEqual(second.correctiveHistory[1]?.targets[0]?.sources, ['self-observation']);
});
