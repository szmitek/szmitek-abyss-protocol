import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyTransform,
  computeFitTransform,
  interpolateAngles,
  SKELETON,
  solveBackArm,
  solveBackLeg,
  solveFK,
} from '../src/domain/rig/kinematics.ts';
import { POSES } from '../src/domain/rig/poses.ts';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const LEN = Object.fromEntries(SKELETON.map((b) => [b.id, b.len]));

test('FK preserves every bone length regardless of root', () => {
  const angles = POSES['bodyweight-squat']!.keyframes[1]!.angles;
  for (const root of ['ankle', 'toe', 'hip'] as const) {
    const pts = solveFK(angles, root);
    for (const bone of SKELETON) {
      assert.ok(
        Math.abs(dist(pts[bone.a], pts[bone.b]) - bone.len) < 1e-6,
        `${bone.id} length wrong from root ${root}`,
      );
    }
  }
});

test('FK is deterministic', () => {
  const a = solveFK(POSES.pushup!.keyframes[0]!.angles, 'toe');
  const b = solveFK(POSES.pushup!.keyframes[0]!.angles, 'toe');
  assert.deepEqual(a, b);
});

test('interpolation endpoints match keyframes', () => {
  const pose = POSES['bodyweight-squat']!;
  assert.equal(interpolateAngles(pose.keyframes, 0).thigh, pose.keyframes[0]!.angles.thigh);
  const peak = interpolateAngles(pose.keyframes, 1).thigh!;
  assert.ok(Math.abs(peak - pose.keyframes[1]!.angles.thigh!) < 1e-6);
});

test('fit transform keeps all keyframes inside the box', () => {
  const box = { x: 0, y: 0, w: 300, h: 232 };
  for (const id in POSES) {
    const pose = POSES[id]!;
    const tr = computeFitTransform(pose.keyframes, pose.rootNode, box);
    for (const kf of pose.keyframes) {
      const pts = solveFK(kf.angles, pose.rootNode);
      for (const n in pts) {
        const p = applyTransform(pts[n as keyof typeof pts], tr);
        assert.ok(p.x >= box.x - 1 && p.x <= box.x + box.w + 1, `${id} x out of box`);
        assert.ok(p.y >= box.y - 1 && p.y <= box.y + box.h + 1, `${id} y out of box`);
      }
    }
  }
});

test('every pose is well-formed', () => {
  for (const id in POSES) {
    const pose = POSES[id]!;
    assert.ok(pose.keyframes.length >= 2, `${id} needs >= 2 keyframes`);
    assert.equal(pose.phases.length, 2, `${id} needs 2 phase labels`);
    assert.ok(pose.primaryMuscles.length >= 1, `${id} needs a primary muscle`);
    assert.ok(pose.periodMs > 0, `${id} needs a period`);
    if (pose.backLeg) assert.equal(pose.backLeg.length, pose.keyframes.length, `${id} backLeg must match keyframes`);
    if (pose.backArm) assert.equal(pose.backArm.length, pose.keyframes.length, `${id} backArm must match keyframes`);
  }
});

test('back-limb solvers preserve segment lengths', () => {
  const hip = { x: 10, y: 20 };
  const b = solveBackLeg(hip, { thigh: 150, shank: 200, foot: 230 });
  assert.ok(Math.abs(dist(hip, b.kneeB) - LEN.thigh!) < 1e-6);
  assert.ok(Math.abs(dist(b.kneeB, b.ankleB) - LEN.shank!) < 1e-6);
  assert.ok(Math.abs(dist(b.ankleB, b.toeB) - LEN.foot!) < 1e-6);
  const sho = { x: -5, y: 8 };
  const a = solveBackArm(sho, { upperArm: 210, foreArm: 230 });
  assert.ok(Math.abs(dist(sho, a.elbowB) - LEN.upperArm!) < 1e-6);
  assert.ok(Math.abs(dist(a.elbowB, a.wristB) - LEN.foreArm!) < 1e-6);
});
