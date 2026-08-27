import assert from 'node:assert/strict';
import test from 'node:test';

import { createTrainingArcReview } from '../src/domain/arcReview.ts';
import { generateWorkout } from '../src/domain/generator.ts';
import { createProfile, recordMovementAssessment } from '../src/domain/profile.ts';
import type { DailyReadiness, MovementAssessment, MovementRating, PosturePhotoMap, PostureScan, TrainingArc, UserProfile, WorkoutHistoryEntry } from '../src/domain/types.ts';

const CLEAR_RESULTS = {
  'squat-control': 'clear',
  'overhead-reach': 'clear',
  'hip-hinge': 'clear',
  'single-leg-balance': 'clear',
  'plank-control': 'clear',
} as const;

const LIMITED_RESULTS = { ...CLEAR_RESULTS, 'squat-control': 'limited' } as const;

function movement(id: string, dateKey: string, kind: MovementAssessment['kind'], results: MovementAssessment['results']): MovementAssessment {
  return { id, date: dateKey + 'T10:00:00.000Z', dateKey, kind, results };
}

const baseline = movement('movement-baseline', '2026-09-01', 'baseline', LIMITED_RESULTS);
const arc: TrainingArc = {
  id: 'arc-1-2026-09-01',
  cycleNumber: 1,
  startDateKey: '2026-09-01',
  durationWeeks: 4,
  baselineAssessmentId: baseline.id,
  completionAssessmentId: null,
  reviewId: null,
  entryDecision: null,
};

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...createProfile({
      goal: 'general-fitness',
      experienceLevel: 'advanced',
      workoutDuration: 30,
      workoutsPerWeek: 2,
      availableEquipment: ['none'],
    }),
    id: 'arc-review-player',
    movementAssessments: [baseline],
    trainingArcs: [arc],
    ...overrides,
  };
}

function history(count: number, tooHard = 0): WorkoutHistoryEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: 'history-' + index,
    date: '2026-09-' + String(index + 2).padStart(2, '0') + 'T18:00:00.000Z',
    dateKey: '2026-09-' + String(index + 2).padStart(2, '0'),
    planId: 'training-' + index,
    title: 'Training ' + index,
    completed: true,
    durationSeconds: 1200,
    difficulty: 2 as const,
    perceivedDifficulty: index < tooHard ? 'too-hard' as const : 'perfect' as const,
    results: [],
    xpEarned: 100,
    attributeXpEarned: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
    statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
  }));
}

function photos(seed: string): PosturePhotoMap {
  const capturedAt = '2026-09-01T10:00:00.000Z';
  return {
    front: { view: 'front', uri: 'file:///' + seed + '-front.jpg', width: 100, height: 200, source: 'camera', capturedAt },
    side: { view: 'side', uri: 'file:///' + seed + '-side.jpg', width: 100, height: 200, source: 'camera', capturedAt },
    back: { view: 'back', uri: 'file:///' + seed + '-back.jpg', width: 100, height: 200, source: 'camera', capturedAt },
  };
}

function scan(id: string, dateKey: string): PostureScan {
  return { id, date: dateKey + 'T10:00:00.000Z', dateKey, trainingArcId: arc.id, trainingArcCycle: 1, photos: photos(id) };
}

function readiness(id: string, dateKey: string, band: DailyReadiness['band']): DailyReadiness {
  return { id, date: dateKey + 'T08:00:00.000Z', dateKey, energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: band === 'hold', band };
}

test('consistent execution and improved movement authorize controlled advance', () => {
  const reassessment = movement('movement-final', '2026-09-29', 'reassessment', CLEAR_RESULTS);
  const user = profile({ postureScans: [scan('final-photo', '2026-09-29'), scan('baseline-photo', '2026-09-01')] });
  const review = createTrainingArcReview(user, reassessment, history(6));
  assert.equal(review?.decision, 'advance');
  assert.deepEqual(review?.adherence, { scheduledSessions: 8, completedSessions: 6, rate: 0.75 });
  assert.deepEqual(review?.movement, { improved: 1, declined: 0, unchanged: 4 });
  assert.equal(review?.baselinePostureScanId, 'baseline-photo');
  assert.equal(review?.completionPostureScanId, 'final-photo');
  assert.ok(review?.reasons.some((reason) => reason.includes('not analyzed or scored')));
});

test('stable movement defaults to another cycle at the current level', () => {
  const reassessment = movement('movement-final', '2026-09-29', 'reassessment', LIMITED_RESULTS);
  assert.equal(createTrainingArcReview(profile(), reassessment, history(6))?.decision, 'continue');
});

test('low adherence or declining movement requests recalibration', () => {
  const lowAdherence = movement('movement-final', '2026-09-29', 'reassessment', LIMITED_RESULTS);
  assert.equal(createTrainingArcReview(profile(), lowAdherence, history(3))?.decision, 'recalibrate');
  const decline = movement('movement-decline', '2026-09-29', 'reassessment', { ...LIMITED_RESULTS, 'plank-control': 'limited' });
  assert.equal(createTrainingArcReview(profile(), decline, history(6))?.decision, 'recalibrate');
});

test('repeated excessive load or protected readiness creates a recovery entry', () => {
  const reassessment = movement('movement-final', '2026-09-29', 'reassessment', LIMITED_RESULTS);
  assert.equal(createTrainingArcReview(profile(), reassessment, history(4, 2))?.decision, 'recovery');
  const user = profile({ readinessLog: [
    readiness('r1', '2026-09-05', 'recovery'),
    readiness('r2', '2026-09-12', 'recovery'),
    readiness('r3', '2026-09-19', 'hold'),
  ] });
  assert.equal(createTrainingArcReview(user, reassessment, history(6))?.decision, 'recovery');
});

test('pain in the final movement check always seals unsupervised training', () => {
  const painResults: Record<keyof typeof CLEAR_RESULTS, MovementRating> = { ...CLEAR_RESULTS, 'hip-hinge': 'pain' };
  const reassessment = movement('movement-pain', '2026-09-29', 'reassessment', painResults);
  assert.equal(createTrainingArcReview(profile(), reassessment, history(8))?.decision, 'hold');
});

test('recording a due re-scan archives the review and applies its next-cycle directive', () => {
  const updated = recordMovementAssessment(profile(), CLEAR_RESULTS, 'reassessment', history(6), new Date('2026-09-29T10:00:00.000Z'));
  const review = updated.trainingArcReviews[0];
  assert.equal(review?.decision, 'advance');
  assert.equal(updated.trainingArcs[0]?.entryDecision, 'advance');
  assert.equal(updated.trainingArcs[1]?.reviewId, review?.id);
  assert.equal(updated.trainingArcs[1]?.completionAssessmentId, review?.completionAssessmentId);
});

test('a recovery decision enforces minimum week-one load without weakening equipment safety', () => {
  const recoveryArc: TrainingArc = {
    ...arc,
    id: 'arc-2-2026-09-29',
    cycleNumber: 2,
    startDateKey: '2026-09-29',
    baselineAssessmentId: 'movement-final',
    entryDecision: 'recovery',
  };
  const plan = generateWorkout(profile({ trainingArcs: [recoveryArc], totalWorkouts: 20 }), [], '2026-09-29');
  assert.ok(plan.exercises.every((item) => item.exercise.difficulty === 1));
  assert.ok(plan.exercises.filter((item) => !['warmup', 'mobility'].includes(item.exercise.exerciseType)).every((item) => item.sets === 1));
  assert.ok(plan.exercises.every((item) => item.exercise.requiredEquipment.length === 1 && item.exercise.requiredEquipment[0] === 'none'));
});

