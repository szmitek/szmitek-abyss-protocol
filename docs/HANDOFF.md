# Batch checkpoint

Base: `15b8c5d1f4c5b9fe4d20e068779c2c7cf4872919` (Progress 2.0, PR #32, APK published and verified).
Branch: `feature/arc-follow-through`.
Scope: distinct next-cycle rules, persistent directive confirmation, current-cycle evidence and quest refresh.

Implementation complete. Local checks passed: 93 domain tests, TypeScript, ESLint, Android export, and React component review. No physical-device interaction test was available in this environment.

Delivered code: cycle policy shared by generator and UI, explicit recalibration confirmation, protected rebuilding, fresh mastery evidence, Rank Trial gating, cached-quest invalidation and duplicate daily completion protection. Migration v11 preserves existing data. Android version code: 8.

## Resume / delivery verification

1. Inspect git and the PR whose head is `feature/arc-follow-through` in `szmitek/szmitek-abyss-protocol`. The PR and Actions are the source of current publication status; this file intentionally does not predict their result.
2. If open, inspect all checks on the exact head; resolve failures before merging. Commits, merge and APK publication already have user approval.
3. If merged, inspect Quality and Android Preview APK runs for the merge SHA. Do not recreate the PR.
4. Verify release `v0.1.0-preview.4`: target commit, newly uploaded `Abyss-Protocol-preview.apk`, asset timestamp and digest against the run artifact. Do not label the previous asset as this batch's build.
5. Only after publication is verified, start the next bounded batch.

Phone follow-up: inspect the active directive on Dashboard and Quest Briefing; acknowledge a recalibration report and cancel the profile screen (training stays sealed); save retained priorities, reload and confirm the gate stays cleared; inspect Rank Trial requirements. Update over the installed app to retain private data.

Next batch: Data Vault. Exercise animations remain a required later milestone; app language stays English. See `docs/ROADMAP.md` for the accepted order and interruption strategy.
