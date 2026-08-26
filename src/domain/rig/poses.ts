import type { Pose } from './types.ts';

// Angle authoring convention (see types.ts):
//   0 = segment points straight up the screen; +deg tilts forward (+x).
//   ~90 = horizontal forward; ~180 = straight down.
// Keyframes go neutral -> peak; playback eases through and ping-pongs back.
// Every pose here has been rendered and eyeballed before landing.

export const POSES: Partial<Record<string, Pose>> = {
  // --- squat family -------------------------------------------------------
  'bodyweight-squat': {
    rootNode: 'ankle',
    phases: ['STANCE', 'DEPTH'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 2800,
    keyframes: [
      { angles: { foot: -85, shank: 4, thigh: 2, torso: 6, neckhead: 2, upperArm: 176, foreArm: 178 } },
      { angles: { foot: -80, shank: 32, thigh: -42, torso: 42, neckhead: 22, upperArm: 88, foreArm: 86 } },
    ],
  },
  'tempo-squat': {
    rootNode: 'ankle',
    phases: ['DESCEND', 'DRIVE'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 4200,
    keyframes: [
      { angles: { foot: -85, shank: 4, thigh: 2, torso: 6, neckhead: 2, upperArm: 176, foreArm: 178 } },
      { angles: { foot: -80, shank: 32, thigh: -42, torso: 42, neckhead: 22, upperArm: 88, foreArm: 86 } },
    ],
  },
  'squat-pulse': {
    rootNode: 'ankle',
    phases: ['LOW', 'PULSE'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 900,
    keyframes: [
      { angles: { foot: -82, shank: 26, thigh: -30, torso: 34, neckhead: 18, upperArm: 92, foreArm: 90 } },
      { angles: { foot: -80, shank: 32, thigh: -42, torso: 42, neckhead: 22, upperArm: 88, foreArm: 86 } },
    ],
  },
  'jump-squat': {
    rootNode: 'ankle',
    phases: ['LOAD', 'JUMP'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 1500,
    keyframes: [
      { angles: { foot: -80, shank: 30, thigh: -40, torso: 40, neckhead: 20, upperArm: 92, foreArm: 88 } },
      { angles: { foot: -60, shank: 0, thigh: 4, torso: 2, neckhead: 0, upperArm: 20, foreArm: 10 } },
    ],
  },
  'wall-sit': {
    rootNode: 'ankle',
    phases: ['SET', 'HOLD'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 4000,
    keyframes: [
      { angles: { foot: -85, shank: 16, thigh: -74, torso: 2, neckhead: 0, upperArm: 92, foreArm: 88 } },
      { angles: { foot: -85, shank: 18, thigh: -78, torso: 2, neckhead: 0, upperArm: 92, foreArm: 88 } },
    ],
  },

  // --- warmup / cardio (knee drive) --------------------------------------
  'march-place': {
    rootNode: 'hip',
    phases: ['GROUND', 'KNEE DRIVE'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 1400,
    keyframes: [
      { angles: { foot: -85, shank: 2, thigh: 2, torso: 4, neckhead: 2, upperArm: 182, foreArm: 180 } },
      { angles: { foot: -55, shank: 30, thigh: -115, torso: 4, neckhead: 2, upperArm: 150, foreArm: 92 } },
    ],
  },
  'run-place': {
    rootNode: 'hip',
    phases: ['GROUND', 'DRIVE'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 900,
    keyframes: [
      { angles: { foot: -80, shank: 6, thigh: 2, torso: 8, neckhead: 4, upperArm: 176, foreArm: 150 } },
      { angles: { foot: -50, shank: 40, thigh: -125, torso: 10, neckhead: 6, upperArm: 140, foreArm: 80 } },
    ],
  },

  // --- push (prone) -------------------------------------------------------
  pushup: {
    rootNode: 'toe',
    phases: ['TOP', 'BOTTOM'],
    primaryMuscles: ['upperArm', 'torso'],
    secondaryMuscles: ['thigh'],
    periodMs: 2600,
    keyframes: [
      { angles: { foot: 78, shank: 92, thigh: 90, torso: 92, neckhead: 96, upperArm: 182, foreArm: 182 } },
      { angles: { foot: 80, shank: 95, thigh: 93, torso: 96, neckhead: 100, upperArm: 150, foreArm: 214 } },
    ],
  },
  'forearm-plank': {
    rootNode: 'toe',
    phases: ['BRACE', 'HOLD'],
    primaryMuscles: ['torso'],
    secondaryMuscles: ['thigh'],
    periodMs: 3600,
    keyframes: [
      { angles: { foot: 80, shank: 94, thigh: 92, torso: 94, neckhead: 98, upperArm: 168, foreArm: 250 } },
      { angles: { foot: 80, shank: 94, thigh: 92, torso: 92, neckhead: 96, upperArm: 168, foreArm: 250 } },
    ],
  },
};
