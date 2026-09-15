# Weekly session status and next training dates

Android versionCode 15; storage schema remains 14. This package changes schedule presentation and shares the existing date calculation with the weekly planner. It adds no persistent fields or dependencies.

## Dates

Dashboard and Quests now find the next scheduled date in the current locked weekly contract. A stale planning fingerprint falls back to the same arc-anchored window used by the planner. Crossing a week preserves the active arc's starting weekday. Profiles without an arc retain their first-week or calendar-week behavior. Dates include the month and day, not only a weekday.

The display does not promise training beyond the four-week re-scan gate. If the gate occurs before another scheduled date, the recovery screen explains that Player Re-scan is needed before a new training date is assigned. Future readiness is not predicted; a scheduled date does not authorize bypassing any existing training gate.

## Session statuses

The weekly panel derives status from the displayed contract, retained readiness and completed history. It does not create an independent attendance archive or reconstruct past contracts after a settings change.

- CLEARED requires completed non-trial work on the session date with its plan ID. Zero-work records, incomplete entries, another date and future records do not clear a row.
- TRAINED / OTHER PROTOCOL means another non-trial protocol was completed that day. It avoids claiming the displayed objective itself was completed.
- READINESS RECOVERY and READINESS HOLD reflect the retained daily signal; an actual completed training record takes precedence.
- IN PROGRESS preserves an open session, including one that now requires the normal resume review. It does not clear or resume it.
- READY and READINESS REQUIRED describe today's unstarted session. QUEUED describes future dates.
- MISSED / NO COMPLETION LOG describes a past training date with no completion or retained protected-readiness signal and no open session. UNAVAILABLE covers non-training plans. These are display states, not penalties.

The panel explains that missed work is not added to later days. Continuing Thursday's B after a missed Tuesday A retains the existing policy. No rescheduling, additional sets, duplicated quest rewards or changes to adherence/RPG calculations are introduced. Dates and statuses wrap below the session title to give long labels room.

## Verification and next work

Nine new domain tests cover locked/invalidated contracts; Tuesday-start weeks; all supported frequencies; month/year and local clock boundaries; re-scan gates; no-arc profiles; protected readiness; exact-date completion versus other protocols; active/future/partial records; and immutable status projection with checkpoint/resume and unchanged rewards. The date suite also runs under Europe/Warsaw. Full regression, TypeScript, lint and Android export are required before merge.

Physical Android checks remain unperformed: install over version 14 without uninstalling, open a Tuesday-start arc on a recovery day, compare Dashboard/Quests dates with the weekly panel, inspect an unlogged versus protected date, resume a paused session, and inspect labels with large system fonts.

Next milestone-3 package: explicit return after interruption. Define the user-confirmed lower-volume entry policy, evidence reset, stored state, compatibility with active workouts and arc review, and backup migration before implementing it. Do not silently select kilograms or change the active plan because time elapsed. AI analysis/coach stay in the full roadmap; animations remain LAST.
