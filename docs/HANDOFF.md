# Batch checkpoint

Base: `841b6f2daba67b1b050bab7d39f9e044578c3c79` (Player UX, PR #35, APK published and digest verified).
Branch: `fix/android-lifecycle`.
Scope: interrupted workout checkpoint, calendar refresh, duplicate action guards, camera permission and pending picker handling.

Implementation complete. Local checks: 122 tests, TypeScript, ESLint, Android export, diff checks and React component review. Physical-device interactions were not tested in this environment. See `docs/ANDROID_VERIFICATION.md` for exact behavior, limitations and remaining device checks.

Delivered:
- Explicit Resume after load/recovery, background, Android focus loss and Back.
- Confirmed sets survive storage reload; incomplete timers restart. No background set is auto-completed.
- Foreground midnight refresh and day/safety gates on resume, set completion, substitution and final completion.
- Duplicate/stale set callbacks rejected; completion requires all sets.
- Camera denial opens settings; image library no longer requires upfront broad permission.
- Shared busy guard, draft-discard protection, scoped camera/library result recovery and handled cleanup errors.

Snapshot schema stays v11; backup format stays v1; Android versionCode is 11. No new dependencies. Session duration is still elapsed wall-clock time including same-day pauses. A prior-day session must be closed; it cannot earn rewards after midnight. Unsealed photo drafts are not fully persisted across process death.

## Resume / delivery verification

1. Inspect git and the PR whose head is `fix/android-lifecycle` in `szmitek/szmitek-abyss-protocol`. PR/Actions are the source of publication status.
2. If open, require green checks on the exact head, then merge. User already authorized commits, PRs, merge and APK publication.
3. If merged, inspect Quality and Android Preview APK runs for the merge SHA. Do not duplicate the PR.
4. Verify release `v0.1.0-preview.4`: target commit, new APK timestamp, size and SHA-256 against its workflow artifact.
5. After delivery, retain the unperformed device checklist and move to the required exercise-animation milestone.

Next bounded package: animation approach/prototype for squat, lunge, push-up, plank and mobility. Validate movement teaching value and Android performance before expanding the catalog. English UI and approved Player identity remain required; Polish translation is canceled.
