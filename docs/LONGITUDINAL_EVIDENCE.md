# Next milestone-4 batch: longitudinal evidence

Source audit after PR #42, 2026-09-16. This document is a development checkpoint, not shipped functionality.

## Existing sources

- `PostureScan.movementAssessmentId` links a new photo checkpoint to an actual completed movement check. Older unspecified-side records remain unlinked.
- `MovementAssessment.results` stores five self-reported categorical checks, not measured strength, joint angles or a clinical assessment.
- `trainingArcReviews` preserves baseline/final assessment IDs, original adherence target/source, movement changes and aggregated readiness. `ArcComparisonPanel` compares the latest two completed cycles; `ArcReviewScreen` exposes each original report.
- `readinessLog` retains at most 90 entries and replaces same-day entries. Missing historical days cannot be interpreted as normal or symptom-free. `healthProfile` is current state, not a historical symptom ledger.
- `insights.ts` provides eight-week activity and exercise exposures. Completed-session counts include Rank Trials; result sets do not add separately logged `warmupSets`. The ActivityPanel wording about warm-ups should be clarified when this area is next edited.

## Proposed bounded implementation

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

After this bounded milestone-4 step, evaluate a first AI analysis prototype: evidence IDs, uncertainty and missing-data questions, constrained proposals, offline base behavior and zero/low-cost/privacy choices. No provider or photo upload is chosen or authorized by this document. Animations remain the final milestone.
