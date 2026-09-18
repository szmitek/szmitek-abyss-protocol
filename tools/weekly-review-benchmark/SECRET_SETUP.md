# Secret injection — verified; paid execution awaits separate approval

Decision: use a GitHub **environment secret**, not a repository variable, chat message, Work file or committed `.env`. The tools exposed in this Work session do not offer a user-entered secret store for the scratch terminal. Sites environment variables belong to hosted sites and are not an appropriate store for this developer benchmark. No real key was requested, read or stored in this delivery.

The environment secret was added by the user. Injection-only workflow [35328482005](https://github.com/szmitek/szmitek-abyss-protocol/actions/runs/35328482005) passed. This does not establish API validity or model access.

## User action in GitHub (setup reference)

1. Open https://github.com/szmitek/szmitek-abyss-protocol/settings/environments (repository Settings → Environments).
2. Click **New environment**. Name: **rpgfitness-benchmark**. Click **Configure environment**.
3. Enable **Required reviewers**, add **szmitek**, and save the protection rule. For a solo-owner project, do not enable **Prevent self-review** if you must approve workflows you initiated yourself. Approval should inspect the exact code/ref being run. Disable administrator bypass if available.
4. Under **Deployment branches and tags**, choose **Selected branches and tags**. Add a **Branch** rule for exactly **main**. Do not allow all branches, pull-request refs or wildcard tags.
5. Under **Environment secrets**, click **Add secret**. Name: **OPENAI_API_KEY**. Paste the key into GitHub's Secret field and click **Add secret**. Do not duplicate it as a repository/organization secret or Actions variable.
6. Keep the existing OpenAI restrictions: RPGFitness project only, Responses Write only, other endpoints None, 30-day expiry. GitHub secrets have no separate endpoint permissions; those are controlled by the OpenAI key.
7. Tell the assistant only: **“Secret OPENAI_API_KEY added to environment rpgfitness-benchmark.”** No value, prefix, screenshot of the value, or key hash is needed.

GitHub encrypts the saved secret and injects it into the explicitly configured step. The assistant does not need to retrieve its value. Anyone allowed to approve/change trusted workflow code must still be trusted: masking is a backup safeguard, not protection against malicious code.

## Prepared verification

`.github/workflows/weekly-review-secret-check.yml` is manual-only (`workflow_dispatch`) and accepts **main only**. The workflow first runs a dry-run with an explicitly empty key in an unprivileged job. A separate environment-protected job exposes the real secret only to `security.ts`, which checks presence/whitespace/runtime debugging and prints a fixed pass/fail message. It does not import the HTTP adapter, perform HTTP, print the secret/length/hash, write it to files, or upload artifacts. Missing secret fails closed. `BENCH_ALLOW_PAID` is hardcoded **NO**.

The workflow must be reviewed and present on the default branch before GitHub exposes manual dispatch. PR46 includes a scope check so developer-only changes do not build a new APK on merge. Do not weaken the environment branch rule to run unmerged code. After merge, run only Actions → Weekly Review - secret check only → Run workflow → main. Approve the environment job through Review deployments when prompted. This connector cannot dispatch workflows or approve deployments; the user performs those two UI actions. A green secret check verifies injection, **not** key validity, expiry, permissions or billing; checking those by an OpenAI request still requires separate authorization.

The key is absent from checkout/setup/dependency installation/test steps and regular PR CI. No `--live` exists in this workflow. The separate pilot subsequently executed W01 under explicit authorization; further paid calls are paused.

## Before any paid execution

The first authorized benchmark was **medium only** and stopped after W01. The prepared continuation selects W02–W08 with `--effort=medium --cases=remaining --payload=compact`, one repetition, only after new explicit authorization. High remains a separately authorized comparison. Keep `BENCH_MAX_RUN_PLN`, `BENCH_MAX_SESSION_PLN`, `BENCH_PLN_PER_USD`, `BENCH_MAX_OUTPUT_TOKENS` and the explicit paid opt-in gate.

The manual pilot workflow now defaults to dry-run. Paid execution requires the explicit `allow_paid=YES` input and environment approval (when the configured reviewer rule is enabled). The Actions harness reserves the **entire 5 PLN session allowance durably before contacting OpenAI**. See [ACTIONS_PILOT.md](ACTIONS_PILOT.md). This preparation does not authorize selecting YES. The local per-request ledger remains an additional check; it is not the persistent monthly source of truth in Actions.

The user's prepaid $5, auto-reload OFF, $2/month organization and project caps, and restricted expiring key were reported by the user; the assistant has not inspected or changed billing settings. None of those account settings is an authorization to spend.

Sources:
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
