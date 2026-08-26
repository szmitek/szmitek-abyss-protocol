import assert from 'node:assert/strict';
import test from 'node:test';

import { createPostureScan, latestPostureComparison, recordPostureScan, removePostureScan } from '../src/domain/postureArchive.ts';
import { createProfile } from '../src/domain/profile.ts';
import type { PosturePhotoMap, TrainingArc } from '../src/domain/types.ts';

const base = createProfile({
  goal: 'general-fitness',
  experienceLevel: 'beginner',
  workoutDuration: 20,
  workoutsPerWeek: 3,
  availableEquipment: ['none'],
});

function photos(seed: string): PosturePhotoMap {
  const capturedAt = '2026-08-26T10:00:00.000Z';
  return {
    front: { view: 'front', uri: `file:///${seed}-front.jpg`, width: 1080, height: 1440, source: 'camera', capturedAt },
    side: { view: 'side', uri: `file:///${seed}-side.jpg`, width: 1080, height: 1440, source: 'camera', capturedAt },
    back: { view: 'back', uri: `file:///${seed}-back.jpg`, width: 1080, height: 1440, source: 'library', capturedAt },
  };
}

test('new profiles start with an empty private posture archive', () => {
  assert.deepEqual(base.postureScans, []);
});

test('a visual record is linked to the active Training Arc', () => {
  const arc: TrainingArc = {
    id: 'arc-2-2026-08-01',
    cycleNumber: 2,
    startDateKey: '2026-08-01',
    durationWeeks: 4,
    baselineAssessmentId: 'movement-2',
    completionAssessmentId: null,
  };
  const scan = createPostureScan({ ...base, trainingArcs: [arc] }, photos('cycle-2'), new Date('2026-08-26T10:00:00.000Z'), 'posture-cycle-2');
  assert.equal(scan.trainingArcId, arc.id);
  assert.equal(scan.trainingArcCycle, 2);
  assert.equal(scan.dateKey, '2026-08-26');
  assert.deepEqual(Object.keys(scan.photos).sort(), ['back', 'front', 'side']);
});

test('archive records, replaces and removes an exact scan without touching another', () => {
  const first = createPostureScan(base, photos('first'), new Date('2026-08-01T10:00:00.000Z'), 'posture-first');
  const second = createPostureScan(base, photos('second'), new Date('2026-08-26T10:00:00.000Z'), 'posture-second');
  const recorded = recordPostureScan(recordPostureScan(base, first), second);
  const replaced = recordPostureScan(recorded, { ...second, trainingArcCycle: 3 });
  assert.deepEqual(replaced.postureScans.map((scan) => scan.id), ['posture-second', 'posture-first']);
  assert.equal(replaced.postureScans[0]?.trainingArcCycle, 3);
  assert.deepEqual(removePostureScan(replaced, 'posture-second').postureScans.map((scan) => scan.id), ['posture-first']);
});

test('comparison chooses the latest two records and reports elapsed days', () => {
  const scans = [
    createPostureScan(base, photos('middle'), new Date('2026-08-15T10:00:00.000Z'), 'posture-middle'),
    createPostureScan(base, photos('latest'), new Date('2026-08-29T10:00:00.000Z'), 'posture-latest'),
    createPostureScan(base, photos('oldest'), new Date('2026-08-01T10:00:00.000Z'), 'posture-oldest'),
  ];
  const comparison = latestPostureComparison(scans);
  assert.equal(comparison?.current.id, 'posture-latest');
  assert.equal(comparison?.previous.id, 'posture-middle');
  assert.equal(comparison?.elapsedDays, 14);
});
