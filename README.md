# Abyss Protocol

Mobile RPG training system built with React Native and Expo. The user is the character: clearing safe, personalized workouts increases XP, attributes, streak, and rank.

The visual language is an original dark-fantasy “System” interface. It intentionally does not use names, artwork, logos, characters, or UI assets from *Solo Leveling*.

## Current MVP slice

- Five-step onboarding for goal, level, duration, weekly rhythm, and equipment.
- 70+ equipment-free exercises with cues, muscle load, stat impact, and progression chains.
- Deterministic workout generator with equipment as a hard constraint.
- Local Player Scan for pain signals, posture priorities, known conditions, and unresolved safety holds.
- Five-check Movement Analysis with deterministic limits, pain holds, and required re-scans.
- Four-week Training Arcs with calibration, foundation, overload, and consolidation phases.
- Private Posture Archive with front/side/back capture, on-device storage, and before/current comparison.
- Daily Readiness Scan for energy, sleep, muscle soreness, and pain/unusual warning signals.
- Corrective Player Profile with confirmed primary/support targets, evidence sources, and generator explanations.
- Deterministic daily load adaptation: preserve, reduce, replace with recovery, or seal the protocol.
- Deterministic health constraints and posture-calibrated exercise selection.
- Recovery-aware rotation and same-session monotony protection.
- Progressive overload based on two successful exposures and user feedback.
- Daily Quest, guided set flow, duration timers, recovery timer, and Quest Complete feedback.
- XP, levels, threshold-based STR / END / AGI / VIT / MOB development, safe streak handling, and E–S ranks gated by active training weeks.
- Rank Trial eligibility and playable rank-up protocol.
- Persistent local profile and workout history through AsyncStorage; posture photos remain in app-private document storage.
- Quality workflow for typecheck, lint, and domain tests.

## Run locally

Requirements: Node.js 22.13+ and a recent Android/iOS development environment.

```bash
npm install
npm start
```

Then open a development build on Android or iOS. Expo SDK 57 uses React Native 0.86 and React 19.2.

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
```

## Install on Android without a development environment

Changes merged to `main` trigger the `Android Preview APK` workflow. The resulting
standalone release variant embeds its JavaScript bundle and is attached directly
to a GitHub prerelease as `Abyss-Protocol-preview.apk`. It can be installed on a
phone without Node.js, Git, Expo Go or a running Metro server.

Android may ask for permission to install an application from the browser or file
manager used to open the APK. Preview builds use Android's development signature
and are intended only for testing outside Google Play.

## Non-negotiable safety invariants

Every generated exercise must satisfy:

```text
exercise.requiredEquipment ⊆ user.availableEquipment
```

`none` is normalized as the bodyweight capability. Selecting any real equipment adds it alongside `none`; selecting **No equipment** removes every other capability. The final plan is validated again after selection and throws instead of returning an unsafe plan if the invariant is ever violated.

The permanent regression test generates 100 `none` workouts and checks every prescription.

Player Scan and Daily Readiness pain signals are deterministic constraints. Unresolved warning signals produce a zero-reward `SYSTEM SAFEGUARD` instead of an unsupervised workout. Free-text health notes never bypass either constraint. A positive readiness report may preserve planned load, but never increase it beyond progression rules.

## Architecture

```text
UI screens + local navigation
          ↓
AppStore orchestration
          ↓
Pure TypeScript domain
  generator · recovery · progression
          ↓
Exercise catalog + storage adapter
```

The domain has no React Native dependency, so generator behavior is fast to test and can later be reused by a Supabase Edge Function. `src/data/storage.ts` is the current local adapter; replacing it with a local-first repository backed by Supabase does not change screens or domain rules.

More detail: [Architecture](docs/ARCHITECTURE.md), [Design system](docs/DESIGN_SYSTEM.md), [Data model](docs/DATA_MODEL.md).

## Safety

Abyss Protocol does not diagnose injuries or replace a clinician. Player Scan observations calibrate or pause training; they are not diagnoses. Planned rest does not break a streak, “too hard” feedback reduces future targets, volume increases only after repeated success, and no penalty workout exists. Users should stop on pain, dizziness, chest discomfort, or unusual shortness of breath and seek qualified medical advice when needed.

## Roadmap boundary

Automatic posture analysis, cloud auth/sync, achievements, weekly quests, dungeons, boss fights, health integrations, avatars, and social systems remain outside this slice. Visual records deliberately do not diagnose posture yet; the next personal-trainer milestone is a structured, user-reviewable observation layer that can propose changes to the Corrective Player Profile without silently changing a plan.
