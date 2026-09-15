# Batch checkpoint

Base main: `aea06543e703e4098f8d03e656024527a5e08635` (PR #37, strength logging). Its APK was downloaded and verified against the workflow artifact and previous signing certificate.
Branch: `feature/training-loadouts`.

Current package: HOME/GYM equipment profiles, explicit machine/configuration identity, same-machine history context and v13 storage/Vault compatibility. See `docs/LOADOUTS.md` for behavior and physical-device checks. Full approved AI-inclusive roadmap remains in `docs/ROADMAP.md`; animations are LAST; English only.

Implementation and local validation complete: TypeScript, ESLint, 141 tests, Android export and React checklist (keyed set form, explicit save/cancel, selection clears weight, immutable machine records, accessible controls, keyboard tap handling). Physical-device verification remains outstanding.

## Recovery verification — 2026-09-15

- Recovered implementation commit: `20f1c03c88fb47a4cdbfcebdb0ca511405a9a778`; tree `d3b4c9124552b2981059579cd5ad52945dc2b31e`.
- Re-ran all 141 tests, TypeScript, ESLint, Android export and diff whitespace checks successfully. Reviewed loadout switching, strict equipment filtering, machine identity, historical comparison, set confirmation and v13/Vault compatibility.
- GitHub main is still `aea06543e703e4098f8d03e656024527a5e08635`. The branch list did not contain `feature/training-loadouts`; PR search for this branch returned no results. Do not assume previous file-upload reports mean the branch or PR exists.
- Publication authorization was explicitly renewed in the current chat on 2026-09-15: the user approved push to `szmitek/szmitek-abyss-protocol`, PR creation, merge after green CI, and APK publication for this and subsequent roadmap packages. The earlier approval-review block is resolved. Shell git has no GitHub credentials, so publication uses the connected GitHub tools.
- At this checkpoint the latest delivered APK remains PR #37. Inspect live PR/workflow state before resuming publication.

Prepared PR title: `feat: separate home and gym loadouts with machine identity`

Prepared PR description:

The trainer previously used one equipment list and could not distinguish different machines when reviewing recorded kilograms. This package adds independent HOME/GYM lists, an explicit active location and named machine/configuration records. Changing locations rebuilds upcoming plans while preserving completed work and preventing edits during an active workout.

Confirmed sets retain machine identity in history and backups, including after a setup is removed. Historical kg comparisons require the same identified setup; changing the selected machine clears entered weight. Registration alone does not grant equipment. Migration v13 preserves existing profiles and Android versionCode is 13.

Validation: 141 domain tests, TypeScript, ESLint and Android export pass. Physical Android interaction, keyboard/layout and update installation checks remain outstanding. Native APK build and release verification follow merge. Warm-up sets and explicit load progression remain the next bounded package; the complete AI-inclusive roadmap is in `docs/ROADMAP.md`.

Delivery sequence: publish feature branch/PR; require green checks on exact head; merge; verify the main APK asset against workflow artifact and previous certificate. User has authorized commits, PRs, merges and APK publication. If interrupted, inspect GitHub first to avoid duplicating already completed delivery steps.

Next bounded package: warm-up sets and explicit load progression, followed by standardized evidence and AI analysis prototype under the roadmap's privacy/cost constraints. No subscriptions or photo uploads have been performed.
