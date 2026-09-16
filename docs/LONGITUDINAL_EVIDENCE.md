# Milestone 4 completion: longitudinal evidence

Implementation: Android versionCode 18, storage schema unchanged at 16. Exact delivery state is recorded in HANDOFF.md.

## Implemented behavior

Progress opens a read-only evidence screen. It defaults to the latest two eligible movement checks and permits any earlier/later pair through paged selection. Same-day checks are distinguished by time; identical timestamps, reversed/missing IDs and future records cannot form a comparison. System Back closes selection first, then returns to Progress.

Five before/after ratings show categorical improvement/decline/stability. Photos are selected only by actual assessment ID, use known matching views, and retain setup/date uncertainty. A single available endpoint can still display its images; missing files show a visible error. Unlinked legacy records remain in Posture Archive and are counted separately, never inferred into an assessment link.

Training and retained readiness use an explicitly labeled inclusive calendar-day window. Whole endpoint days count even if a session occurred outside the test times; future timestamps/days do not count. Trial sessions are separate and excluded from training volume. Return sessions remain visible without becoming progression evidence. Work sets, prescribed/separately logged warm-ups, repetitions and timed seconds remain separate. Unknown exercise units are not invented.

Readiness coverage shows retained days and missing days plus normal/reduced/recovery/hold, low energy, poor sleep, high soreness and reported pain/warning counts. Overlapping signals and the 90-entry retention limit are explained. Missing days never imply symptom-free days; current health settings are not presented as historical symptoms.

Only an exact archived baseline/final pair exposes original adherence, target source and archived readiness. Today's frequency cannot rewrite those numbers. Archived aggregates remain separate from current retained daily reports. Arbitrary intervals show counts without an invented adherence percentage.

187 tests pass (eight new longitudinal tests), TypeScript and lint pass. The new suite also passes under Europe/Warsaw. Offline export/native delivery evidence is in HANDOFF.md. No data schema change, AI provider, upload, dependency or training/reward mutation.

Device walkthrough remains unperformed: upgrade from APK 17, open Progress → comparison, select nonadjacent/same-day checks, system Back, missing images, large fonts and empty history. These checks belong to device verification; automated selectors do not validate Android layout.

Milestone 4 implementation is complete with this package and PR #42. STOP before milestone 5: the user explicitly requested discussion of AI first. Do not begin AI research, provider selection or implementation automatically.

## Original audit

## Existing sources

- `PostureScan.movementAssessmentId` links a new photo checkpoint to an actual completed movement check. Older unspecified-side records remain unlinked.
- `MovementAssessment.results` stores five self-reported categorical checks, not measured strength, joint angles or a clinical assessment.
- `trainingArcReviews` preserves baseline/final assessment IDs, original adherence target/source, movement changes and aggregated readiness. `ArcComparisonPanel` compares the latest two completed cycles; `ArcReviewScreen` exposes each original report.
- `readinessLog` retains at most 90 entries and replaces same-day entries. Missing historical days cannot be interpreted as normal or symptom-free. `healthProfile` is current state, not a historical symptom ledger.
- `insights.ts` provides eight-week activity and exercise exposures. Completed-session counts include Rank Trials; result sets do not add separately logged `warmupSets`. The ActivityPanel wording about warm-ups should be clarified when this area is next edited.

## Accepted scope

1. Add a read-only evidence view reachable from Progress. Choose a pair of actual movement assessments; default to the latest two, with visible dates and missing-data states. Do not mutate training decisions merely by viewing it.
2. Show each of the five categorical movement results and its direction, alongside any explicitly linked photos. Use shared matching-view logic from PR #42; identify missing, legacy or removed photo evidence.
3. For matching completed-cycle reports, display the archived adherence target and source rather than recomputing a historical denominator using today's frequency. For arbitrary assessment intervals, show completed sessions/days, not an invented adherence percentage.
4. Show the exact interval and available readiness coverage. Count reported warning/hold signals only; do not infer that unrecorded days had no symptoms. Older archived aggregates may be displayed with their original reporting interval, never spliced into a different window as daily data.
5. Explain return blocks and protected days when contextualizing training volume. Do not treat a return workout as progression evidence or combine repetitions and timed seconds.
6. Keep this local and deterministic. Do not generate a body-improvement score, diagnose from photographs, fabricate missing measurements or change RPG rewards.

## Verification focus

- Unsorted/duplicate-day assessments, future records, an empty/one-record history, nonadjacent comparisons and UTC/local-day boundaries.
- Linked/unlinked/mixed-protocol/deleted photos; exact assessment identity and comparison views.
- Historical target changes, absent reports, partial intervals, retained readiness coverage and truncated old logs.
- Distinct training days versus multiple sessions, trials, warm-ups and tagged return work.
- Pure selectors must not mutate profile/history or apply a new training directive. Phone navigation/layout remains a separate check.

Milestone 5 remains on the full roadmap but is PAUSED for discussion at the user's request. No provider or photo upload is chosen or authorized by this document. Animations remain the final milestone.
