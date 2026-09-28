# First text Arc Review pilot — prepared, NOT authorized or executed

Prepared 2026-09-28 from main d763e13fc22de014307d359fc890c74a76097930 (PR50).
This is one synthetic A01 arc, not the user's personal data, and not W01–W08.
Application, provider implementation, storage and APK21 are unchanged.

## Fixed scope

- Model `gpt-6-astra`, medium, Standard (`service_tier: default`).
- A01 only, one request, one attempt, no retries, no model fallback.
- 4096 total output tokens including reasoning; stateless, store:false, no tools.
- Existing `progress-review.v1` schema, production validator and evidence registry.
- `arc-review.offline.v1` prompt and compact evidence transport from PR50 unchanged.
- Exact serialized request SHA256:
  `998eff3aedcdf87551ef62eb9beb4749c6cef855df8e296460796a9cfe32bdf2`.
- Changed fixtures, prompt or schema fail before reservation/network. Review and
  explicitly refreeze a changed experiment rather than silently accepting drift.
- No photos, high, Sol/Luna, Coach, personal-data upload or production integration.

The shared developer harness retains verbatim raw output, request/input hashes,
usage including reasoning/cache writes, timestamps, latency, completion status,
validation, measured cost and unfilled human scoring. A dry-run is NOT evidence
of model quality. One successful live A01 would not certify the adversarial suite
or establish repeatability.

## Cost and remaining budget

Official Astra documentation checked 2026-09-28:
https://developers.openai.com/api/docs/models/gpt-6-astra
Short-context Standard USD per million tokens: normal input 10, cache write 12.5,
cache read 1, output 50. Existing recorded rates match, so historical accounting
is not rewritten. FX is explicitly **4 PLN/USD**, a configuration, not a market quote.

The frozen request reserves 3.5963 PLN = 0.899075 USD using the shared conservative
UTF-8-byte input ceiling plus framing, all input at cache-write price, and full
4096 output. Proposed per-request AND session cap: **3.60 PLN = 0.90 USD**.
This is not predicted consumption or provider billing control. No assumed cache
hits, hidden discounts, budget increases or output-cap reductions. Actual price
must be calculated from returned usage; unknown accounting retains the reserve.
Check rates again before authorization if time has passed.

Read-only durable September journal audit on 2026-09-28:

| Run | Accounted PLN | Status |
|---|---:|---|
| 35350911495 | 1.533720 | Previously authorized reconciliation |
| 35405822761 | 0.607808 | Previously authorized reconciliation |
| 35409997843 | 1.800000 | Unreconciled reserve; prior reported usage cost 0.565848 |
| 35410105222 | 4.400000 | Unreconciled reserve; prior reported usage cost 1.200420 |
| Total | 8.341528 | Only 1.658472 remains under the unchanged 10 PLN monthly cap |

**A01 is currently budget-blocked for September.** No journal was changed.
If the user separately authorizes reconciliation, first reverify the exact raw
usage artifacts and journal head, then record an auditable reconciliation.
At the previously reported usage that would yield 3.907796 PLN accounted and
6.092204 PLN remaining. Do not interpret this document as approval to refund
4.433732 PLN, increase caps, or shift the accounting month to bypass this stop.
The 5 PLN Astra soft policy and 10 PLN project hard policy stay unchanged.

## Offline verification

No key or HTTP needed; run from repository root:

```sh
node --experimental-strip-types tools/arc-review-benchmark/a01.ts --dry-run
node --experimental-strip-types tools/arc-review-benchmark/prepare.ts .benchmark-results/arc-dry-NEW
```

The first runs the exact shared execution/recording/validation path for A01.
The second validates all ten offline fixtures. Both block HTTP at the CLI entry.
Use a new directory for the second. Reports carry NOT MODEL OUTPUT labels,
null usage/quality/stability and zero actual cost. Environment keys are unnecessary
and not accessed in dry-run. Negative fixtures are not repaired.

## Quality review after the separately authorized request

Score every existing evidence/reasoning dimension, plus domain completeness and
practical usefulness, 0–4. Each must be at least 3. Use the separate domains map
to inspect execution versus logged targets, comparable performance, effort,
wellbeing, measurements, subjective movement checks and a useful next-arc priority
or targeted question. Missing data must remain missing. A01 is a nominal four-week
window without a completed reassessment: do not call it a reassessed completed arc.

Require valid unmodified output and zero unsupported claims. Critical violations
disqualify: invented diagnosis/body composition/photo observation, unsupported
plan/load change or factual fabrication. Do not require a forced exercise change
or a RECOMMENDATION label when a well-grounded question is the useful outcome.
The template is for human review; structural validation does not prove semantics.
Leave stability untested after one response. The older global weekly score tool
is not an Arc A01 pass/fail gate; apply this per-case rubric.

## Exact next action — only AFTER explicit approval

1. Review/merge this preparation PR; no benchmark dispatch happens on merge.
2. Resolve the budget block by separately authorized reconciliation (reverify
   source usage first), or use the genuine current-month remaining budget later.
   Do not increase or reset a limit silently.
3. Confirm the environment secret is still valid. Its earlier 30-day expiry may
   require the owner to rotate it later; no API probe was made here.
4. Obtain explicit approval for **one A01, Astra medium, maximum 3.60 PLN,
   no retry**. Reconciliation and paid execution are separate permissions.
5. GitHub → repository → Actions → **Arc Review - A01 text pilot** → Run workflow
   → branch `main` → `allow_paid=YES`. Do not use old weekly workflows.
   `NO` is the default and executes only the credential-free dry-run.
6. The paid job uses `rpgfitness-benchmark` and `OPENAI_API_KEY`; no key is an input.
   Shared concurrency and durable budget reservation precede the model request.
   A failed or repeated run must not be retried automatically.
7. Download `arc-review-a01-<run>-1`, review raw output/usage and every evidence
   claim, then STOP. Report the result and actual cost before any further experiment.

No workflow dispatch, secret read, paid permission, API request, reconciliation
or cap change is performed by this preparation package. New model cost: **0 PLN**.
