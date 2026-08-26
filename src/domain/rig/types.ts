// 2D side-view rig for exercise motion guides.
// Pure data + math, no React Native dependency (mirrors the rest of src/domain).

export type NodeId =
  | 'toe' | 'ankle' | 'knee' | 'hip'
  | 'shoulder' | 'head' | 'elbow' | 'wrist';

export type BoneId =
  | 'foot' | 'shank' | 'thigh' | 'torso' | 'neckhead'
  | 'upperArm' | 'foreArm';

export interface Bone {
  id: BoneId;
  a: NodeId; // proximal
  b: NodeId; // distal — angle is measured for the a -> b direction
  len: number;
}

// Absolute segment angles in DEGREES, measured from vertical.
// +angle tilts the a->b direction toward +x (forward / screen-right).
// Direction vector = (sin, -cos), i.e. angle 0 points straight up the screen.
export type Angles = Partial<Record<BoneId, number>>;

export interface Keyframe {
  angles: Angles;
}

export type Vec = { x: number; y: number };
export type Skeleton = readonly Bone[];

export interface Pose {
  // Which joint is pinned while solving. Framing is auto-fitted afterwards,
  // so this only needs to be a sensible ground contact for the movement.
  rootNode: NodeId;
  // 2+ keyframes; the animation eases through them and ping-pongs back.
  keyframes: Keyframe[];
  // Two short phase labels shown under the figure.
  phases: [string, string];
  // Bones that light up as the working muscles (primary = brightest).
  primaryMuscles: BoneId[];
  secondaryMuscles?: BoneId[];
  periodMs: number;
  // Optional independent back limbs for split stances / lunges.
  // Angles are DIRECT chain directions (hip->knee->ankle->toe and
  // shoulder->elbow->wrist): 0 points up the screen, 180 straight down,
  // +tilts forward (+x). One entry per keyframe, parallel to `keyframes`.
  backLeg?: BackLegAngles[];
  backArm?: BackArmAngles[];
}

export interface BackLegAngles {
  thigh: number;
  shank: number;
  foot: number;
}

export interface BackArmAngles {
  upperArm: number;
  foreArm: number;
}
