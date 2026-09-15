# Batch checkpoint

## Delivered source — PR #38

- Repository: `szmitek/szmitek-abyss-protocol`.
- Merged main: `94ca61bab4c949854449bd7927ced9cfbd4a94b2`.
- PR: https://github.com/szmitek/szmitek-abyss-protocol/pull/38
- Reviewed feature head: `fb9aae70807a139036093710616e71b3558cc932`.
- Reviewed/published/merged tree: `c9a0bb4ecebd641c83423e2f62f1b798078b9f2d` (identical).
- PR Quality run `34955919212` passed before merge: 141 tests, TypeScript, ESLint and Android export. Local checks also passed.
- Main Android APK run: `34956087120`; main Quality run: `34956087085`.

Package: independent HOME/GYM equipment lists, explicit machine/configuration identity, same-machine historical kg context and v13 storage/Vault compatibility. See `docs/LOADOUTS.md` for behavior and physical-device checks. No automatically increased machine targets or kilograms.

APK verification is pending at this checkpoint. Do not claim a new APK until the main workflow finishes and its artifact is checked against the published release asset and previous signing certificate. The previously verified APK is PR #37, SHA256 `6df6f2ef44eb06e6ef95bb5ecbda58304ee2e08c8566b5c5c290280f54e3fc66`; certificate SHA256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

Physical-device verification remains outstanding, including upgrade installation, keyboard/large-font layout, HOME/GYM switching, machine set selection, background/kill/resume and backup restore. Android export is not a native device test.

## Next bounded package

Warm-up sets and explicit user-controlled load progression. Keep warm-ups separate from work sets, mastery and RPG rewards; retain equipment/readiness/movement constraints and require an explicit choice before changing load. Preserve old measurements, active workouts and Data Vault compatibility. Do not infer starting kilograms or transfer machine loads across setups.

Continue the accepted full product roadmap in `docs/ROADMAP.md`, including long-term programming, standardized photo/test evidence and AI analysis/coach. English only. Animations are required and LAST. Base training remains usable offline without AI. No paid subscription or photo upload is authorized by the roadmap alone.

## Publication and recovery

The user explicitly renewed consent in the current chat on 2026-09-15 for push to this repository, PR creation, merge after green CI, and APK publication, including subsequent roadmap packages. The earlier automatic approval-review block was resolved. Shell git lacks GitHub credentials; connected GitHub tools successfully published the exact reviewed tree and merged PR #38.

This documentation checkpoint lives on `docs/loadouts-delivery`, based on the exact merged commit. Continue new implementation from current main and carry these updated documentation files forward. Inspect live git/GitHub state before resuming; do not duplicate PR #38 or publish an older APK as new. Keep reviewed checkpoints in git and publish a recoverable branch before waiting on CI.
