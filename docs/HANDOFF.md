# Batch checkpoint

Base: `8eaf87554f6862d14867d8643eca73e8230e17ec` (trainer follow-through, PR #33, APK published and verified).
Branch: `feature/data-vault`.
Scope: portable backup/import, optional private photos, pre-import recovery and reliable local persistence.

Implementation complete. Local checks passed: 106 tests, TypeScript, ESLint, Android export, diff checks and React component review. No physical-device interaction test was available in this environment.

Delivered code: Data Vault file export and validated preview/import, optional embedded photos with fresh private restore paths, one pre-import recovery slot, serialized autosaves, visible save retry and non-destructive load failure handling. Snapshot schema remains v11; backup format is v1. Android version code: 9.

## Resume / delivery verification

1. Inspect git and the PR whose head is `feature/data-vault` in `szmitek/szmitek-abyss-protocol`. The PR and Actions are the source of current publication status; this file intentionally does not predict their result.
2. If open, inspect all checks on the exact head; resolve failures before merging. Commits, merge and APK publication already have user approval.
3. If merged, inspect Quality and Android Preview APK runs for the merge SHA. Do not recreate the PR.
4. Verify release `v0.1.0-preview.4`: target commit, newly uploaded `Abyss-Protocol-preview.apk`, asset timestamp and digest against the run artifact. Do not label the previous asset as this batch's build.
5. Only after publication is verified, start the next bounded batch.

Phone follow-up: export data-only and photo-inclusive files through the native share sheet; check the destination file; select/cancel/preview an import; replace and restart; inspect photos and archived links; restore the pre-import local save; verify error/retry behavior under storage pressure. Update over the installed app to retain private data. Files are not encrypted; limits are 24 MB per backup and 6 MB per photo. Old private files are retained for recovery; automatic orphan cleanup is deferred.

Next batch: UX (prefilled readiness editing, phone ergonomics, readable text and splash screen), then Android stabilization. Exercise animations remain a required later milestone; app language stays English. See `docs/ROADMAP.md` for the accepted order and interruption strategy.
