# Data model

## Exercise

`Exercise` holds identity, cue, muscle groups, equipment requirements, difficulty, progression chain/level, rep mode, safe target bounds, recovery time, attribute impact, and muscle load. The current catalog is code-owned and versioned with releases.

## Profile

`UserProfile` stores level, cumulative XP, rank, five visible attributes, per-attribute AP totals, active training weeks, normalized equipment capabilities, exclusions, goal, experience, duration, weekly frequency, streak state, workout count, cleared rank trials, and the local Player Scan.

`PlayerHealthProfile` stores structured current pain areas, posture priorities, unresolved safety signals, user-entered conditions, and professional restrictions. It is a screening and generator-calibration record, not a diagnosis. In the current private MVP it remains on-device.

## Workout plan and result

A `WorkoutPlan` is an immutable prescription for a date. Each `ExercisePrescription` embeds the selected exercise snapshot plus sets, target, and recovery time. A completed `WorkoutHistoryEntry` stores actual set/volume results, duration, user difficulty feedback, level XP, attribute AP, and any threshold-based visible stat gains.

Embedding the exercise prescription protects historical meaning when the catalog changes later.

## Local snapshot

The MVP persists one `AppSnapshot`:

- `schemaVersion`
- onboarding state and profile
- current Daily Quest
- resumable active workout
- workout history

The schema is deliberately serializable and mirrors the future normalized Supabase model. Cloud sync will add stable UUIDs, `created_at`/`updated_at`, device mutation IDs, and soft-deletion metadata.
