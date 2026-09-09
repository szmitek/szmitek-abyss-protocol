# Data model

## Exercise

`Exercise` holds identity, cue, muscle groups, equipment requirements, difficulty, progression chain/level, rep mode, safe target bounds, recovery time, attribute impact, and muscle load. The current catalog is code-owned and versioned with releases.

## Profile

`UserProfile` stores level, cumulative XP, rank, five visible attributes, per-attribute AP totals, active training weeks, normalized equipment capabilities, exclusions, goal, experience, duration, weekly frequency, streak state, workout count, cleared rank trials, the local Player Scan, Corrective Player Profile, Movement Analysis history, Training Arcs, Posture Archive metadata, and a rolling Daily Readiness log.

`PlayerHealthProfile` stores structured current pain areas, posture priorities, unresolved safety signals, user-entered conditions, and professional restrictions. It is a screening and generator-calibration record, not a diagnosis. In the current private MVP it remains on-device.

`CorrectiveProfile` stores confirmed primary/support training targets and their evidence sources. Suggested targets may be derived from Player Scan observations and limited Movement Analysis checks, but only the user-confirmed profile persists. Corrective targets raise selection priority; they never bypass equipment, pain, movement, readiness, or exclusion constraints.

`correctiveHistory` stores independent snapshots on changed confirmations, including an explicit return to general training. A required recalibration confirmation also creates a revision when targets remain unchanged. Each revision links to the active arc. Migration imports only the last known profile with `legacy-current` provenance; it does not invent older changes.

## Training Arc and visual records

`MovementAssessment` records the five submaximal movement checks. `TrainingArc` links a baseline assessment to a four-week cycle, its eventual reassessment, the archived review, and the entry directive inherited by the next cycle.

`TrainingArc.planSnapshot` freezes weekly frequency at cycle entry. Adherence uses that original four-week target even when the Player changes weekly settings later. Schema v10 freezes missing historical targets at migration with `legacy-estimate` provenance; saved reports retain their numbers. A new arc captures current settings with `cycle-start` provenance.

`TrainingArcReview` is the immutable end-of-cycle report. It stores planned/completed session counts, movement improvements/declines, perceived-difficulty totals, readiness-band totals, optional before/final visual checkpoint links, the deterministic decision, and human-readable reasons. Its decision can advance, continue, recalibrate, start the next cycle under protected recovery load, or hold unsupervised training. XP and photos cannot independently authorize progression.

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
- archived Training Arc reviews and an optional pending report gate

The schema is deliberately serializable and mirrors the future normalized Supabase model. Cloud sync will add stable UUIDs, `created_at`/`updated_at`, device mutation IDs, and soft-deletion metadata.

Current schema: v11. Pure migration lives in `src/domain/migrations.ts`; the AsyncStorage adapter retains the original storage key. Progress aggregates are derived from completed history, preserve calendar weeks with no activity, and keep repetitions separate from timed exercise seconds. Targets are logged prescriptions, not measured strength. Retired exercise IDs remain inspectable with unknown units.

## Cycle directive execution

`arcDirective.ts` derives shared generator policy and UI explanations from the active arc. Equipment, exclusions, pain, movement and readiness rules remain stronger than a cycle verdict.

| Entry decision | Next-cycle behavior |
| --- | --- |
| `advance` | Week-three target or variant progression requires two successful exposures to that exercise on distinct earlier days in the current cycle. |
| `continue` | Retain current targets and variants; difficult sessions may reduce targets. No automatic overload this cycle. |
| `recalibrate` | Require a saved Corrective Profile confirmation, including confirmation of unchanged targets or general training. Rebuild without previous-cycle load, with difficulty at most 2 and at most two work sets. No automatic overload. |
| `recovery` | First seven days use difficulty 1, minimum targets and one work set. Then difficulty at most 2 and at most two work sets; no automatic overload. |
| `hold` | Require clear Player Scan warnings and a later pain-free Movement Analysis, then use a protected recovery block from that check's date. |

`TrainingArc.directiveReviewedAt` records the explicit recalibration confirmation. Migration defaults it to null; closing the report or canceling the profile screen cannot clear this gate. Existing history and reports remain intact.

Mastery excludes rank trials, incomplete sessions, duplicate records, same-day and future sessions. Zero-set or partial-volume results cannot authorize overload. Rebuilding starts with current-cycle evidence; a cleared hold starts with evidence after the new movement check. Rank Trials additionally require an authorized overload week, two successful current-cycle training days and normal readiness from today.

Weekly planning fingerprint version 2 includes the entry decision and confirmation timestamp. `questState.ts` refreshes cached quests against the rebuilt protocol, revalidates start conditions and preserves a cleared day's status after report acknowledgement. Gates take precedence over cached completed quests.
