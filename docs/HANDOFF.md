# Batch checkpoint

## Current implementation — warm-ups and explicit load progression

Branch: `feature/warmup-load-progression`, based on main `94ca61bab4c949854449bd7927ced9cfbd4a94b2` with the PR #38 delivery documentation carried forward. Implementation is complete; 152 tests, TypeScript, ESLint and Android export pass. See `docs/WARMUP_PROGRESSION.md` for the behavior, scope and unperformed phone checks. Schema/versionCode 14. No new dependencies, paid services, photo uploads or AI providers.

Next delivery actions: publish the reviewed tree, create one PR, require green CI on its exact head, merge and verify the resulting main APK against workflow/release digests and the prior signing certificate below. At this checkpoint the latest published APK is still PR #38/versionCode 13. Inspect GitHub before resuming to avoid duplicate PRs.

After this package, continue milestone 3 (long-term programming): audit existing A/B/C and Training Arc behavior against missed sessions, return after interruption, reduced-load periods and arc transitions, then address the remaining gaps. Standardized evidence and AI analysis remain in the full roadmap; animations stay LAST.

## Delivered source — PR #38

- Repository: `szmitek/szmitek-abyss-protocol`.
- Merged main: `94ca61bab4c949854449bd7927ced9cfbd4a94b2`.
- PR: https://github.com/szmitek/szmitek-abyss-protocol/pull/38
- Reviewed feature head: `fb9aae70807a139036093710616e71b3558cc932`.
- Reviewed/published/merged tree: `c9a0bb4ecebd641c83423e2f62f1b798078b9f2d` (identical).
- PR Quality run `34955919212` passed before merge: 141 tests, TypeScript, ESLint and Android export. Local checks also passed.
- Main Android APK run: `34956087120`; main Quality run: `34956087085`.

Package: independent HOME/GYM equipment lists, explicit machine/configuration identity, same-machine historical kg context and v13 storage/Vault compatibility. See `docs/LOADOUTS.md` for behavior and physical-device checks. No automatically increased machine targets or kilograms.

## Verified APK publication — 2026-09-15

- Main Quality and native Android build both completed successfully for the merged commit above.
- Artifact `10391887001` belongs to Android run `34956087120` and that exact main commit. Downloaded ZIP SHA256 matches GitHub's artifact digest: `ece8615cd6d8982b253f259ccd1db9cf4ac9bed336cc697250f8d858c1d6c31b`.
- Extracted APK SHA256 matches published release asset `565451235`: `d516b9c0e13e70960eca9bca1b219dbf5d652c2b9cee0563d46e8049f8de78c8` (80,226,604 bytes).
- Binary Android manifest reports versionCode 13 (previous verified APK: 12).
- Signing certificate SHA256 is unchanged: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. The APK v2 RSA signature over signed-data was verified with the certificate's key. This is not a physical-device installation test.
- Release asset: https://github.com/szmitek/szmitek-abyss-protocol/releases/download/v0.1.0-preview.4/Abyss-Protocol-preview.apk
- The preview release URL is reused by subsequent deliveries. For future verification use the recorded commit, workflow, asset ID and digests; do not rely solely on the tag name.

Physical-device verification remains outstanding, including upgrade installation, keyboard/large-font layout, HOME/GYM switching, machine set selection, background/kill/resume and backup restore. Android export is not a native device test.

## Continuing constraints

Keep warm-ups separate from work sets, mastery and RPG rewards. Preserve equipment/readiness/movement restrictions, user control over kilograms, legacy records and Data Vault compatibility.

Continue the accepted full product roadmap in `docs/ROADMAP.md`, including long-term programming, standardized photo/test evidence and AI analysis/coach. English only. Animations are required and LAST. Base training remains usable offline without AI. No paid subscription or photo upload is authorized by the roadmap alone.

## Publication and recovery

The user explicitly renewed consent in the current chat on 2026-09-15 for push to this repository, PR creation, merge after green CI, and APK publication, including subsequent roadmap packages. The earlier automatic approval-review block was resolved. Shell git lacks GitHub credentials; connected GitHub tools successfully published the exact reviewed tree and merged PR #38.

The prior APK verification was also published on `docs/loadouts-delivery`; this feature branch carries that documentation forward. Inspect live git/GitHub state before resuming; do not duplicate PR #38 or publish an older APK as new. Keep reviewed checkpoints in git and publish a recoverable branch before waiting on CI.
