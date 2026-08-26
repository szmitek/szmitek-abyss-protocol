# Exercise motion rig

Data-driven 2D side-view figure that performs each exercise. The look is the
shaded "muscle model" (light body on dark, glowing working muscles); the motion
is computed from joint angles, so adding an exercise = adding data, not art.

## One-time setup

```bash
npx expo install react-native-svg
```

Everything else is already wired.

## How it fits together

```
poses.ts        angle keyframes per exercise.id     (data — you edit this)
   ↓
kinematics.ts   forward kinematics + fit transform  (pure math, tested)
   ↓
ExerciseMotion  react-native-svg renderer           (the muscle-model look)
   ↑
ExerciseGuide   picks rig → sprite → fallback, in that order
```

`src/domain/rig/` has no React Native dependency and is covered by
`tests/rig.test.ts` (`npm test`).

Selection order in `ExerciseGuide`: if `POSES[exercise.id]` exists it renders
the rig; otherwise the old sprite sheet; otherwise the calibrating fallback.
So the existing sprite exercises keep working untouched.

## Adding an exercise

Add one entry to `POSES` in `src/domain/rig/poses.ts`, keyed by `exercise.id`.

Angle convention (degrees, from vertical, for each bone's a→b direction):
- `0` points straight up the screen, `+` tilts forward (+x / right)
- `~90` = horizontal forward, `~180` = straight down

```ts
'glute-bridge': {
  rootNode: 'shoulder',            // a ground contact; framing auto-fits after
  phases: ['DOWN', 'BRIDGE'],
  primaryMuscles: ['thigh'],       // bones that glow (primary = brightest)
  secondaryMuscles: ['torso'],
  periodMs: 2600,
  keyframes: [
    { angles: { /* neutral pose */ } },
    { angles: { /* peak pose  */ } },
  ],
},
```

Two keyframes (neutral → peak) is enough for most movements; add more for
multi-stage moves (e.g. a lunge) and they interpolate in order, then ping-pong.

Bones: `foot shank thigh torso neckhead upperArm foreArm`.
Nodes: `toe ankle knee hip shoulder head elbow wrist`.

## Verifying a new pose without launching the app

The rig is pure math, so you can render any pose to an image headlessly and
eyeball it before committing (this is how the seed poses were checked):

```bash
pip install cairosvg --break-system-packages
# small node script: solveFK(angles, rootNode) -> draw <line> per bone -> cairosvg
```

Ping me the exercise ids and I'll author + verify the angle data.

## Current status

- Seeded: 22 exercises (squats, warmup knee-drives, holds, prone/vertical push, lunges).
- Single leg + arm, with a dimmed offset copy for depth.
- v1.1 DONE: independent back leg + back arm for lunges / split stances.
  A pose adds `backLeg` and `backArm` — one entry per keyframe, angles are
  DIRECT chain directions (hip→knee→ankle→toe, shoulder→elbow→wrist; 0 up,
  180 down, + forward). See `reverse-lunge` / `split-squat` for the pattern.
- Next: supine root (bridges, floor core) — same skeleton, a lying anchor plus
  a second render branch.
