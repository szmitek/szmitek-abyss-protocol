# Local Weekly Review — Stage 5 package 2

Based on AI Research & Architecture v2, its benchmark contract and the PR44 domain contracts. This is a manually triggered, offline mock preview on real records, not a real AI integration.

## Flow and scope

Progress → Weekly Review · Development Mock. Select a completed Monday–Sunday week; the default is the most recently completed week, including the prior week when today is Sunday. Local date-key arithmetic avoids DST shifts. The device time-zone name is retained in each request. The ongoing incomplete week is excluded.

The screen displays training counts, missing wellbeing days, measurement records/days and protocol exclusions, missing actual sets, self-reported tests and photo checkpoint counts. No log is not proof of inactivity or good recovery. Arbitrary historical planned-session denominators remain unavailable; exact cycle reports are not repurposed as weekly adherence.

A separate four-week context includes the selected week. `WeeklyReviewInput.historyContext` is an optional additive contract field, with its own dates, coverage and `history:` fact identifiers. Old v1 consumers remain valid. Context and weekly facts can be browsed independently. Nothing turns two exposures into proof of a lasting trend.

Run Development Mock invokes an injected `AIProvider` through the domain service. `src/data/reviewProvider.ts` is the sole composition point. The service explicitly permits only mock mode in this package, passes allowNetwork:false, clones the input and validates unknown output before returning it. It handles exceptions and cancellation, discarding late aborted responses. No model/SDK/backend/key/transport is installed. The mock still returns a small deterministic selection of supported facts, not invented recommendations.

## Evidence and response boundary

`reviewEvidence` resolves weekly and context fact IDs to exact workouts, exercise exposures, body measurements, wellbeing, self-reported movement checks and archived adherence. Shared sources are deduplicated; conflicting IDs or dangling references fail closed. The evidence screen shows calculation methods, date scope, unit conventions, actual/legacy set distinctions and links to underlying source records. Photo manifests have no pixels and are not registered as evidence for visual claims.

Runtime validation checks the envelope, expected provider identity/mode, response version/request, enum values, bounded strings/lists, unique claim IDs, qualitative confidence with reason, limitations/alternatives, and available referenced evidence. FACT claims must reference exactly one non-null app fact with sources and reproduce its canonical metric/value/unit text and topic. Invented values, missing references and all plan-change proposals are rejected. Failed provider debug text is not displayed. Errors allow retry without modifying data.

All four claim types are supported and visibly labelled: FACT / OBSERVATION / HYPOTHESIS / RECOMMENDATION. Shape and reference validation does **not** prove that future interpretive prose is medically safe, causally correct or supported by its citations. That requires separate semantic evaluation before real providers. The only configured provider is the deterministic mock, marked prominently in entry point, screen, output and evidence view.

## State, privacy and compatibility

Reports are ephemeral screen state. Leaving/restarting clears the report, not source data; no report history/archive is claimed. Results bind to exact serialized input revisions. A period or relevant-data change hides old output and cancels in-flight work. Unmount cancels delivery; retry replaces the pending request. No automatic/background execution, plan mutation, photo reading or upload occurs.

Storage remains schema v17 and Data Vault v1. No migration is needed because no new persistent data is introduced. Existing snapshots and exports are untouched; review DTOs and mock prose are not backed up. APK20 retains the package identity/signing workflow used by APK19.

## Validation and limits

Full tests/typecheck/lint/export and CI are required before delivery. Added cases cover calendar boundaries/DST, real weekly and context data, evidence resolution/conflicts, null versus zero, malformed/provenance-mismatched outputs, invented numbers, unsupported claim types, unknown evidence, duplicate claims, plan proposals, empty reports, all four claim types, exception containment, cancellation, provider mutation and no-network execution. Existing APK18/19 measurement/storage/Vault regression tests remain in the full suite.

Physical-device checks remain pending: update over APK19, open Weekly Review offline, inspect a measurement source, move weeks/context, run and leave the mock view, rotate/background/return, and inspect large text/scrolling. No physical-device verification is claimed from unit tests or export.

## Next proposal — not started

A bounded provider-selection/benchmark package using the existing v2 fixtures and this runtime validator: agree permitted data, provider candidate and spend limit, then evaluate quality before the first production adapter. A paid request or real-provider integration needs explicit authorization. No Coach or physique/video analysis is implied.
