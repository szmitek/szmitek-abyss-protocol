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

  // --- warmup / cardio (knee drive) --------------------------------------
  'high-knees': {
    rootNode: 'hip',
    phases: ['GROUND', 'DRIVE'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 800,
    keyframes: [
      { angles: { foot: -80, shank: 6, thigh: 2, torso: 8, neckhead: 4, upperArm: 176, foreArm: 150 } },
      { angles: { foot: -45, shank: 45, thigh: -130, torso: 12, neckhead: 6, upperArm: 135, foreArm: 70 } },
    ],
  },
  'fast-feet': {
    rootNode: 'hip',
    phases: ['GROUND', 'LIFT'],
    primaryMuscles: ['thigh'],
    periodMs: 520,
    keyframes: [
      { angles: { foot: -82, shank: 4, thigh: 2, torso: 6, neckhead: 3, upperArm: 176, foreArm: 150 } },
      { angles: { foot: -70, shank: 16, thigh: -42, torso: 6, neckhead: 3, upperArm: 160, foreArm: 120 } },
    ],
  },

  // --- hinge / holds ------------------------------------------------------
  'good-morning': {
    rootNode: 'ankle',
    phases: ['STAND', 'HINGE'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 3000,
    keyframes: [
      { angles: { foot: -85, shank: 2, thigh: 2, torso: 4, neckhead: 2, upperArm: 178, foreArm: 178 } },
      { angles: { foot: -85, shank: -6, thigh: -12, torso: 82, neckhead: 78, upperArm: 178, foreArm: 178 } },
    ],
  },
  'deep-squat-hold': {
    rootNode: 'ankle',
    phases: ['SET', 'HOLD'],
    primaryMuscles: ['thigh'],
    secondaryMuscles: ['torso'],
    periodMs: 4000,
    keyframes: [
      { angles: { foot: -80, shank: 30, thigh: -40, torso: 38, neckhead: 20, upperArm: 95, foreArm: 92 } },
      { angles: { foot: -80, shank: 32, thigh: -42, torso: 40, neckhead: 22, upperArm: 95, foreArm: 92 } },
    ],
  },

  // --- push: prone --------------------------------------------------------
  'incline-pushup': {
    rootNode: 'toe',
    phases: ['TOP', 'BOTTOM'],
    primaryMuscles: ['upperArm', 'torso'],
    periodMs: 2600,
    keyframes: [
      { angles: { foot: 65, shank: 78, thigh: 76, torso: 74, neckhead: 78, upperArm: 168, foreArm: 168 } },
      { angles: { foot: 66, shank: 80, thigh: 78, torso: 78, neckhead: 82, upperArm: 140, foreArm: 200 } },
    ],
  },
  'knee-pushup': {
    rootNode: 'knee',
    phases: ['TOP', 'BOTTOM'],
    primaryMuscles: ['upperArm', 'torso'],
    periodMs: 2400,
    keyframes: [
      { angles: { thigh: 45, torso: 100, neckhead: 108, upperArm: 180, foreArm: 180, shank: 200, foot: 210 } },
      { angles: { thigh: 45, torso: 104, neckhead: 112, upperArm: 150, foreArm: 214, shank: 200, foot: 210 } },
    ],
  },
  'high-plank': {
    rootNode: 'toe',
    phases: ['BRACE', 'HOLD'],
    primaryMuscles: ['torso'],
    secondaryMuscles: ['thigh'],
    periodMs: 3600,
    keyframes: [
      { angles: { foot: 78, shank: 92, thigh: 90, torso: 92, neckhead: 96, upperArm: 182, foreArm: 182 } },
      { angles: { foot: 78, shank: 92, thigh: 90, torso: 91, neckhead: 95, upperArm: 182, foreArm: 182 } },
    ],
  },

  // --- push: vertical (wall / pike) --------------------------------------
  'wall-pushup': {
    rootNode: 'ankle',
    phases: ['TOP', 'BOTTOM'],
    primaryMuscles: ['upperArm', 'torso'],
    periodMs: 2600,
    keyframes: [
      { angles: { foot: -85, shank: 2, thigh: 0, torso: 6, neckhead: 6, upperArm: 90, foreArm: 90 } },
      { angles: { foot: -85, shank: 3, thigh: 2, torso: 12, neckhead: 12, upperArm: 75, foreArm: 45 } },
    ],
  },
  'pike-hold': {
    rootNode: 'toe',
    phases: ['SET', 'HOLD'],
    primaryMuscles: ['upperArm'],
    secondaryMuscles: ['torso'],
    periodMs: 4000,
    keyframes: [
      { angles: { foot: 58, shank: 66, thigh: 60, torso: 122, neckhead: 150, upperArm: 180, foreArm: 180 } },
      { angles: { foot: 58, shank: 66, thigh: 60, torso: 120, neckhead: 148, upperArm: 180, foreArm: 180 } },
    ],
  },
  'pike-pushup': {
    rootNode: 'toe',
    phases: ['TOP', 'BOTTOM'],
    primaryMuscles: ['upperArm'],
    secondaryMuscles: ['torso'],
    periodMs: 2600,
    keyframes: [
      { angles: { foot: 58, shank: 66, thigh: 60, torso: 122, neckhead: 150, upperArm: 180, foreArm: 180 } },
      { angles: { foot: 58, shank: 66, thigh: 60, torso: 120, neckhead: 170, upperArm: 150, foreArm: 212 } },
    ],
  },
};
