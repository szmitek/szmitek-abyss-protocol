# Warm-up records and explicit load progression

## Workout behavior

Loaded repetition exercises in a normal training session offer WORK SET and WARM-UP before the first work set. Up to five optional preparation sets may be confirmed. Repetitions, kilograms, effort and optional machine identity are stored separately from work records. The app does not prescribe a warm-up load, estimate starting kilograms or add warm-ups automatically. Timed/bodyweight movements and rank trials retain their existing flow.

Warm-ups do not advance work-set counters, finish a quest, add XP/attribute points, add work volume, or provide mastery/load-progression evidence. Session elapsed time still includes time spent warming up. Each confirmation is persisted; stale/double taps are rejected. Warm-up records survive background/kill/resume and appear in the exercise archive. After a warm-up the form returns to WORK SET with a blank load; machine identity may be retained. Another warm-up requires an explicit selection. Equipment replacement is unavailable after any recorded preparation or work, so its records cannot be reassigned to another exercise.

## Explicit load decision

A first work set can offer a load review when current readiness is normal, the Training Arc permits progression, all equipment/movement/health checks pass, and the latest two completed exposures on distinct earlier dates reached the top of the rep range at one uniform positive load. Both work sessions must be successful and every work set must have measured reps/load/effort. Trial/future/legacy/unmeasured records and warm-ups do not qualify. A failed latest exposure is never skipped to select older successful evidence.

Machine proposals require the registered identity, exercise, location and configuration on every work set of both latest exposures. Mixed, unidentified, retired and different machines cannot supply a load proposal. Historical kg context can still show older same-machine records; that context alone does not qualify for progression.

The user enters the smallest increase actually available on their equipment. CHOOSE THIS INCREASE fills the draft load and resets the draft rep target to the exercise minimum. Optional app suggestions are capped at 10% above the prior load, accept at most two decimal places, and cannot exceed the existing 1000 kg input ceiling. The cap is a product guardrail, not a medical prescription. If the next equipment increment is too large, retain the current load. Ordinary manual logging stays available.

Nothing changes in stored state until the first work set is confirmed. Canceling, editing kg, selecting another machine or changing set type clears the draft decision. At confirmation the domain layer recomputes the evidence and rejects a stale/mismatched choice. A current warm-up rated too-hard suppresses the offer. Confirmation records previous kg, chosen increment and evidence dates on the first work set, and resets this session's work target to the exercise minimum. Actual reps/load remain explicit. Subsequent work sets keep that target and can reuse their last confirmed work load; preparation kilograms never fill a work-set load. No future starting weight is automatically selected.

## Compatibility and verification

Schema 14 and Android versionCode 14. Existing v13 profiles, history and active workouts are retained without invented preparation/decision records. Data Vault supports original v11/v12/v13 checksums before upgrade. It retains warm-ups and historical machine identities after registry removal. Creating a backup while a workout is active remains blocked; resume uses the normal local checkpoint. Malformed warm-up arrays and inconsistent decision records are rejected.

152 automated tests cover legacy behaviors plus new confirmation, replay, resume, work/RPG isolation, preparation limits, latest-exposure eligibility, health/equipment/readiness blocks, machine identity, increment limits, explicit target reset, rejected decisions and persistence/Vault compatibility. TypeScript, ESLint and Android export pass. React review covers keyed form reset, direct event handlers, immutable records, disabled controls, accessible form/choice labels and keyboard tap handling.

Physical Android checks remain unperformed: upgrade over v13 without uninstalling; log a warm-up and pause/kill/resume; confirm two work sets; inspect archive and backup restore; exercise machine switching and blank kg; choose/cancel/edit a load increase; inspect large-font and keyboard layout. No claim of device-level verification is made.
