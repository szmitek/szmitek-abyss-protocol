# Long-term programming: next-batch audit

Code audit of merged PR #39 (`7d821bd9c66662582c2c46fb7176d30a743a413b`). This records current behavior and a proposed bounded next package; no behavior changes are included in this document.

## Existing behavior

- `weeklyProtocol.ts` assigns named A/B/C objectives (and D–G at higher frequency), builds spaced dates, applies primary-muscle planned-set caps and keeps the weekly contract stable through daily readiness changes. Active arcs anchor weekly dates to their start date.
- `generator.ts` preserves a locked session's exercises and targets when readiness reduces work sets. Recovery and warning signals replace a scheduled session. Equipment, movement and health gates remain stronger than objectives.
- `trainingArc.ts` has four calendar-based phases: calibration, foundation, overload and consolidation. Calibration caps work sets; consolidation reduces sets; overdue arcs require reassessment. A new cycle captures its frequency and the completed cycle's review decision.
- `arcDirective.ts` implements continue/recalibrate/recovery/hold decisions, protected entry after recovery or clearance, cycle-local evidence and overload gating. `arcReview.ts` and the associated tests cover transition decisions.
- `calculateRecovery` estimates recent muscular fatigue over 72 hours; it is not a return-after-interruption policy. A long gap does not itself change the user's experience level or identify a protected return block.

## Gaps to address

1. **Missed sessions.** `generateDailyProtocol` selects only the session whose stored date is today. There is no missed/deferred status or explicit reschedule action. Opening a later date skips the earlier objective; a new week starts at A again. Define and explain the policy without adding catch-up volume or silently rewriting completed history.
2. **Next-session dates.** Dashboard and Quests use `nextScheduledTrainingDateKey`, which follows fixed weekdays. Active weekly contracts instead follow the arc's start-day offsets. For example, a Tuesday-start three-session arc has Tuesday/Thursday/Saturday dates, while the helper predicts Monday/Wednesday/Friday. Use the actual contract for displayed dates and a consistent next-window fallback.
3. **Return after interruption.** There is no distinct gap-driven state in the planner. A past variant/target can still be reused when other gates permit. Design an explicit return review and a bounded lower-volume re-entry option; never infer injury, erase progress, choose kilograms or bypass readiness from elapsed time alone. Keep thresholds/product policy documented and test boundaries before shipping.
4. **Observed versus planned week.** The weekly cap tracks planned primary-muscle sets during construction. Any future rescheduling must account for confirmed work and retain recovery spacing; changing dates alone must not duplicate completion or XP.

## Proposed next package and verification

First make next-session displays agree with the locked contract and introduce explicit missed-session status without automatic catch-up. Add a user-controlled return option only after defining its stored state, evidence reset and interactions with active sessions and arcs. Keep the scope small enough to finish CI, merge and native APK verification in the same delivery.

Cover Tuesday-start arcs; crossing a week and arc boundary; one missed session; readiness recovery versus a missed session; a long gap; no recorded sessions; partial versus completed sessions; repeated taps; changed loadout; open workout; backup migration; and no duplicated rewards. Existing warm-ups stay separate from work volume. Preserve the four-week reassessment gate and each transition decision.

Physical-device flows remain outstanding. This audit is based on code inspection, not a phone walkthrough or a claim that a new return policy has shipped. Full roadmap: `docs/ROADMAP.md`; AI analysis and coach remain later, animations LAST.
