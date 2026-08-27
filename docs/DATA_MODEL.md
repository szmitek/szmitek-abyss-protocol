# Data model

## Exercise

`Exercise` holds identity, cue, muscle groups, equipment requirements, difficulty, progression chain/level, rep mode, safe target bounds, recovery time, attribute impact, and muscle load. The current catalog is code-owned and versioned with releases.

## Profile

`UserProfile` stores level, cumulative XP, rank, five visible attributes, per-attribute AP totals, active training weeks, normalized equipment capabilities, exclusions, goal, experience, duration, weekly frequency, streak state, workout count, cleared rank trials, the local Player Scan, Corrective Player Profile, Movement Analysis history, Training Arcs, Posture Archive metadata, and a rolling Daily Readiness log.

`PlayerHealthProfile` stores structured current pain areas, posture priorities, unresolved safety signals, user-entered conditions, and professional restrictions. It is a screening and generator-calibration record, not a diagnosis. In the current private MVP it remains on-device.

`CorrectiveProfile` stores confirmed primary/support training targets and their evidence sources. Suggested targets may be derived from Player Scan observations and limited Movement Analysis checks, but only the user-confirmed profile persists. Corrective targets raise selection priority; they never bypass equipment, pain, movement, readiness, or exclusion constraints.

## Training Arc and visual records

`MovementAssessment` records the five submaximal movement checks. `TrainingArc` links a baseline assessment to a four-week cycle and its eventual reassessment.

`PostureScan` stores the date, active Training Arc link, and metadata for exactly three `PosturePhoto` records: front, side, and back. Image bytes live in the app-private document directory; only their local URIs and dimensions are serialized into the snapshot. The app disables Android backup and performs no upload or automated posture diagnosis.

## Daily readiness

`DailyReadiness` records one replaceable signal per date: energy, sleep quality, ordinary muscle soreness, affected muscle groups, and a separate pain/unusual-symptom flag. Its derived band is `normal`, `reduced`, `recovery`, or `hold`. The generator may preserve or lower planned load from this record; it never uses high readiness to exceed normal progression.

## Weekly protocol

`WeeklyProtocol` is the persisted training contract for the active seven-day window. It stores its planning fingerprint, Training Arc context, shared primary-muscle volume ceilings, and two to seven `WeeklyProtocolSession` records. Each session has a stable A–G code, date, objective, focus groups, and an embedded planned `WorkoutPlan`.

Daily Readiness operates on the embedded plan. A reduced signal removes working sets without changing exercise identity or targets; recovery and hold signals replace the daily execution without rewriting the weekly contract.

## Workout plan and result

A `WorkoutPlan` is an immutable prescription for a date. Each `ExercisePrescription` embeds the selected exercise snapshot plus sets, target, recovery time, and up to two human-readable selection reasons. A completed `WorkoutHistoryEntry` stores actual set/volume results, duration, user difficulty feedback, level XP, attribute AP, and any threshold-based visible stat gains.

Embedding the exercise prescription protects historical meaning when the catalog changes later.

## Local snapshot

The MVP persists one `AppSnapshot`:

- `schemaVersion`
- onboarding state and profile
- current locked Weekly Protocol
- current Daily Quest
- resumable active workout
- workout history
- local Posture Archive metadata
- rolling Daily Readiness history

The schema is deliberately serializable and mirrors the future normalized Supabase model. Cloud sync will add stable UUIDs, `created_at`/`updated_at`, device mutation IDs, and soft-deletion metadata.
