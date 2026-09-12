# Batch checkpoint

Base: `690e915dc2f916129e5ce7bc28381dfc50bd9db0` (Data Vault, PR #34, APK published and verified).
Branch: `feature/player-ux`.
Scope: same-day readiness editing, phone ergonomics and approved Player splash identity.

Implementation complete. Local checks passed: 112 tests, TypeScript, ESLint, Android export, Expo prebuild configuration and React component review. No physical-device interaction or screenshot test was available in this environment.

Delivered code:
- Readiness opens with today's saved values, including warning state and affected muscles; a new day starts blank.
- Changes stay in the draft until sync. Return and Android Back confirm discarding edits. Clearing a previously saved warning requires a deliberate correction confirmation.
- Store rejects a draft from another date or during an active workout. Errors leave the form open. Editing replaces today's entry; older signals and workout history remain intact.
- System dashboard always exposes a readiness entry point, including recovery/completed days.
- Larger text, 48-point muscle targets, all existing muscle groups, stacked choices on narrow screens/large fonts, wrapping button labels, and navigation with matching scroll clearance.
- Native Expo splash plugin uses the approved bundled icon on the existing dark background. The storage loading view carries the same Player identity. Native splash uses automatic hiding; no artificial delay or network dependency is added.

Snapshot schema remains v11; backup format remains v1. Android version code: 10. Only added dependency: `expo-splash-screen` (~57.0.8, lockfile 57.0.9).

## Resume / delivery verification

1. Inspect git and the PR whose head is `feature/player-ux` in `szmitek/szmitek-abyss-protocol`. The PR and Actions are the source of publication status; this file intentionally does not predict their result.
2. If open, inspect all checks on the exact head; fix failures before merging. Commits, merge and APK publication already have user approval.
3. If merged, inspect Quality and Android Preview APK runs for the merge SHA. Do not recreate the PR.
4. Verify release `v0.1.0-preview.4`: target commit and uploaded APK timestamp; compare asset size and SHA-256 with the run artifact.
5. Start the next bounded package only after publication is verified.

## Phone follow-up / next package

- Release cold launch and offline launch: approved Player splash, then restored profile or actionable storage error, without a blank screen or stuck splash.
- Readiness: edit/reopen, cancel/no changes, Android Back with changes, confirmation to clear a saved warning, old draft after midnight, and save retry banner.
- 320/360-point screens with normal and large system fonts: no clipped choices/buttons, all tabs readable and final content scrolls above navigation.
- Data Vault: native share destination, picker cancellation, import preview/replace/restart, photos and archived links, local recovery and storage-pressure errors. Backup files are not encrypted (24 MB total / 6 MB per photo).
- Android stabilization: upgrade without uninstalling or losing data, interrupted workout, midnight and offline behavior, camera permissions.

Exercise animations remain the required milestone after Android stabilization. App language stays English. See `docs/ROADMAP.md` for accepted order and interruption strategy.
