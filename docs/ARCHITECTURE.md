# MVP architecture

## Decision summary

- **Client:** React Native + Expo SDK 57, TypeScript strict mode, New Architecture.
- **Navigation:** intentionally small local four-tab shell plus a full-screen workout state. A navigation framework is unnecessary for the current graph and can be introduced when deep links/auth appear.
- **State:** one versioned application snapshot orchestrated by `AppStoreProvider`.
- **Persistence:** AsyncStorage for the schema-versioned snapshot; app-private document storage for Posture Archive images.
- **Domain:** pure TypeScript functions for generation, recovery, XP, attributes, streak, and rank.
- **Backend seam:** storage is isolated behind load/save functions. Supabase will become a repository/sync adapter rather than a rewrite.

## Modules

| Path | Responsibility |
|---|---|
| `src/data/exercises.ts` | Curated exercise catalog and progression metadata |
| `src/domain/generator.ts` | Equipment/health constraint filtering, recovery-aware selection, overload prescription |
| `src/domain/health.ts` | Player Scan safety filters and posture-priority calibration |
| `src/domain/calibration.ts` | Movement Analysis constraints and foundation priorities |
| `src/domain/correctiveProfile.ts` | Confirmed corrective targets, evidence fusion, scoring, and explanations |
| `src/domain/trainingArc.ts` | Four-week phase and reassessment lifecycle |
| `src/domain/postureArchive.ts` | Visual record lifecycle and comparison selection |
| `src/domain/readiness.ts` | Daily signal scoring, one-per-day log, and workout gate |
| `src/domain/recovery.ts` | 72-hour decaying muscle-load estimate |
| `src/domain/progression.ts` | XP, levels, stat gains, streak, rank readiness |
| `src/state/AppStore.tsx` | Use-case orchestration and persistence commits |
| `src/data/posturePhotos.ts` | Private image copy/removal adapter |
| `src/ui` | Theme, reusable system components, and screens |

## Generator pipeline

1. Normalize the user loadout so bodyweight (`none`) is always explicit.
2. Stop generation when an unresolved Player Scan or same-day Daily Readiness warning signal is active.
3. Replace a scheduled workout with protected recovery when the readiness band requires it.
4. Filter the catalog by the equipment subset invariant, health constraints, Movement Analysis constraints, and exclusions.
5. Apply the experience/difficulty ceiling, including a stricter reduced-readiness cap.
6. Calculate muscle readiness from completed history and deprioritize same-day sore areas.
7. Reserve compatible corrective capacity for the confirmed primary/support targets.
8. Score progression groups using goal, recovery, corrective priorities, posture priorities, movement priorities, Training Arc phase, last-session variety, and seeded jitter.
9. Select one safe variant per progression group and attach human-readable selection reasons.
10. Prescribe sets/reps from the latest two successful exposures and feedback; reduced readiness blocks overload and removes working sets.
11. Add warm-up and mobility sequences, then validate equipment and health invariants again on the final plan.

Randomness is seeded from user, date, and completed-workout count. A generated daily plan is therefore stable until it is persisted and changes naturally on another day.

## Supabase target

Planned tables: `profiles`, `user_equipment`, `exercises`, `workout_plans`, `workout_sessions`, `exercise_results`, `attribute_events`, `rank_trials`, and `achievements`. Authentication maps one Supabase user to one profile. Row-level security restricts every user-owned row to `auth.uid()`.

The exercise selection validator remains deterministic client-side and server-side. AI may later propose workout intent, never raw unvalidated exercises.

## Failure behavior

- A missing or incompatible catalog returns an explicit generator error, never an unsafe fallback.
- Legacy schema v1–v6 snapshots migrate to schema v7 without erasing existing progress.
- An interrupted active workout is persisted and resumes before normal navigation.
- Reward application occurs once, only after all prescribed sets are cleared and feedback is selected.
