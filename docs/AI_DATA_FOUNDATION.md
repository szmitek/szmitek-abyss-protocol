# AI data foundation (Stage 5, package 1)

Architecture basis: `RPG_Fitness_AI_v2.md` and `RPG_Fitness_AI_v2_Benchmark.md`, supplied and reviewed locally. This implements only the narrower package subsequently authorized by the user; the reports are not authority to connect providers or implement coaching.

## Body records and user flow

Progress → Body measurements → enter actual date and any measured values → Add measurement. Latest weight and waist are independently selected; a circumference-only entry does not erase the last weight. History is chronological by measurement date, not entry time, with ten records initially shown. All app copy stays English.

`BodyMeasurement` is a version-1 record: stable id, measuredOn (local date), recordedAt (timestamp), protocolId, explicit kg/cm units and `BodyValues` with weight, waist, hips, chest, upperArm, thigh and calf. Missing values are explicit null. Empty entries, zero, negative/nonfinite values, invalid dates and future capture dates are rejected. The broad 1000-unit ceiling is input protection, not a physiological assessment. Values are not rounded into artificial precision. New records append; there is no silent overwrite. A future correction feature must retain provenance rather than repurpose IDs.

The initial protocol is home-morning-relaxed-right-v1. The form explains scale/conditions, waist location and consistent right-side relaxed circumference measurements. This version stores one reading per field. Repeated readings, condition overrides, alternate units and a correction ledger are future protocol extensions, not implicitly inferred from today's data. Unknown future protocol IDs can be preserved and are never mixed into the latest protocol's numeric aggregates.

## Deterministic facts

`bodyMeasurementStats` supports inclusive calendar-date periods, entry/day counts, latest non-null value, previous comparable earlier-day value, delta, mean of daily means and first-to-last daily mean difference. Each metric includes sample/day counts, excluded protocol count and evidence IDs. Repeated readings on one date cannot overweight that day. A difference is descriptive; it is not a fitted trend, prognosis or proof of tissue change. No interpolation, body-fat %, muscle mass or diagnosis exists.

`buildWeeklyReview` creates a detached `weekly-review.v1` payload: inclusive dates/time zone, chronological session history, work exposures (actual versus missing/legacy), separate warm-up sets, return/trial contexts, exercise/loading/machine comparison keys, actual-volume and uniform-load differences, wellbeing categories/coverage, self-reported movement tests, measurements and app-computed facts. Per-hand kg are not doubled, seconds are not repetitions and unidentified/different machines cannot share comparison groups. Changes compare recorded exposures; they are not estimates of maximum strength. Missing intermediate records remain visible.

Arbitrary historical planned-session denominators are not retained reliably: adherence plannedSessions/rate are null with a reason, rather than recalculated from today's frequency. Exact archived cycle adherence is carried separately with original target source and explicitly different scope. Consumers may request a longer history period separately; this package does not schedule weekly runs or generate an AI narrative.

Photo data is a manifest of IDs, recorded dates, protocols and view names only. No paths, image bytes, visual inference or network consent is manufactured. Imported recorded dates must not be interpreted as original capture dates. No sensitive health free text is added to the review. All payloads stay on-device.

## Provider boundary

`AIProvider` exposes capabilities, analyzeProgress and suggestExerciseReplacement using application-owned request/result types. No SDK types enter the domain. Results distinguish successful data/provenance from typed errors; cancellation is supported. Physique capability is false and its future operation requires a dedicated consent/image contract before it can be added. This is a foundation, not a production cloud execution policy: provider selection, privacy controls, limits, response validation, retries and budgeting belong to a later authorized package.

Claims use FACT / OBSERVATION / HYPOTHESIS / RECOMMENDATION, evidenceIds and low/medium/high confidence with reasons, limitations and alternatives. Proposed changes require user acceptance and cannot supply a starting load. There is no mutation operation in AIProvider.

`MockAIProvider` copies up to three supplied numerical facts with source evidence. Output provenance and summary both say DEVELOPMENT MOCK. Empty input yields insufficient_evidence; replacement returns no_proposal, never advice about pain or a plan mutation. It ignores network permission because it has no transport, uses no clock/randomness and returns repeatable detached output. There is no Weekly Review screen or mock invocation in the production UI yet.

## Storage and delivery

Snapshot v17 adds bodyMeasurements to UserProfile. v1–v16 local saves migrate with an empty history when absent; malformed v17 history is rejected, not discarded. Duplicate IDs are invalid. Data Vault checks the original checksum before upgrading supported v11–v16 backups. Photos, tests, wellbeing and workout history retain their existing paths/restore behavior. Export includes body history automatically. Keep existing recovery snapshot and save-error/retry handling.

APK target: versionCode 19, unchanged app identity/signing workflow. See HANDOFF for exact commit, CI and artifact evidence. Automated tests cover first/multiple/partial/empty records, ordering, null/zero rules, comparison protocols, period means, storage, APK18 migration, Vault integrity/round-trip, separated exercise evidence, categorical/visual-data boundaries and deterministic network-free mock behavior. Existing trainer safety/equipment/progression/backup tests remain mandatory. Physical-device installation and form walkthrough cannot be claimed from unit tests or APK signature verification.

## Next package (not started)

Offline Weekly Review UI using local facts and the mock: evidence navigation, explicit mock provenance, coverage, runtime response validation and missing-data display. Before any real model: jointly choose provider and permitted data, approve budget/benchmark, and define cloud consent/key handling. No integrations, paid tests, proxy, photo/video analysis or pain coaching are part of this delivery.
