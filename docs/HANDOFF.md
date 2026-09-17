# Current checkpoint — Weekly Review implemented, APK20 verified, release upload blocked

PR #45 merged as `71fc99759d656ef8acc1eb2eeae5426636d6daf7`. Reviewed PR head `397f698a7ea476584323c32ca175aecfc2d0c959`; local/source/merged tree `42b48b550027fa9762c93b8f35c0504938f109cf`. Local implementation commit `1b842a331d5bf4fdd1933c08c6b719a267982f02` has the same tree.

Implemented: English Weekly Review under Progress for completed weeks with separate four-week context; real local facts, coverage and evidence navigation; runtime validation including canonical FACT numbers/topic; mock-only injected provider execution; cancellation/stale-result handling. Reports remain ephemeral, storage v17 unchanged. No real AI/API, keys, paid benchmark, proxy, photo analysis, Coach or plan mutation. See `LOCAL_WEEKLY_REVIEW.md`.

## Verification and outstanding release publication

- 222 tests, TypeScript, lint and offline Android export passed locally.
- PR Quality `35240094903` passed for the reviewed head. Main Quality `35267696764` passed for exact merged main.
- Native Android run `35267696782` successfully compiled and uploaded the Actions artifact in attempts 1 and 2. The workflow is RED solely because `Publish preview release` failed both times. Each phase used a single bounded watcher, not model-driven status polling.
- Attempt 1: GitHub server error during release asset upload (Unicorn HTML). Attempt 2: `Error creating asset temp dir`. No application code fix is indicated. Do not repeatedly rebuild to retry a release-server failure.
- The reused release target points to main, but its assets list is EMPTY as checked after attempt 2. The previous APK19 asset was deleted by the existing replacement workflow before upload failed. Do not advertise the usual release URL as an APK20 download.
- Verified attempt-2 artifact: `10518343459`, exact workflow/main SHA. ZIP size 36,863,251 bytes; SHA-256 `3a47a9a97fc3dd26adb08a490f39744fc1db2999405dba99721fe3b3451d25e8`.
- Extracted APK: 80,320,868 bytes; SHA-256 `5cb195997cd87d13a0c2e22857ca6b195d0188da520c0c04516f51b59bd16fde`.
- Binary manifest versionCode **20**, package `app.abyssprotocol.mobile`. APK v2 RSA signature and chunked content digest verified.
- Certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, independently compared with preserved APK19; identical.
- Artifact: https://github.com/szmitek/szmitek-abyss-protocol/actions/runs/35267696782/artifacts/10518343459 (expires 2026-10-01). A verified direct APK copy is provided with the delivery.
- Physical-device installation/form/Weekly Review walkthrough remains pending; see `ANDROID_VERIFICATION.md`.

## Resume boundary

Implementation and native artifact are complete; GitHub Release publication remains blocked by upload errors. Recover publication using the verified existing artifact when the service permits; avoid another full Android build solely for publishing. Do not mark release successful without comparing the uploaded asset digest to the verified APK. This documentation-only checkpoint is on `docs/weekly-review-delivery`; carry it into the next authorized branch.

Next proposed functional package: provider-selection/benchmark against existing v2 fixtures after jointly agreeing permitted data and budget. Not started; no real-provider calls are authorized by this checkpoint.

---

# Current checkpoint — Stage 5 data foundation delivered

PR #44 merged as `3582e9ed90ced6175efb4ab1d6bc15bf42a60a0a`. Reviewed head `9212a06e7e7c41866259ae5393265516fe1bec18`; local/source/merged tree `604b566e3ec21a99b2116bda77a9637fa3f4a599`. Local implementation commit `84eb46bc9688591a654c9c6c5d09b68220d7dfa7` has the same tree; publishing used the connected GitHub tools.

Implementation: English Body Measurements screen/history, optional kg/cm records with nulls, v17 local/Vault compatibility, deterministic measurement/review facts, application-owned AI contracts and an explicitly labelled offline mock. See `AI_DATA_FOUNDATION.md`. No real provider, SDK, network AI request, API secret, backend, photo/video analysis, pain coaching or automatic plan mutation.

## Verified delivery

- 207 tests, TypeScript, lint and telemetry-disabled offline Android export passed locally.
- PR Quality `35235649270` passed for the exact reviewed head before merge.
- Main Quality `35235810884` and native Android Preview `35235810863` succeeded for exact merged main SHA. Each phase used one bounded watcher; no manual workflow-status polling loop.
- Artifact `10503199720` belongs to native run `35235810863` and merged main. ZIP SHA-256: `4c458553db78fbdcd4bea42f372e7f8e26591c324fe0dd76cd51227a152de624`.
- Extracted APK SHA-256: `0c850307e733265fcf19eab11ec09f0665c0eb4e44d8ce00bd3a8b7260ea675e`, 80,287,380 bytes; matches GitHub release asset `570477414` digest and size. Release target is the exact merged commit.
- Binary manifest: versionCode **19**, package `app.abyssprotocol.mobile`.
- APK v2 RSA signature and chunked content digest verified. Signing certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, independently compared with the preserved APK18 file; identical.
- Download: https://github.com/szmitek/szmitek-abyss-protocol/releases/download/v0.1.0-preview.4/Abyss-Protocol-preview.apk
- Physical-device update/form walkthrough remains unperformed. Use an update over APK18 without uninstalling; `ANDROID_VERIFICATION.md` contains the new checklist.

This documentation-only checkpoint is published on `docs/stage5-foundation-delivery`; carry it into the next authorized feature branch. Do not trigger another APK for documentation alone or mistake the reused release URL for immutable provenance.

## Scope boundary / next package

The user authorized only this bounded package after Research & Architecture v2; it is complete. Next proposed package: offline Weekly Review UI/evidence navigation/coverage and runtime response validation using the mock. It is not started. Provider choice, cloud consent/key handling, paid benchmark and budget require a separate agreed task. Real AI remains explicitly out of scope.

---

# Batch checkpoint

## Milestone 4 delivered — verified APK 18 / PR #43 (2026-09-16)

PR https://github.com/szmitek/szmitek-abyss-protocol/pull/43 is merged at `d53b7dabfb1b164ffc51824ef5176f4ad79a9b40`. Reviewed head `d55452ce7048fe5320ed73bd664a01e3e1ad9912`; local/published/merged tree `e168d5e2fd6ccac0860c52e818731e2ab4f62318` is identical. Android versionCode 18, storage schema unchanged at 16.

Milestone 4 implementation is complete: PR #42 standardized capture; PR #43 adds the read-only longitudinal view of actual test pairs, linked photos, training/return/trial/warm-up context, readiness coverage and original archived targets. See `LONGITUDINAL_EVIDENCE.md` for full behavior and outstanding device checks.

187 tests, TypeScript, lint and telemetry-disabled offline Android export pass. Eight new longitudinal tests also pass under Europe/Warsaw. PR Quality `35147736676` passed before merge. Main Quality `35147859175` and Android Preview `35147859308` completed successfully for the exact merged head. Each CI phase used a single watcher rather than repeated model-driven status polling.

Verified APK delivery:

- Artifact `10468510779` belongs to native run `35147859308` and main SHA `d53b7dabfb1b164ffc51824ef5176f4ad79a9b40`.
- ZIP SHA256 matches its artifact digest: `0aeb8e7fbc350870941f741e82286f6b512e9465e82f898283060211f791bc8c`.
- Extracted APK matches published release asset `568770882`: SHA256 `9e09d954178cddb313df302294de6fdd6d0487572aa2d05418e0e2b6617f4e07`, size 80,275,528 bytes.
- Binary manifest: versionCode 18, package `app.abyssprotocol.mobile`.
- Certificate SHA256 remains `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, matching APK 17. The focused verifier passed the v2 RSA signature and chunked content digest checks.
- The initial download stopped at 32 MiB; fetching the remaining byte range completed the archive. Only the final matching digest was accepted.
- Download: https://github.com/szmitek/szmitek-abyss-protocol/releases/download/v0.1.0-preview.4/Abyss-Protocol-preview.apk

Milestone 4 implementation and release are complete. Do not duplicate PR #43. The preview tag/URL is reused; retain exact head/run/asset/digests. Physical installation, large-font layout, navigation and real photo rendering remain unverified on a device; code/CI checks do not replace that walkthrough. The final checkpoint is persisted on `docs/stage4-delivery`.

USER PAUSE: stop after completing this delivery. Do not begin milestone 5 AI research, implementation or provider selection. The user wants to discuss that approach separately. This supersedes earlier general roadmap continuation. Code/PR/merge/APK authorization remains in effect for this package.

The previous upload attempt failed because automatic approval review hit a usage limit; the later same-operation retry succeeded. No alternate endpoint or approval bypass was used.

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
