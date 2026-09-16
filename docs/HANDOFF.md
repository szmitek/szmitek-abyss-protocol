# Batch checkpoint

## Current package — milestone 4 completion

Branch `feature/longitudinal-evidence`, based on PR #42 main `e2bfcc866639f5c7cee86edcc34548321d7a1cc2`, carries verified APK17 documents forward. Android versionCode 18, schema remains 16. `LONGITUDINAL_EVIDENCE.md` records the implemented read-only comparison flow and device checks.

187 tests, TypeScript, lint and telemetry-disabled offline Android export pass; eight new comparison tests also pass under Europe/Warsaw. Native delivery still requires the checks below before claiming APK18 published. Create one PR from the exact reviewed tree, wait for green CI, merge and verify artifact/release digests, manifest and certificate. Inspect live GitHub before resuming to avoid duplicate publication.

USER PAUSE: finish milestone 4, then stop. Do not begin milestone 5 AI research/implementation/provider selection. The user wants to discuss that approach separately. This supersedes the earlier general instruction to continue the full roadmap. Code/PR/merge/APK publication authorization remains in effect for this package.

## Delivered source and verified APK — PR #42 (2026-09-16)

PR https://github.com/szmitek/szmitek-abyss-protocol/pull/42 merged at `e2bfcc866639f5c7cee86edcc34548321d7a1cc2`. Reviewed head `c79dac5aac966118c0bd83446d96c23e395dfa5a`; local/published/merged tree `e1a61fff032d2a0dc9eab48704c3c73b2018dfac` is identical. Android versionCode 17, schema 16. See `docs/STANDARDIZED_EVIDENCE.md` for behavior and phone checks.

179 tests, TypeScript, ESLint and telemetry-disabled offline Android export pass; seven evidence tests pass under Europe/Warsaw. PR Quality `35093692447` passed before merge. Main Quality run `35093830147` and native Android run `35093830233` both succeeded for the exact merged head.

APK verification completed:

- Artifact `10445114722` belongs to native run `35093830233` and merged SHA `e2bfcc866639f5c7cee86edcc34548321d7a1cc2`.
- Downloaded ZIP SHA256 matches its artifact digest: `da2f67b5403858af01f67eac5eb1edb76fa1b7fe418f6a8e251fead49656fa9f`.
- Extracted APK SHA256 matches release asset `567904564`: `19b6ee44207c72c81b7ee053fb523e95aa4482bda5dc62954638d32e0ddb7247` (80,258,176 bytes).
- Binary manifest reports versionCode 17 and package `app.abyssprotocol.mobile`.
- Certificate SHA256 remains `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, matching APK 16. The focused verifier passed the v2 RSA signature and chunked content digest checks.
- Published APK: https://github.com/szmitek/szmitek-abyss-protocol/releases/download/v0.1.0-preview.4/Abyss-Protocol-preview.apk

This batch is delivered. Physical-device installation, capture, cancellation, large fonts and restore remain unperformed. The reused release tag/URL is not source evidence; retain the exact head/run/asset/digests above. Do not duplicate PR #42. This final checkpoint is persisted on `docs/evidence-delivery`; carry it into the next feature branch.

Next implementation is specified in `docs/LONGITUDINAL_EVIDENCE.md`: linked movement/photos, archived adherence targets, actual readiness coverage and missing-data context. AI analysis/coach remain later; animations LAST.

## Delivered source and verified APK — PR #41 (2026-09-16)

The user explicitly confirmed public publication of code/documentation to `szmitek/szmitek-abyss-protocol`, PR creation, merge after green CI and APK publication, including subsequent roadmap batches. The automatic review block is resolved.

PR https://github.com/szmitek/szmitek-abyss-protocol/pull/41 is merged at `1fd69cd35304c24731662c4a824f97b6a7fe9009`. Reviewed head `b7c58863dd8d0e4d60ab80fdebb55b2fc1f101ce`; local/published/merged tree `5766cd1b0448a35d3ec07f7da8aa9f5e2f3e8508` is identical. Android versionCode 16, storage schema 15. Explicit return-plan activation, capped work, tagged history and an enduring progression boundary are described in `docs/RETURN_AFTER_BREAK.md`.

172 local tests pass, including eleven new return tests and a Europe/Warsaw run. TypeScript, lint and offline Android export pass. Local export disabled Expo telemetry/network requests; both CI workflows disable telemetry. PR Quality `35074854516` passed before merge; main Quality `35075014427` and native Android run `35075014501` succeeded.

APK verification:

- Artifact `10438496070` belongs to native run `35075014501` and exact merged head `1fd69cd35304c24731662c4a824f97b6a7fe9009`.
- Downloaded ZIP SHA256 matches the artifact digest: `5cb941c485edef99fac9aa22ab2070e52893fa2161084827b37d0f5858640de4`.
- Extracted APK SHA256 matches published release asset `567566370`: `80812992ded5c2caea177179050134cdc3aed0c8c812e353d9d8510b9eba7387` (80,249,392 bytes).
- Binary manifest: versionCode 16; package `app.abyssprotocol.mobile`.
- Certificate SHA256 remains `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, matching verified APK 15. The focused local verifier passed the v2 RSA signature and chunked content digest checks.
- Published APK: https://github.com/szmitek/szmitek-abyss-protocol/releases/download/v0.1.0-preview.4/Abyss-Protocol-preview.apk

Delivery is complete. Do not duplicate PR #41. Physical-device upgrade, return-plan walkthrough, resume, large fonts and Vault restore remain unperformed; artifact verification is not an installation test. The release URL/tag is reused, so retain exact run, head, asset and digest evidence.

Next: milestone 4 standardized evidence. `docs/STANDARDIZED_EVIDENCE.md` records the source audit and next bounded implementation: preserve legacy unspecified-side photos, introduce a versioned four-view protocol, explicit setup review and actual movement-assessment links with compatible Vault iteration. This is a plan, not shipped capture functionality. AI analysis/coach remain later; animations LAST.

This delivery checkpoint and audit are persisted on `docs/return-delivery`. Read it and inspect live git/GitHub before continuing, carrying these documents into the next feature branch.

## Delivered source and verified APK — PR #40

PR https://github.com/szmitek/szmitek-abyss-protocol/pull/40 is merged. Reviewed head `3cce2d7c31c39b76b404b90f5032778b1bdd72a4`; merged main `04763f619dfda9685b8b00acc86d66d583d5b037`; reviewed/published/merged tree `ee8e346fe57dca7625ce22aeadb70ac33f216628` (identical). Android versionCode 15; storage schema remains 14. Changes share the planner's arc-anchored dates with next-session displays and distinguish missed, protected, completed, other-protocol and open sessions. No catch-up volume, reward changes or new stored fields. See `docs/WEEKLY_SESSION_STATUS.md`.

PR Quality run `35019022508` passed before merge: 161 tests, TypeScript, ESLint and Android export. Local checks also passed, including the nine new date/status tests under Europe/Warsaw. Main Android APK run `35019155229` and Quality run `35019155278` both completed successfully.

APK publication verified on 2026-09-15:

- Artifact `10417436300` belongs to run `35019155229` and exact merged SHA `04763f619dfda9685b8b00acc86d66d583d5b037`.
- Downloaded ZIP SHA256 matches its artifact digest: `5e388c9cc114ba985678d4152b781168d750cad76527555d05784c2b6d46b3b0`.
- Extracted APK SHA256 matches published release asset `566457814`: `dfe53aa8fbdb6875b577983d3b7ed1aa605fef7e3e6551bcfa0e25bede9d6e17` (80,239,628 bytes).
- Binary manifest: versionCode 15 and package `app.abyssprotocol.mobile`. Prior verified version is 14; storage schema stays 14.
- Certificate SHA256 remains `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. The local focused check verified the v2 RSA signature and chunked content digest, as it did for the prior APK. Physical installation is not verified.
- Published APK: https://github.com/szmitek/szmitek-abyss-protocol/releases/download/v0.1.0-preview.4/Abyss-Protocol-preview.apk

This delivery is complete. Do not duplicate PR #40. Phone upgrade, large-font layout and the flows in `docs/WEEKLY_SESSION_STATUS.md` remain unperformed. The preview URL is reused; retain the exact commit, run, asset ID and digest when verifying future deliveries.

Next after this package: the user-controlled return-after-interruption policy in `docs/RETURN_AFTER_BREAK.md` and its interactions with evidence, active sessions, arc transitions and backup compatibility. The older audit below records the original date mismatch; PR #40 fixes it. AI analysis/coach remain later in the roadmap, animations LAST.

## Delivered source and verified APK — PR #39

PR https://github.com/szmitek/szmitek-abyss-protocol/pull/39 is merged. Reviewed head `f474bf697367bbe96ebe514d1c85c42c0e68b4b6`; merged main `7d821bd9c66662582c2c46fb7176d30a743a413b`; local, published and merged tree `2a5c6d5fbc06badab951c27402b821ad931f17d5` match. PR Quality run `34988236396` passed before merge: 152 tests, TypeScript, ESLint and Android export. See `docs/WARMUP_PROGRESSION.md` for behavior and unperformed phone checks. Schema/versionCode 14. No new dependencies, paid services, photo uploads or AI providers.

Main Quality run `34988388144` and Android APK run `34988388325` both completed successfully for the merged SHA above. APK publication was verified on 2026-09-15:

- Artifact `10404539359` belongs to run `34988388325` and exact main SHA `7d821bd9c66662582c2c46fb7176d30a743a413b`.
- Downloaded artifact ZIP SHA256 matches GitHub's digest: `7ad10907b56fd338c68bb7161e6b95792f97afabd4ec77636c060395da36c413`.
- Extracted APK SHA256 matches published release asset `565978930`: `b17346e496faaa0905acc803b32950d214a65aa3e4fb64b662cd05c792409e5c` (80,237,524 bytes).
- Binary manifest: versionCode 14, package `app.abyssprotocol.mobile`; previous verified APK has versionCode 13 and the same package.
- Signing certificate remains `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. A focused local check verified the v2 RSA signature over signed-data and the SHA256 chunked content digest in both the old and new APK, following the Android v2 format: https://source.android.com/docs/security/features/apksigning/v2 . This is not Android installation validation or a physical-device test.
- Published APK: https://github.com/szmitek/szmitek-abyss-protocol/releases/download/v0.1.0-preview.4/Abyss-Protocol-preview.apk

This package is complete; do not duplicate PR #39 or republish an older APK. The preview URL is reused, so retain the commit, workflow, asset ID and digest above when checking future deliveries. Phone upgrade/resume/keyboard and the flows in `docs/WARMUP_PROGRESSION.md` remain unperformed.

After this package, continue milestone 3 (long-term programming). The code audit in `docs/LONG_TERM_PROGRAMMING.md` identifies existing A/B/C, reduced-volume and arc-transition behavior plus gaps in missed-session handling, next-session dates and return after interruption. Standardized evidence and AI analysis remain in the full roadmap; animations stay LAST.

The date mismatch was reproduced with the real domain functions: for a Tuesday-start arc, the week beginning 2026-09-08 contains A on September 8, B on September 10 and C on September 12. On September 9 the display helper predicts September 11 while the next locked session is September 10. With no completed sessions, September 10 still selects B. These are next-package findings, not fixes included in version 14.

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
