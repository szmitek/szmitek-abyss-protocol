# Manual Astra medium pilot — not yet authorized to spend

The secret-only check passed. The first paid session completed W01 and stopped before W02; see [W01 post-mortem](../../docs/W01_POSTMORTEM.md). Further paid execution requires new explicit authorization. The API key remains an environment secret named `OPENAI_API_KEY` in `rpgfitness-benchmark`. No new user-managed credential is needed. GitHub's short-lived `GITHUB_TOKEN` authorizes budget writes only within this repository (technically `contents: write` is repository-wide, not branch-scoped).

## Scope and defaults

Workflow: `.github/workflows/weekly-review-benchmark.yml`, **Weekly Review - Astra medium pilot**. Only `workflow_dispatch` on `main`; no push/PR/schedule triggers. Default `allow_paid=NO` runs seven synthetic cases W02–W08 locally with `--cases=remaining --payload=compact`. No credentials, HTTP, model inference, or charge in that job. No dependencies are installed. The paid job is skipped.

After **separate explicit approval**, the same workflow can run at most seven sequential model calls (W02–W08, compact payload): Astra `medium`, one repetition. No high, Luna, retries, fallback or application integration. It may stop before completing all seven cases because worst-case reservation for the next call must fit the remaining session allowance.

Fixed reviewed configuration:

| Variable | Value | Meaning |
| --- | --- | --- |
| BENCH_ALLOW_PAID | workflow input, default NO | Must be explicitly YES for paid job |
| BENCH_MAX_RUN_PLN | 5 | Maximum estimated cost of one request |
| BENCH_MAX_SESSION_PLN | 5 | Maximum accounted cost of this whole session |
| BENCH_PLN_PER_USD | 4 | Accounting conversion assumption, not live FX |
| BENCH_MAX_OUTPUT_TOKENS | 4096 | Reasoning and visible output share the API output allowance |

Monthly policy: Astra soft allowance 5 PLN; hard allowance 10 PLN for this benchmark's Actions runs. These are application controls, not OpenAI billing controls. Other applications, local CLI runs, foreign workflows or account usage are outside this journal. The user's separately configured billing settings remain independent. Verify model ID availability, price assumptions and FX before authorizing another paid execution; a green dry-run cannot establish API access.

## Durable reservation

Branch `benchmark-budget`, file `budget.json`, schema:

```json
{"version":1,"reservations":[]}
```

Each authorized run appends `{runId, month, microPln}`. For the pilot, `microPln=5000000`. No key, personal information, prompt, response or token header belongs in this branch. GitHub reads/writes use a fixed repository and endpoint, with a blob-SHA compare-and-set. Missing/corrupt journal, conflict, unknown write outcome, insufficient budget or disallowed context **stops before any model call**. No initialization/reset/retry inside the runner.

This intentionally conservative first pilot **does not refund unused allowance automatically**. Reservations represent reserved allowance, not actual API spend. A cancelled runner therefore cannot lose its reservation. A rerun of the same Actions run ID is rejected even in a later month; start a separately approved new run instead. Existing monthly entries stay in the journal. UTC months are used. The harness stops starting requests when the UTC month changes. This is not provider invoice accounting.

The full-session reservation avoids an unreliable upload-artifact/cache ledger and avoids recovery infrastructure for per-request distributed accounting. At most two 5 PLN sessions fit a UTC month. A third is blocked. Do not delete the branch, reset the journal, or manually remove failed-run entries to get around the limit. Leave reservations intact for the pilot. Any future reconciliation must be explicitly reviewed against results and provider usage, including uncertain/cancelled requests; it is outside this package.

## User steps

**Safe verification now:** Actions → Weekly Review - Astra medium pilot → Run workflow → branch `main` → leave `allow_paid=NO` → Run workflow. This does not test the write permission of the budget branch or call OpenAI.

**Only after separate consent to spend up to 5 PLN:**

1. Review the exact main commit and configuration above, plus model/pricing availability.
2. Open Actions → Weekly Review - Astra medium pilot → Run workflow.
3. Select `main`; choose `allow_paid=YES`; run once.
4. When prompted, Review deployments → `rpgfitness-benchmark` → Approve and deploy. Do not disable protection to avoid this step.
5. When complete, download `weekly-review-medium-<run ID>-<attempt>` from that run's Artifacts. It contains raw synthetic responses, validation and unfilled human scoring. A partial/error run is preserved when possible. Never post the API key. Review semantic quality manually; structural validation alone is not a pass.

The current connector cannot dispatch workflows or approve deployments. User UI action remains necessary. Do not rerun a failed paid job automatically.

## Verification limits

Local tests cover reservations, replay/month/cap checks, missing and corrupt journals, compare-and-set conflicts, error sanitization and zero-network dry-run. GitHub Contents operations are tested with in-memory HTTP stubs, not a paid call. Actual Actions token permissions and environment protections are checked by GitHub at execution time; denial fails closed. No APK is needed because application code is unchanged.
