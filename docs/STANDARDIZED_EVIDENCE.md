# Standardized evidence: implementation checkpoint

Audit of PR #41 source on 2026-09-16. This is the next milestone, not functionality delivered in versionCode 16.

## Existing behavior

- `PostureArchiveScreen` captures front, unspecified side and back via the system camera/library. It provides repeatable-setup guidance, local-only storage, permission errors and interrupted-picker recovery.
- `posturePhotos.ts` copies all three files into the installation's archive. Photos carry dimensions, source and a timestamp assigned when the record is sealed. For library imports, that timestamp is not proof of the original capture date.
- `postureArchive.ts` links records to an active arc and compares the latest two records by time. It does not evaluate photographic comparability.
- `arcReview.ts` selects arc photos by chronology. A scan has no explicit movement-assessment ID. Existing reports summarize movement, adherence and readiness but do not establish that a photo and test were recorded together.
- Data Vault export, validation and restore iterate the fixed three-view list. Adding new views requires coordinated migration and preservation of legacy backups, not just a UI change.

## Next bounded implementation

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

Before implementation, inspect live git/HANDOFF state and carry the PR #41 delivery evidence forward. Do not start another native release until versionCode 16 verification is complete.
