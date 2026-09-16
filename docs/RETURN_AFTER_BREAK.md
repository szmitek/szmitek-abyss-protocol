# User-controlled return after interruption

Android versionCode 16; storage schema 15. This implements the milestone-3 return block designed after PR #40. These are optional app limits, not a medical return-to-exercise prescription.

## User flow

The dashboard offers REVIEW RETURN PLAN after a completed normal workout with known work sets. It shows the last completed training date. Elapsed days never activate it automatically, and new profiles retain normal onboarding/calibration. Opening the review or canceling changes no stored state.

Explicit confirmation retains scheduled A/B/C dates and caps working exercises at two sets, minimum rep/time targets and difficulty at most 2. Readiness and arc rules may impose stricter limits. Variant, rep and load progression and Rank Trials are paused. Kilograms remain explicit user input. The workout header, plan focus and completed history identify the return block.

Three completed, marked training days unlock the end-of-block review. Repeated records on one day count once. Trials, incomplete work, warm-up/mobility-only sessions, another block and future records do not advance the counter. The counter is derived from history rather than stored separately. Skipped days leave the block active. Limits remain active after the third day until the user confirms the review. Ending earlier is also possible through an explicit confirmation.

An open workout must be completed or closed before the mode changes. Required Player checks, overdue re-scan, pending arc review and corrective confirmation retain priority. Readiness is still required to train; activating a return plan cannot clear a readiness warning. Existing completed daily quests remain completed.

## State and evidence

The profile stores the latest return record: ID, activation timestamp/day, optional end timestamp/day and completed/early-exit decision. Plans and completed history carry a returnBlockId. The record survives loadout changes and arc transitions. Entering or leaving invalidates only unstarted cached plans through the weekly fingerprint. History, earned XP, rank and stated experience remain intact.

The return record supplies an evidence boundary. On exit that boundary advances to the explicit end time. Pre-break and return-block sessions remain visible in the archive but cannot authorize new progression. Future normal work must meet the existing two-session, readiness, arc and machine rules. The latest return boundary remains after exit and cannot be erased by simply opening another screen. Normal work targets start from exercise minima when no eligible post-return history exists; the app does not select starting kilograms.

The domain enforces limits when generating a plan, substituting an exercise and confirming/resuming work. A stale or mismatched checkpoint cannot bypass the mode. Existing prior-day resume restrictions remain in force.

## Compatibility and verification

Migration keeps v14 and older local history/checkpoints without inventing a return activation. Vault verifies the original v11–v14 checksum before upgrading to schema 15. Current backups retain return decisions and evidence boundaries. The validator checks chronology, typed fields, plan limits, tagged trials and active-plan identity.

172 tests pass, including eleven new tests for explicit activation, stale/repeated decisions, active-session refusal, readiness bands, limits and substitutions, distinct marked completion dates, review after three sessions, early exit, renewed progression evidence, unchanged completed quests, all arc decisions, reassessment, loadouts/exclusions, resume guards, malformed records, legacy migration and Vault round trips. The new suite also passed under Europe/Warsaw. TypeScript and ESLint pass; Android export and native build status are recorded in HANDOFF.md.

React review: transient confirmation state is keyed to the day and return record, confirmation uses an expected day/ID, domain errors remain visible, buttons have explicit labels, text wraps, and state changes happen only in action handlers. No new dependencies, providers, costs or photo uploads. Expo telemetry is disabled in both CI workflows; Quality export runs with EXPO_OFFLINE=1. Local export uses EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1.

Physical-device checks remain unperformed: upgrade over APK 15; review/cancel/activate; log and pause/kill/resume a return workout; inspect the RETURN PLAN history label; complete three distinct days and confirm exit; inspect early exit and large-font layout; export/restore the mode. Export/CI is not a phone test.

## Next roadmap work

Milestone 4: audit standardized evidence capture, comparable left/right views, quality guidance and links between photos, movement checks and longitudinal changes. AI analysis and coach remain later; animations LAST. See ROADMAP.md for the full accepted sequence and HANDOFF.md for exact publication state.
