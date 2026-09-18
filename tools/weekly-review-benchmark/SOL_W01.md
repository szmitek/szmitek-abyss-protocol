# Sol W01 — one request, manually authorized

Workflow: **Weekly Review - Sol W01 only** (`weekly-review-sol-w01.yml`).
The workflow defaults to `allow_paid=NO`. This preparation does not authorize spending.

Fixed scope: gpt-5.6-sol, medium, W01 only, one repetition, 4096 total output tokens,
4 PLN/USD, maximum request/session allowance 2.10 PLN. No retry, high, other cases,
vision, coach or application integration. Re-running an Actions attempt is rejected.

The historical W01 request is reconstructed and checked against SHA256
`1a07e0113ba4a23875de647aa1544a2ea2a5b3c4e91141ff013ef627a19422c2` before changing only model.
This retains the original absence of explicit service_tier; returned tier must be
`default` for measured pricing. Unknown tier/model/usage retains the reserve and stops.

Sol Standard recorded rates per million: input $4, cache write $5, cache read $0.40,
output $20 inclusive of reasoning. https://developers.openai.com/api/docs/pricing
At W01 usage: 0.613488 PLN; conservative byte-based reservation: 2.06838 PLN.
These are recorded-price estimates, not billing controls or guaranteed provider charges.

## User steps, once merged to main

1. Open Actions → **Weekly Review - Sol W01 only** → Run workflow.
2. Branch `main`. Leave `allow_paid=NO` for a free dry-run; the paid job is skipped.
3. Only when explicitly choosing to spend up to 2.10 PLN on this single test:
   Run workflow on `main`, select `allow_paid=YES`, start once.
4. If GitHub requests deployment approval: Review deployments →
   `rpgfitness-benchmark` → Approve and deploy. This is the spending confirmation.
5. Do not rerun a failed job. Download `weekly-review-sol-w01-<run>-<attempt>`
   and share the ZIP for review. A successful workflow is structural validation,
   not a semantic quality certification.

No new key required; existing environment secret OPENAI_API_KEY is injected only
into the paid step. No credentials in checkout/setup, dry-run, logs, or artifacts.
The durable budget branch reserves 2.10 PLN before the model call, retains the
previous 5 PLN entry, enforces the unchanged 10 PLN global monthly cap, and makes
no automatic refunds. Account limits and model access remain independent checks.
Do not start the older Astra workflow. No workflow was dispatched in preparation.
