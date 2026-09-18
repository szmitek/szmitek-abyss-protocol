# Weekly Review benchmark preparation checkpoint

2026-09-18. Based on main `71fc997` / PR45. Developer tools only; mobile application remains mock-only.

See [the complete setup, case matrix, cost policy and future live command](../tools/weekly-review-benchmark/README.md).

Verified locally:
- Full regression suite: 231 tests passed (222 existing + 9 benchmark tests).
- TypeScript and ESLint passed.
- Full dry-run: W01–W08 medium, W01/W03/W07/W08 high, three repetitions each: **36/36 response validations passed**.
- Dry-run scoring reports **not_evaluated** for both configurations; no model quality claim.
- Actual external inference requests: **0**. API cost: **0**.
- No Android build/export, native version increment, APK or release is needed for this developer-only package.

The dry-run exercises request serialization, exact raw response persistence, production validation, evidence resolution, per-run metadata and scoring templates. Tests trap network access and verify no secret reaches result files. Negative fixture mutations are preserved. Structure success is not semantic correctness; human assessments remain pending/null.

CLI defaults to no execution unless a mode is supplied. Live additionally requires environment key, explicit paid opt-in, FX and per-run/session limits. The local persistent monthly ledger applies only to this checkout, not OpenAI account billing. A first authorized screening may stop early at the budget limit; no automatic increase or retry exists.

Future work, not started: authorize actual spending, configure account/credentials, run the first 12-request screening matrix within limits, assess original outputs, and only then decide repeat testing and production adapter work. No Luna, Coach, Vision or model routing implementation is included.
