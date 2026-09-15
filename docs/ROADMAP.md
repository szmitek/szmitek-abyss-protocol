# Delivery roadmap

## Working agreement

- Ship bounded, usable batches. Budget includes implementation, review, CI, merge and the native APK build.
- Remaining account usage is not visible to the agent; no duration or uninterrupted session is guaranteed.
- Keep verified checkpoints in git and publish a recoverable feature branch before waiting on CI. Never leave the only copy in chat.
- Merge only the reviewed PR head after all required checks pass. Verify the release asset against the merged commit.
- If interrupted, read this file and `docs/HANDOFF.md`, inspect git and GitHub state, then resume the recorded step. Do not duplicate a PR or publish an older APK as new.
- Commits, PRs, merges and APK publication are authorized by the user.
- App language stays English. Polish translation is removed from the roadmap.
- Exercise animations are a required later milestone, not canceled.

## Completed: Progress 2.0 (PR #32)

- Eight-week activity and completed-set charts with separate repetition/seconds totals.
- Searchable exercise archive with every recorded exposure, targets and volume.
- Reopen archived cycle reports and compare the latest two completed cycles.
- Capture the original cycle frequency; label missing historical targets as estimates.
- Record confirmed corrective-profile changes and explain accumulated attribute points.
- Preserve existing profiles and history through migration v10.

## Accepted full-product roadmap (2026-09-14)

The complete product includes photo/test analysis and an adaptive AI coach. These are not silently removed from scope. Exercise animations move to the last milestone. The first working implementation of AI must be evaluated before final polish so quality and cost are known early. The base trainer must continue without AI or a connection.

Completed foundations: trainer follow-through (#33), Data Vault (#34), Player UX (#35), Android lifecycle (#36). Physical-device checks in `ANDROID_VERIFICATION.md` remain unperformed until verified on a device.

1. Unified Player profile: goals, time, experience, equipment, limitations, symptom history, tests, photos and revision history.
2. Home and gym training: implement-specific exercise catalog, actual reps/seconds, external load and set effort; progression, substitutions and home/gym loadouts.
   - Delivered #37: 12 loaded exercises, explicit gear requirements, actual set records, load review guidance, history and compatible migration/backups.
   - Delivered #38: HOME/GYM loadouts, explicit machine/configuration registry, same-machine historical kg context, retained set identities and compatible v13 storage/Vault migration.
   - Delivered source #39: optional warm-up records separated from work/RPG totals, explicit per-session load-increase review, confirmed target reset and v14 migration/Vault compatibility. See `docs/WARMUP_PROGRESSION.md` and `docs/HANDOFF.md` for APK verification status.
   - Remaining: broader catalog and optional additional locations. Future starting kilograms are never automatically selected.
3. Long-term programming: A/B/C objectives, weekly work/recovery distribution, missed sessions, return after interruption, lower-load periods and transitions between arcs. Readiness adapts the existing contract.
4. Standardized evidence: comparable photo capture, quality checks, left/right side views, synchronized movement tests and longitudinal comparison of adherence, symptoms and function.
5. AI Player analysis: prototype photo + test + history observations; uncertainty, source evidence, missing-data questions and proposed training priorities. No diagnosis inferred from a photo. Evaluate accuracy, privacy, execution location and a zero/low-cost budget before choosing a provider. No provider subscription or photo upload is authorized by this roadmap alone.
6. Adaptive plan and AI coach: explain and propose changes using actual performance, readiness and reassessment. Deterministic equipment, safety and movement constraints validate every proposed change; record decisions and keep user control.
7. Progress and RPG: load and exercise development, cycle comparisons, Player card, titles, achievements, adherence including planned recovery, meaningful rank trials.
8. Reliability and ergonomics: full multi-cycle phone walkthrough, backup/restore/deletion, consent and control for photo analysis, offline behavior and final usability corrections.
9. Exercise animations LAST: settle catalog and exercise flow first; source/licensing, blue/purple muscle highlighting, looping during recovery/exercise, lifecycle/performance checks and full catalog coverage.

Optional later extensions: second profile, cloud sync, social features, wearables and automated video analysis. English only; Polish translation is canceled.

## Animation research checkpoint

No purchased or third-party sample animations are in the APK/repository. MoveKit and Exercise Animatic are possible paid sources; the latter listed individual clips at USD 1 when checked on 2026-09-13. GitHub dataset `hasaneyldrm/exercises-dataset` does not itself grant a license to reuse Gym Visual media in the app. Blender/MPFB/Mixamo remains an unproven pilot route; no suitable animation has been selected or downloaded from Mixamo. Resume animation evaluation only at milestone 9 unless the user changes priority.
