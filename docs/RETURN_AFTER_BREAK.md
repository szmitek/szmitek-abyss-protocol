# Next package: user-controlled return after interruption

Implementation design checkpoint after PR #40. This is not behavior shipped in APK 15 and is not a medical return-to-exercise prescription. It proposes a conservative app mode the user can explicitly choose; all existing health and movement restrictions remain authoritative.

## Proposed user flow

Show the date of the last completed normal workout and offer REVIEW RETURN PLAN from the training dashboard. A long-gap hint can make the option visible, but elapsed days alone must never activate it or infer an injury. New profiles with no completed training should follow existing onboarding/calibration. Rank trials, warm-ups, abandoned sessions and future imported dates do not establish the last normal training date.

The review describes the proposed limits before confirmation: retain the scheduled A/B/C dates, reduce work to at most two sets per exercise and the minimum rep/time target, pause variant/rep/load increases and Rank Trials, and require Daily Readiness before each session. Reduced/recovery/hold readiness and arc directives may impose stricter limits. Kilograms remain explicit user input. This is a proposed product policy, to be finalized and tested during implementation.

The proposed entry block lasts for three completed normal training sessions on distinct dates, not three elapsed days. At its end, show a review before returning to normal programming; do not automatically raise load after the third completion. Pauses and skipped dates retain the block. A user may exit through an explicit review; exiting must not resurrect pre-break overload evidence.

Do not change a running workout. Require it to be completed or closed before enabling, changing or ending the return mode. Overdue Training Arc re-scan, pending arc review, hold clearance and corrective confirmation keep their existing priority. A return block may span an arc boundary; an arc transition must not silently erase it.

## State and integration requirements

- Store a bounded return record with activation time/date, status, confirmed completion references, finish/exit decision and an evidence boundary that survives leaving the mode. Choose one canonical shape before adding types, migration, validator and Vault support.
- Use completed normal history on distinct dates to advance the block. Completion replay, trial completion, partial work, a warm-up-only session and future evidence must not advance it. Derive from history or update atomically with the completion record; avoid two independent counters.
- Keep old history, XP, rank and attributes intact. Do not alter the user's stated experience level. Label planned-set reductions rather than rewriting recorded sets.
- Include return state in the weekly protocol fingerprint and invalidate only unstarted cached plans. Completed daily quests stay completed. Loadout changes preserve the mode and evidence boundary.
- Apply the stricter of return limits, current arc rules and readiness in the domain. Do not merely disable UI buttons. `getArcDirective`, variant choice, prescription, `loadProgressionOffer`, Rank Trial gating and workout confirmation must agree about the mode.
- Separate historical context from progression evidence. Old loads and machines may remain visible as history, but pre-return success cannot authorize a new increase. After leaving the mode require new qualifying normal work before progression; choose and document the boundary consistently for all progression paths.
- Preserve active-workout checkpoint rules. Backup/restore retains mode, decision and boundary; legacy saves get no invented activation. Reject malformed dates, unknown statuses and conflicting completion references.

## Relevant code and validation

`generator.ts` currently filters prior evidence with `getArcDirective().historyStart`, uses `evidenceStart` for mastery and applies arc/readiness limits when prescribing. `loadProgression.ts` separately revalidates load decisions. `weeklyProtocol.ts` caches against the profile fingerprint. `AppStore.finishWorkout` creates history and awards development atomically; it is an integration point for return completion. `workoutLifecycle.ts` blocks a previous-day checkpoint and rechecks training/readiness at confirmation.

Meaningful tests must cover explicit activation/cancel/exit, exact date boundaries and future records, active-session refusal, repeated confirmation, all readiness bands and arc decisions, equipment exclusions and machines, unchanged history/rewards, protected-session limits, no stale cached weekly plan, evidence after exit, distinct completed days, reassessment during the block, and legacy migration plus Vault restore. Test that merely opening the review changes no stored plan. Physical phone checks must cover confirmation, pause/kill/resume, large fonts, and restored checkpoints.

Ship this as a separate reviewed PR with its own Android versionCode and data-schema decision. Use `docs/HANDOFF.md` for the verified latest APK and `docs/ROADMAP.md` for the full sequence; AI analysis and coach remain later, exercise animations LAST.
