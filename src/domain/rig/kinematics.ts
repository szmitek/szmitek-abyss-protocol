import type { Angles, Bone, Keyframe, NodeId, Skeleton, Vec } from './types.ts';

// Canonical body. Lengths are relative; the whole figure is scaled to fit
// the viewport at render time, so absolute units don't matter.
export const SKELETON: Skeleton = [
  { id: 'foot', a: 'toe', b: 'ankle', len: 26 },
  { id: 'shank', a: 'ankle', b: 'knee', len: 58 },
  { id: 'thigh', a: 'knee', b: 'hip', len: 58 },
  { id: 'torso', a: 'hip', b: 'shoulder', len: 76 },
  { id: 'neckhead', a: 'shoulder', b: 'head', len: 25 },
  { id: 'upperArm', a: 'shoulder', b: 'elbow', len: 42 },
  { id: 'foreArm', a: 'elbow', b: 'wrist', len: 40 },
] as const;

type Adj = { bone: Bone; other: NodeId; sign: 1 | -1 };

function buildAdjacency(skeleton: Skeleton): Map<NodeId, Adj[]> {
  const adj = new Map<NodeId, Adj[]>();
  const push = (n: NodeId, entry: Adj) => {
    const list = adj.get(n) ?? [];
    list.push(entry);
    adj.set(n, list);
  };
  for (const bone of skeleton) {
    // Traversing a -> b applies +vector; b -> a applies -vector.
    push(bone.a, { bone, other: bone.b, sign: 1 });
    push(bone.b, { bone, other: bone.a, sign: -1 });
  }
  return adj;
}

const ADJ = buildAdjacency(SKELETON);

function boneVector(bone: Bone, angles: Angles): Vec {
  const deg = angles[bone.id] ?? 0;
  const r = (deg * Math.PI) / 180;
  return { x: Math.sin(r) * bone.len, y: -Math.cos(r) * bone.len };
}

/**
 * Forward kinematics: walk the skeleton tree from `rootNode` (pinned at
 * `rootPos`) applying each bone's absolute angle, returning every node's
 * position. Deterministic and side-effect free.
 */
export function solveFK(
  angles: Angles,
  rootNode: NodeId,
  rootPos: Vec = { x: 0, y: 0 },
): Record<NodeId, Vec> {
  const out: Partial<Record<NodeId, Vec>> = { [rootNode]: rootPos };
  const stack: NodeId[] = [rootNode];
  while (stack.length) {
    const node = stack.pop() as NodeId;
    const here = out[node] as Vec;
    for (const { bone, other, sign } of ADJ.get(node) ?? []) {
      if (out[other]) continue;
      const v = boneVector(bone, angles);
      out[other] = { x: here.x + sign * v.x, y: here.y + sign * v.y };
      stack.push(other);
    }
  }
  return out as Record<NodeId, Vec>;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate angle sets across an ordered keyframe list at u in [0,1]. */
export function interpolateAngles(keyframes: Keyframe[], u: number): Angles {
  if (keyframes.length === 1) return keyframes[0]!.angles;
  const clamped = Math.min(1, Math.max(0, u));
  const span = clamped * (keyframes.length - 1);
  const i = Math.min(Math.floor(span), keyframes.length - 2);
  const f = span - i;
  const a = keyframes[i]!.angles;
  const b = keyframes[i + 1]!.angles;
  const out: Angles = {};
  for (const bone of SKELETON) {
    out[bone.id] = lerp(a[bone.id] ?? 0, b[bone.id] ?? 0, f);
  }
  return out;
}

export interface FitTransform {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * One constant transform that fits every keyframe of a pose inside the
 * target box. Because it's computed over ALL keyframes and never changes
 * per frame, the figure never drifts or jitters during playback.
 */
export function computeFitTransform(
  keyframes: Keyframe[],
  rootNode: NodeId,
  box: { x: number; y: number; w: number; h: number },
  pad = 0.12,
): FitTransform {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const kf of keyframes) {
    const pts = solveFK(kf.angles, rootNode);
    for (const id in pts) {
      const p = pts[id as NodeId];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const padX = box.w * pad;
  const padY = box.h * pad;
  const scale = Math.min((box.w - 2 * padX) / bw, (box.h - 2 * padY) / bh);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    scale,
    tx: box.x + box.w / 2 - cx * scale,
    ty: box.y + box.h / 2 - cy * scale,
  };
}

export function applyTransform(p: Vec, t: FitTransform): Vec {
  return { x: p.x * t.scale + t.tx, y: p.y * t.scale + t.ty };
}

/** Eased ping-pong 0->1->0 driver for a timestamp and period. */
export function pingPongEase(elapsedMs: number, periodMs: number): number {
  const e = (elapsedMs % periodMs) / periodMs;
  const tri = e < 0.5 ? e * 2 : (1 - e) * 2;
  return tri < 0.5 ? 2 * tri * tri : 1 - Math.pow(-2 * tri + 2, 2) / 2;
}
