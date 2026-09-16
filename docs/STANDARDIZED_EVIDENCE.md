# Standardized evidence: implementation checkpoint

Implementation checkpoint: Android versionCode 17, storage schema 16. Publication state is recorded in HANDOFF.md.

## Implemented in this batch

- New records require front, left, right and back, plus three explicit setup confirmations. Replacing an image resets confirmation. Invalid image dimensions are refused; small images show a review hint, not an automated quality verdict.
- `four-view-v1` identifies new records. Legacy front/side/back records and their original files remain unchanged, with side explicitly unspecified. Comparisons show only matching known views; all original views remain available in a paged archive.
- Seal time is kept separately from optional approximate camera acquisition time. Library/recovered images have unknown original capture time. No EXIF inference, photo scoring or diagnostic analysis is performed.
- SEAL VISUAL RECORD saves photos alone. SEAL & RUN MOVEMENT CHECK links this exact record only when the subsequent test completes. Cancel/closing the app leaves it unlinked. Link creation requires a current-day, not-future, unlinked new-protocol record. Next-day completion gives a visible error and permits cancellation.
- New cycle reports reference photos linked to their actual baseline/final assessments. Historical reports are preserved. Deletion clears affected report references; missing photos suppress a stale availability claim in report rationale.
- Vault iterates each record's protocol. v11–v15 imports verify the original checksum before migration. Mixed three/four-view archives and assessment IDs survive photo restore; data-only exports clear photo records/references.
- 179 tests, TypeScript, lint and telemetry-disabled offline Android export pass. Seven new evidence tests also pass under Europe/Warsaw. No new dependencies, provider, upload or subscription.

Phone checks remain unperformed: upgrade from APK 16, all four camera/library slots, checkbox reset on replacement, permission denial/interrupted picker, cancellation of movement checks, mixed archive layout at large fonts, and Vault restore. Unit tests and export do not verify these device flows.

## Remaining milestone-4 work

The milestone-4 completion package implements the unified longitudinal evidence view described in `LONGITUDINAL_EVIDENCE.md`. No new body measurements are invented. Milestone 5 is paused by explicit user instruction pending discussion; animations remain last.

## Original source audit and acceptance scope

## Behavior before this batch

- `PostureArchiveScreen` captures front, unspecified side and back via the system camera/library. It provides repeatable-setup guidance, local-only storage, permission errors and interrupted-picker recovery.
- `posturePhotos.ts` copies all three files into the installation's archive. Photos carry dimensions, source and a timestamp assigned when the record is sealed. For library imports, that timestamp is not proof of the original capture date.
- `postureArchive.ts` links records to an active arc and compares the latest two records by time. It does not evaluate photographic comparability.
- `arcReview.ts` selects arc photos by chronology. A scan has no explicit movement-assessment ID. Existing reports summarize movement, adherence and readiness but do not establish that a photo and test were recorded together.
- Data Vault export, validation and restore iterate the fixed three-view list. Adding new views requires coordinated migration and preservation of legacy backups, not just a UI change.

## Accepted implementation scope

1. Introduce a versioned capture protocol with front, left, right and back for new records. Preserve legacy `side` as unspecified; never infer or duplicate it into both sides. Render mixed archives without claiming matching side views.
2. Add an explicit review before sealing: full-body framing, neutral stance, consistent camera position/distance and lighting. Distinguish user-confirmed setup from automatic technical checks. Image dimensions do not establish posture, sharpness or clinical validity.
3. Separate record/import time from known capture time. Do not assign today's date as the original capture date of a library image. Show missing dates and unconfirmed conditions as unknown.
4. Link an evidence checkpoint to the actual movement-assessment ID through the existing baseline/reassessment flow. Cancellation must not create a link. Older records remain unlinked rather than receiving guessed matches.
5. Compare matching available views and display protocol/date/setup differences. Preserve the original image; do not normalize or manipulate body shape. Explain when records cannot be compared directly.
6. Keep storage and processing local. No remote analysis, paid provider, upload or diagnosis is part of this batch. AI analysis remains the following milestone, animations remain last.

## Required verification

- Legacy three-view storage and v11–v15 Vault files retain original files and unspecified-side labels.
- New four-view records round-trip through Vault; photo counts, size limits, reference validation and restore remapping accommodate both protocols.
- Mixed old/new archives, missing or invalid views, mismatched photo labels and broken assessment links are handled explicitly.
- Deleting photos or making a data-only backup cannot leave a UI that claims unavailable photo evidence.
- Cancelled/failed capture, permission denial, picker interruption and failed persistence do not create partial sealed records or misleading links.
- Phone checks cover all views, long labels/large fonts, import dates, resume and upgrade. Automated domain tests cannot replace these checks.

Before continuing, inspect live git/HANDOFF state. Do not duplicate this batch or claim native APK verification before the recorded delivery checks complete.
