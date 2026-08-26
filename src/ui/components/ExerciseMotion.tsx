import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Line, Path } from 'react-native-svg';

import {
  applyTransform,
  computeFitTransform,
  interpolateAngles,
  interpolateBackArm,
  interpolateBackLeg,
  pingPongEase,
  solveBackArm,
  solveBackLeg,
  solveFK,
} from '../../domain/rig/kinematics.ts';
import type { BoneId, Pose, Vec } from '../../domain/rig/types.ts';
import { colors, radius } from '../theme.ts';

const VIEW = { w: 300, h: 232 };
const BOX = { x: 0, y: 0, w: VIEW.w, h: VIEW.h };

const MUSCLE = '#2AA8FF';
const BASE = '#b7c2cd';
const FAR = '#6b7784';
const LIGHT = '#dae4ec';
const RIM = '#e8f2fa';
const LINE = 'rgba(58,70,86,0.5)';

function unit(p1: Vec, p2: Vec) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len, nx: -dy / len, ny: dx / len };
}

const fmt = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;

// Tapered, slightly bulging capsule between two joints — reads as muscle volume.
function capsule(p1: Vec, p2: Vec, h1: number, h2: number, b1: number, b2: number) {
  const v = unit(p1, p2);
  const A = { x: p1.x + v.nx * h1, y: p1.y + v.ny * h1 };
  const B = { x: p2.x + v.nx * h2, y: p2.y + v.ny * h2 };
  const C = { x: p2.x - v.nx * h2, y: p2.y - v.ny * h2 };
  const D = { x: p1.x - v.nx * h1, y: p1.y - v.ny * h1 };
  const mAB = { x: (A.x + B.x) / 2 + v.nx * b1, y: (A.y + B.y) / 2 + v.ny * b1 };
  const mCD = { x: (C.x + D.x) / 2 - v.nx * b2, y: (C.y + D.y) / 2 - v.ny * b2 };
  const dCap = { x: p2.x + v.dx * h2 * 0.9, y: p2.y + v.dy * h2 * 0.9 };
  const pCap = { x: p1.x - v.dx * h1 * 0.9, y: p1.y - v.dy * h1 * 0.9 };
  return (
    `M${fmt(A.x, A.y)}Q${fmt(mAB.x, mAB.y)} ${fmt(B.x, B.y)}` +
    `Q${fmt(dCap.x, dCap.y)} ${fmt(C.x, C.y)}` +
    `Q${fmt(mCD.x, mCD.y)} ${fmt(D.x, D.y)}` +
    `Q${fmt(pCap.x, pCap.y)} ${fmt(A.x, A.y)}Z`
  );
}

function shiftPair(p1: Vec, p2: Vec, off: number): [Vec, Vec] {
  const v = unit(p1, p2);
  return [
    { x: p1.x + v.nx * off, y: p1.y + v.ny * off },
    { x: p2.x + v.nx * off, y: p2.y + v.ny * off },
  ];
}

function offX(p: Vec, dx: number): Vec {
  return { x: p.x + dx, y: p.y };
}

export function ExerciseMotion({ pose, paused = false }: { pose: Pose; paused?: boolean }) {
  const transform = useMemo(
    () =>
      computeFitTransform(pose.keyframes, pose.rootNode, BOX, 0.14, (i, pts) => {
        const ex: Vec[] = [];
        const bl = pose.backLeg?.[i];
        if (bl) {
          const b = solveBackLeg(pts.hip, bl);
          ex.push(b.kneeB, b.ankleB, b.toeB);
        }
        const ba = pose.backArm?.[i];
        if (ba) {
          const a = solveBackArm(pts.shoulder, ba);
          ex.push(a.elbowB, a.wristB);
        }
        return ex;
      }),
    [pose],
  );
  const [u, setU] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
  }, [pose]);

  useEffect(() => {
    if (paused) return;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      setU(pingPongEase(ts - startRef.current, pose.periodMs));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [pose, paused]);

  const nodes = useMemo(() => {
    const angles = interpolateAngles(pose.keyframes, u);
    const raw = solveFK(angles, pose.rootNode);
    const out = {} as Record<keyof typeof raw, Vec>;
    for (const id in raw) out[id as keyof typeof raw] = applyTransform(raw[id as keyof typeof raw], transform);
    return out;
  }, [pose, u, transform]);

  const back = useMemo(() => {
    if (!pose.backLeg && !pose.backArm) return null;
    const angles = interpolateAngles(pose.keyframes, u);
    const raw = solveFK(angles, pose.rootNode);
    const res: { kneeB?: Vec; ankleB?: Vec; toeB?: Vec; elbowB?: Vec; wristB?: Vec } = {};
    if (pose.backLeg) {
      const b = solveBackLeg(raw.hip, interpolateBackLeg(pose.backLeg, u));
      res.kneeB = applyTransform(b.kneeB, transform);
      res.ankleB = applyTransform(b.ankleB, transform);
      res.toeB = applyTransform(b.toeB, transform);
    }
    if (pose.backArm) {
      const a = solveBackArm(raw.shoulder, interpolateBackArm(pose.backArm, u));
      res.elbowB = applyTransform(a.elbowB, transform);
      res.wristB = applyTransform(a.wristB, transform);
    }
    return res;
  }, [pose, u, transform]);

  const primarySet = new Set(pose.primaryMuscles);
  const secondarySet = new Set(pose.secondaryMuscles ?? []);
  const primOpacity = 0.2 + 0.55 * u;
  const secOpacity = 0.14 + 0.28 * u;

  const { toe, ankle, knee, hip, shoulder, head, elbow, wrist } = nodes;
  const dx = 7;

  const activePhase = u < 0.5 ? 0 : 1;
  const framesPerSecond = Math.round(1000 / (pose.periodMs / 40));

  const hlPath = (id: BoneId, a: Vec, b: Vec, h1: number, h2: number) => {
    if (primarySet.has(id)) return { d: capsule(a, b, h1, h2, h1 * 0.5, h2 * 0.4), o: primOpacity };
    if (secondarySet.has(id)) return { d: capsule(a, b, h1, h2, h1 * 0.5, h2 * 0.4), o: secOpacity };
    return null;
  };
  const thighHL = hlPath('thigh', knee, hip, 9, 13);
  const torsoHL = hlPath('torso', hip, shoulder, 15, 19);
  const armHL = hlPath('upperArm', shoulder, elbow, 8, 6);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerText}>MOTION ARCHIVE</Text>
        <Text style={styles.headerMeta}>{paused ? 'PAUSED' : `${framesPerSecond} FPS`}</Text>
      </View>

      <Svg width="100%" height={VIEW.h} viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}>
        {/* back limbs — real chain when the pose defines them, else a dimmed offset copy for depth */}
        {back?.kneeB && back.ankleB && back.toeB ? (
          <>
            <Path d={capsule(hip, back.kneeB, 8, 11, 4, 2)} fill={FAR} opacity={0.6} />
            <Path d={capsule(back.kneeB, back.ankleB, 6, 8, 3, 1)} fill={FAR} opacity={0.6} />
            <Path d={capsule(back.ankleB, back.toeB, 4, 5, 1, 2)} fill={FAR} opacity={0.6} />
          </>
        ) : (
          <>
            <Path d={capsule(offX(ankle, dx), offX(knee, dx), 6, 9, 3, 1)} fill={FAR} opacity={0.4} />
            <Path d={capsule(offX(knee, dx), offX(hip, dx), 9, 13, 5, 2)} fill={FAR} opacity={0.4} />
          </>
        )}
        {back?.elbowB && back.wristB ? (
          <>
            <Path d={capsule(shoulder, back.elbowB, 8, 6, 2, 2)} fill={FAR} opacity={0.6} />
            <Path d={capsule(back.elbowB, back.wristB, 6, 4, 2, 1)} fill={FAR} opacity={0.6} />
          </>
        ) : (
          <>
            <Path d={capsule(offX(shoulder, dx), offX(elbow, dx), 8, 6, 2, 2)} fill={FAR} opacity={0.4} />
            <Path d={capsule(offX(elbow, dx), offX(wrist, dx), 6, 4, 2, 1)} fill={FAR} opacity={0.4} />
          </>
        )}
        {/* foot */}
        <Path
          d={capsule(toe, ankle, 4, 5, 1, 1)}
          fill={BASE}
          stroke={RIM}
          strokeWidth={1}
        />

        {/* near leg */}
        <Path d={capsule(ankle, knee, 6, 10, 4, 1)} fill={BASE} stroke={RIM} strokeWidth={1.2} />
        <Path d={capsule(...shiftPair(ankle, knee, 3.5), 3, 5, 2, 0)} fill={LIGHT} opacity={0.55} />
        <Path d={capsule(knee, hip, 10, 14, 6, 3)} fill={BASE} stroke={RIM} strokeWidth={1.2} />
        <Path d={capsule(...shiftPair(knee, hip, 4), 4.5, 6, 3, 0)} fill={LIGHT} opacity={0.55} />
        {thighHL && <Path d={thighHL.d} fill={MUSCLE} opacity={thighHL.o} />}

        {/* torso */}
        <Path d={capsule(hip, shoulder, 16, 20, 4, 3)} fill={BASE} stroke={RIM} strokeWidth={1.3} />
        <Path d={capsule(...shiftPair(hip, shoulder, 6), 8, 10, 2, 0)} fill={LIGHT} opacity={0.5} />
        {torsoHL && <Path d={torsoHL.d} fill={MUSCLE} opacity={torsoHL.o} />}
        <AbLines hip={hip} shoulder={shoulder} />

        {/* neck + head */}
        <Path d={capsule(shoulder, head, 7, 6, 1, 1)} fill={BASE} stroke={RIM} strokeWidth={1} />
        <Ellipse cx={head.x} cy={head.y} rx={13.5} ry={16} fill="#c2ccd6" stroke={RIM} strokeWidth={1.4} />

        {/* near arm */}
        <Path d={capsule(shoulder, elbow, 9, 6.5, 3, 2)} fill={BASE} stroke={RIM} strokeWidth={1.1} />
        {armHL && <Path d={armHL.d} fill={MUSCLE} opacity={armHL.o} />}
        <Path d={capsule(elbow, wrist, 6.5, 4.5, 3, 1)} fill={BASE} stroke={RIM} strokeWidth={1.1} />
      </Svg>

      <View style={styles.phaseRow}>
        <View style={[styles.phase, activePhase === 0 ? styles.on : styles.off]}>
          <Text style={styles.phaseIndex}>01</Text>
          <Text numberOfLines={1} style={styles.phaseLabel}>{pose.phases[0]}</Text>
        </View>
        <View style={[styles.phase, styles.phaseRight, activePhase === 1 ? styles.on : styles.off]}>
          <Text style={styles.phaseIndex}>02</Text>
          <Text numberOfLines={1} style={styles.phaseLabel}>{pose.phases[1]}</Text>
        </View>
      </View>
    </View>
  );
}

function AbLines({ hip, shoulder }: { hip: Vec; shoulder: Vec }) {
  const v = unit(hip, shoulder);
  const ticks = [1, 2, 3, 4].map((i) => {
    const f = i / 5;
    const c = { x: hip.x + (shoulder.x - hip.x) * f, y: hip.y + (shoulder.y - hip.y) * f };
    return { x1: c.x - v.nx * 5, y1: c.y - v.ny * 5, x2: c.x + v.nx * 5, y2: c.y + v.ny * 5, i };
  });
  return (
    <>
      {ticks.map((t) => (
        <Line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={LINE} strokeWidth={1} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 232,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(41,182,255,0.2)',
    backgroundColor: '#03060D',
    justifyContent: 'center',
  },
  header: { position: 'absolute', top: 10, left: 12, right: 12, zIndex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { color: colors.primary, fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  headerMeta: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  phaseRow: { position: 'absolute', left: 10, right: 10, bottom: 9, flexDirection: 'row', gap: 7 },
  phase: {
    flex: 1, minHeight: 29, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.1)',
  },
  phaseRight: { justifyContent: 'flex-end' },
  on: { opacity: 1 },
  off: { opacity: 0.35 },
  phaseIndex: { color: colors.primary, fontSize: 7, fontWeight: '900', marginRight: 6 },
  phaseLabel: { color: colors.text, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
});
