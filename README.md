# Abyss Protocol

Mobile RPG training system built with React Native and Expo. The user is the character: clearing safe, personalized workouts increases XP, attributes, streak, and rank.

The visual language is an original dark-fantasy “System” interface. It intentionally does not use names, artwork, logos, characters, or UI assets from *Solo Leveling*.

## Current MVP slice

- Five-step onboarding for goal, level, duration, weekly rhythm, and equipment.
- 70+ equipment-free exercises with cues, muscle load, stat impact, and progression chains.
- Deterministic workout generator with equipment as a hard constraint.
- Recovery-aware rotation and same-session monotony protection.
- Progressive overload based on two successful exposures and user feedback.
- Daily Quest, guided set flow, duration timers, recovery timer, and Quest Complete feedback.
- XP, levels, evidence-based STR / END / AGI / VIT / MOB gains, safe streak handling, and E–S ranks.
- Rank Trial eligibility and playable rank-up protocol.
- Persistent local profile and workout history through AsyncStorage.
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

## Non-negotiable equipment invariant

Every generated exercise must satisfy:

```text
exercise.requiredEquipment ⊆ user.availableEquipment
```

`none` is normalized as the bodyweight capability. Selecting any real equipment adds it alongside `none`; selecting **No equipment** removes every other capability. The final plan is validated again after selection and throws instead of returning an unsafe plan if the invariant is ever violated.

The permanent regression test generates 100 `none` workouts and checks every prescription.

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

Abyss Protocol does not diagnose injuries or prescribe rehabilitation. Planned rest does not break a streak, “too hard” feedback reduces future targets, volume increases only after repeated success, and no penalty workout exists. Users should stop on pain, dizziness, or unusual shortness of breath and seek qualified medical advice when needed.

## Roadmap boundary

Cloud auth/sync, achievements, weekly quests, dungeons, boss fights, health integrations, avatars, and social systems remain outside the first MVP slice. The next product milestone is Supabase sync with row-level security and conflict-safe local-first history.
