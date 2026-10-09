# Text Arc Review delivery contract — offline preparation

Status: design only, 2026-10-09. No cloud adapter, endpoint, account, credential,
network request or app activation is introduced. This follows the bounded A01 v2
pass; one synthetic success is not a production quality guarantee.

## Existing seams

`src/data/reviewProvider.ts` composes MockAIProvider. `runWeeklyReview` in
`src/domain/reviewSession.ts` rejects every non-mock mode, detaches input and
validates output with `validateProgressResponse`. Keep that gate intact until
an explicitly scoped integration replaces it. `reviewRevision` is exact local
JSON equality, not a cryptographic digest or an idempotency key.

A future adapter may reuse the evidence contracts and validation. It must not
reuse benchmark Actions, environment secrets or the benchmark budget branch as
a personal-data production service. The benchmark input is synthetic and its
manual workflows are developer-only.

## User flow

1. Select a four-week arc. The existing local summary remains available offline.
2. Build a detached text-only snapshot and display its dates, data categories,
   missing-data coverage and an expandable exact outgoing payload preview.
   Show that optional photos are excluded; do not read or encode image files.
3. Present the provider, purpose, maximum authorized cost and retention policy.
   Quote retrieval must send only the minimum metadata needed to price/authorize,
   not the personal review body before consent. Expired quotes block submission.
4. Confirmation authorizes one immutable request. Editing the period, snapshot,
   model, prompt version or price invalidates that confirmation.
5. After submission, show status for the same operation. A lost connection offers
   status recovery, not a fresh paid request. Training remains available.
6. Show only a validated result bound to that snapshot. If current local data
   changed, label the report historical/stale rather than presenting it as the
   latest analysis. No generated plan changes are applied.

All interface copy remains English, consistent with the app. Report archiving is
a separate feature: current reports are ephemeral and storage schema v17 remains
unchanged by this design.

## Operation envelope (proposed version `text-arc-delivery.v1`)

| Field | Requirement |
|---|---|
| operationId | Random unique identifier for a logical operation, persisted before send; never a secret or authorization mechanism. |
| input | Detached WeeklyReviewInput with supported arc context; size/type/field whitelist validation. |
| inputDigest | SHA256 over a specified canonical UTF-8 serialization; server recomputes it. Never substitute reviewRevision or trust client hash alone. |
| consent | Explicit purpose/provider/data version, user-confirmed timestamp, digest and maximum cost in integer minor accounting units. |
| quoteId | Server-issued expiring quote bound to authenticated owner, digest, model/prompt versions and cap. |
| requestId | Unique review correlation ID; server and client reject output for another request. |

Server-owned credentials never enter Expo configuration, AsyncStorage, backups,
logs, APK or user-supplied request fields. Authentication/hosting choices remain
unselected; before activation, enforce per-owner reads, writes, quotas and results.
Operation IDs alone do not grant access.

## Durable execution rules for the future service

Atomically bind `(owner, operationId)` to immutable digest and consent, and reserve
budget before provider submission. Same key and body returns the existing state;
same key with a different body is a conflict. Concurrent taps must converge to one
operation. Limits are enforced on the service; client estimates are informational.

Suggested states: prepared, reserved, submitted, completed, rejected_output,
failed_before_send, unknown_outcome, cancelled_before_send. Terminal errors may
consume cost: distinguish failure to produce a valid review from failure to bill.

- A proven pre-send failure may release its reservation transactionally.
- A crash after reservation but before reliably knowing whether submission began
  is an unknown outcome, not permission to resubmit.
- Timeout, client cancellation after submit, connection loss, malformed paid
  output and app restart never authorize a second model call.
- Keep the reserve for an unknown outcome. Recover state/read an existing result
  where possible; reconciliation requires evidence. Do not silently reset it.
- Even provider idempotency support must be verified before relying on it; this
  design does not promise exactly-once external execution across ambiguous crashes.
- A new operation after a paid rejection needs a newly priced explicit consent.
- Respect global and per-owner caps across concurrency and month boundaries;
  reconcile charges against the original reservation, not a convenient new month.

Persisting the client operation pointer and immutable request binding will need
an explicit storage/Vault migration design before implementation. Do not copy
large private snapshots into general backups by default merely for recovery.

## Validation and data handling

Validate the input schema, bounds, sizes, permitted versions and authenticated
ownership before reserving/spending. Pin server-side prompt/model/contract versions.
Apply `validateProgressResponse` on both sides against the exact submitted input;
reject unknown evidence IDs, wrong request IDs, malformed envelopes and unsupported
proposed changes. Structural acceptance is not a proof of semantic accuracy.

The backend must choose and disclose a concrete retention/deletion policy before
activation, including temporary encrypted result recovery, expiration, user
removal and provider retention limitations. Logs should contain operational IDs,
status and accounting only, not wellbeing, measurements, payloads or model text.
Photos, local image URIs and image metadata unnecessary for text analysis must be
excluded from transport. No personal data is uploaded during offline preparation.

## Implementation acceptance matrix

| Scenario | Required outcome |
|---|---|
| No consent / changed snapshot / expired quote | No provider submission; return to confirmation. |
| Double tap / two workers | One reserved logical operation; no duplicate call. |
| Reused operation ID, different payload | Conflict before spending. |
| Different user asks for operation/result | Deny without exposing its existence/content. |
| Client closes screen after submit | Submission may finish; reserve remains and status can be recovered. |
| Provider timeout or service crash near submission | Unknown outcome; no automatic resubmission or refund. |
| Invalid paid output | Reject report, retain measured cost; no automatic repair call. |
| Correct result for older snapshot | Historical label; no overwrite of a newer active report or training state. |
| Budget unavailable / unaffordable quote | No call; local training and summaries work. |
| App restart / backup restore | Recover one pending operation without creating a second; define migration first. |
| Result expires or user deletes it | Explain unavailability; never regenerate automatically. |
| Photo library available | No photo access/upload in this text-only operation. |

The first implementation can exercise these transitions against a fake transport
and fake durable ledger with deterministic tests, at zero provider cost. Before
real integration: select authentication/hosting, specify retention and migration,
verify current provider/pricing capabilities and agree the personal-data scope.
Additional real A02–A10 or photo evaluations require their own bounded budget.
