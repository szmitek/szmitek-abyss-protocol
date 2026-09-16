import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLongitudinalEvidence, evidenceAssessments } from '../src/domain/longitudinalEvidence.ts';
import { createProfile } from '../src/domain/profile.ts';
import { createDailyReadiness } from '../src/domain/readiness.ts';
import { CAPTURE_VIEWS, type MovementAssessment, type PosturePhotoMap, type PostureScan, type TrainingArcReview, type UserProfile, type WorkoutHistoryEntry } from '../src/domain/types.ts';

const clear = { 'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear' } as const;
const base = createProfile({ goal: 'strength', experienceLevel: 'beginner', workoutDuration: 20, workoutsPerWeek: 3, availableEquipment: ['none'] });
const now = new Date('2026-09-16T12:00:00Z');
const check = (id: string, dateKey: string, hour = '10'): MovementAssessment => ({ id, dateKey, date: `${dateKey}T${hour}:00:00Z`, kind: 'reassessment', results: { ...clear } });
const before = check('before', '2026-09-01'), after = check('after', '2026-09-15');
const player = (overrides: Partial<UserProfile> = {}): UserProfile => ({ ...base, movementAssessments: [after, before], ...overrides });
const stats = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };
function workout(id: string, day: string, exercise = 'wall-pushup'): WorkoutHistoryEntry {
  return { id, dateKey: day, date: `${day}T09:00:00Z`, planId: `plan-${id}`, title: 'Training', completed: true, durationSeconds: 600, difficulty: 1, perceivedDifficulty: 'perfect', xpEarned: 0, attributeXpEarned: stats, statGains: stats,
    results: [{ exerciseId: exercise, completedSets: 2, completedVolume: 20, targetPerSet: 10 }] };
}
function photo(assessment: MovementAssessment, id = assessment.id): PostureScan {
  return { id, date: assessment.date, dateKey: assessment.dateKey, trainingArcId: null, trainingArcCycle: null,
    protocol: 'four-view-v1', setupConfirmedAt: assessment.date, movementAssessmentId: assessment.id,
    photos: Object.fromEntries(CAPTURE_VIEWS.map((view) => [view, { view, uri: `file:///${id}-${view}.png`, width: 100, height: 200, source: 'library', capturedAt: assessment.date, originalCapturedAt: null }])) as PosturePhotoMap };
}
function report(): TrainingArcReview {
  return { id: 'report', dateKey: after.dateKey, date: after.date, trainingArcId: 'arc', cycleNumber: 1,
    baselineAssessmentId: before.id, completionAssessmentId: after.id, baselinePostureScanId: null, completionPostureScanId: null,
    adherence: { completedSessions: 5, scheduledSessions: 8, rate: 0.625, targetSource: 'cycle-start' },
    movement: { improved: 0, declined: 0, unchanged: 5 }, difficulty: { tooEasy: 0, perfect: 5, tooHard: 0 },
    readiness: { normal: 8, reduced: 2, recovery: 1, hold: 1 }, decision: 'continue', reasons: [] };
}

test('empty/single records and invalid selections have no invented comparison', () => {
  assert.equal(buildLongitudinalEvidence(player({ movementAssessments: [] }), [], 'a', 'b', now), null);
  assert.equal(buildLongitudinalEvidence(player({ movementAssessments: [before] }), [], before.id, before.id, now), null);
  assert.equal(buildLongitudinalEvidence(player(), [], 'missing', after.id, now), null);
  assert.equal(buildLongitudinalEvidence(player(), [], after.id, before.id, now), null);
  assert.equal(buildLongitudinalEvidence(player(), [], before.id, after.id, new Date('2026-09-14T12:00:00Z')), null);
});

test('sorts by actual timestamp, preserves same-day checks, excludes future data, allows nonadjacent pairs', () => {
  const first = check('first', '2026-09-01', '08'), last = check('last', '2026-09-01', '18');
  const future = check('future', '2026-09-17');
  const p = player({ movementAssessments: [future, last, before, first, after] });
  assert.deepEqual(evidenceAssessments(p, now).map((a) => a.id), ['first', 'before', 'last', 'after']);
  assert.equal(buildLongitudinalEvidence(p, [], 'first', 'last', now)?.days, 1);
  assert.equal(buildLongitudinalEvidence(p, [], 'first', 'after', now)?.days, 15);
  const sameInstant = { ...last, id: 'same', date: first.date };
  assert.equal(buildLongitudinalEvidence(player({ movementAssessments: [first, sameInstant] }), [], 'first', 'same', now), null);
});

test('reports categorical change for each actual test without mutating profile/history', () => {
  const p = player();
  p.movementAssessments = [ { ...before, results: { ...clear, 'hip-hinge': 'limited' } }, { ...after, results: { ...clear, 'plank-control': 'pain' } } ];
  const history = [workout('one', '2026-09-02')];
  const original = structuredClone({ p, history });
  const evidence = buildLongitudinalEvidence(p, history, before.id, after.id, now)!;
  assert.equal(evidence.movement.find((m) => m.check === 'hip-hinge')?.change, 'improved');
  assert.equal(evidence.movement.find((m) => m.check === 'plank-control')?.change, 'declined');
  assert.equal(evidence.movement.filter((m) => m.change === 'unchanged').length, 3);
  assert.deepEqual({ p, history }, original);
});

test('training uses inclusive recorded days, excludes incomplete/future/outside work and separates trials/return/warmups/units', () => {
  const a = workout('one', before.dateKey), b = workout('two', before.dateKey, 'run-place');
  a.results[0]!.warmupSets = [{ actual: 5, loadKg: null, effort: null }];
  a.results.push({ exerciseId: 'arm-circles', completedSets: 1, targetPerSet: 20, completedVolume: 20 });
  b.returnBlockId = 'return';
  const unknown = workout('retired', after.dateKey, 'retired-exercise');
  const trial = { ...workout('trial', '2026-09-05'), planId: 'rank-trial-E' };
  const futureTimestamp = { ...workout('future-timestamp', '2026-09-10'), date: '2026-09-17T09:00:00Z' };
  const evidence = buildLongitudinalEvidence(player(), [a, b, unknown, trial, futureTimestamp,
    { ...workout('partial', '2026-09-03'), completed: false }, workout('too-early', '2026-08-31'), workout('too-late', '2026-09-16')], before.id, after.id, now)!;
  assert.deepEqual(evidence.training, { sessions: 3, activeDays: 2, trials: 1, returnSessions: 1, minutes: 30, workSets: 6, warmupSets: 2, reps: 20, seconds: 20, unknownUnitSets: 2 });
});

test('calendar-day arithmetic stays stable across DST and year boundaries', () => {
  for (const [start, end, days] of [['2026-03-28', '2026-03-30', 3], ['2026-10-24', '2026-10-26', 3], ['2026-12-31', '2027-01-01', 2]] as const) {
    const p = player({ movementAssessments: [check('b', start), check('a', end)] });
    assert.equal(buildLongitudinalEvidence(p, [], 'b', 'a', new Date('2027-01-02T12:00:00Z'))?.days, days);
  }
  const a = { ...before, date: '2026-09-01T01:00:00+02:00' };
  const b = { ...after, dateKey: '2026-09-01', date: '2026-08-31T23:30:00Z' };
  assert.equal(buildLongitudinalEvidence(player({ movementAssessments: [a, b] }), [], a.id, b.id, now)?.days, 1);
});

test('retained readiness coverage does not treat absent days as healthy or merge archived totals', () => {
  const good = createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }, new Date('2026-09-02T12:00:00Z'));
  const hold = createDailyReadiness({ energy: 'low', sleep: 'poor', soreness: 'high', soreMuscles: ['back'], painOrWarning: true }, new Date('2026-09-03T12:00:00Z'));
  const p = player({ readinessLog: [good, hold], trainingArcReviews: [report()] });
  const e = buildLongitudinalEvidence(p, [], before.id, after.id, now)!;
  assert.equal(e.readiness.recordedDays, 2); assert.equal(e.readiness.missingDays, 13);
  assert.equal(e.readiness.warnings, 1); assert.equal(e.readiness.lowEnergy, 1); assert.equal(e.readiness.poorSleep, 1); assert.equal(e.readiness.highSoreness, 1);
  assert.equal(e.readiness.normal, 1); assert.equal(e.report!.readiness.normal, 8);
  const empty = buildLongitudinalEvidence(player({ trainingArcReviews: [report()] }), [], before.id, after.id, now)!;
  assert.equal(empty.readiness.missingDays, 15); assert.equal(empty.readiness.recordedDays, 0);
});

test('only exact archived baseline/final pairs expose historical adherence; changing current frequency does not rewrite it', () => {
  const r = report();
  const p = player({ workoutsPerWeek: 7, movementAssessments: [before, check('middle', '2026-09-10'), after], trainingArcReviews: [r] });
  assert.deepEqual(buildLongitudinalEvidence(p, [], before.id, after.id, now)!.report!.adherence, r.adherence);
  assert.equal(buildLongitudinalEvidence(p, [], 'middle', after.id, now)!.report, null);
  r.adherence.targetSource = 'legacy-estimate';
  assert.equal(buildLongitudinalEvidence(p, [], before.id, after.id, now)!.report!.adherence.targetSource, 'legacy-estimate');
});

test('photos match assessment identity, not nearby dates; deleted and unlinked records remain missing evidence', () => {
  const linkedBefore = photo(before), linkedAfter = photo(after);
  const unlinked = photo(before, 'unlinked'); delete unlinked.movementAssessmentId;
  let p = player({ postureScans: [unlinked, linkedAfter, linkedBefore] });
  const e = buildLongitudinalEvidence(p, [], before.id, after.id, now)!;
  assert.equal(e.photos.before!.id, before.id); assert.equal(e.photos.after!.id, after.id);
  assert.deepEqual(e.photos.views, ['front', 'left', 'right', 'back']); assert.equal(e.photos.unlinked, 1);
  p = { ...p, postureScans: [unlinked, linkedBefore] };
  const missing = buildLongitudinalEvidence(p, [], before.id, after.id, now)!;
  assert.equal(missing.photos.after, null); assert.deepEqual(missing.photos.views, []);
  const legacy: PostureScan = { id: 'legacy', date: before.date, dateKey: before.dateKey, trainingArcId: null, trainingArcCycle: null, photos: { front: linkedBefore.photos.front, back: linkedBefore.photos.back, side: { ...linkedBefore.photos.front, view: 'side' } } };
  assert.equal(buildLongitudinalEvidence(player({ postureScans: [legacy] }), [], before.id, after.id, now)!.photos.before, null);
});
