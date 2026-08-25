import type { Pose } from './types.ts';

// Angle authoring convention (see types.ts):
//   0 = segment points straight up the screen; +deg tilts forward (+x).
//   ~90 = horizontal forward; ~180 = straight down.
// Keyframes go neutral -> peak; playback eases through and ping-pongs back.

export const POSES: Partial<Record<string, Pose>> = {
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
