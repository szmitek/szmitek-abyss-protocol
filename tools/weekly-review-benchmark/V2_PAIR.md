# W01 v2: Astra / Sol preparation

One workflow `Weekly Review - W01 v2 comparison`; one model per manual run.
Defaults: model sol, allow_paid NO. Protected environment rpgfitness-benchmark.
No request executed in preparation. Account limit increase to $3 is user-reported;
it does not change the local 10 PLN monthly cap or authorize inference.

| Model | Effort | Case | Output cap | Run/session cap | Conservative estimate |
|---|---|---|---:|---:|---:|
| gpt-5.6-sol | medium | W01 | 4096 | 1.80 PLN | 1.74284 PLN |
| gpt-6-astra | medium | W01 | 4096 | 4.40 PLN | 4.35710 PLN |

FX 4 PLN/USD; recorded Standard tariffs. Combined session caps 6.20 PLN,
not expected cost. No high, repeats, fallback, coach, vision or production changes.
Both requests have identical fields except model: v2 prompt, compact evidence,
progress-review.v1, same snapshot, max output, service tier and reasoning effort.
Each output retains prompt/model version, raw response, usage including reasoning,
price breakdown and validation. Reports remain ungraded until semantic review.

## Offline

```
node --experimental-strip-types tools/weekly-review-benchmark/v2-w01.ts --dry-run --model=sol
node --experimental-strip-types tools/weekly-review-benchmark/v2-w01.ts --dry-run --model=astra
```

No key or HTTP needed. Mock validation does not measure v2 prompt quality.
Live requires a new protected Actions attempt, explicit paid opt-in and a key.
No automatic retry; old historical W01 workflow remains unchanged.

## Blocking budget reconciliation — proposal only, NOT APPLIED

Read journal SHA: 0d3a943abfbe746313a84e5864b98935b144c937.
September reservations: Astra run35350911495 =5 PLN; Sol run35405822761 =2.10 PLN.
Total7.10. Remaining under10 PLN =2.90; not enough for both new reservations6.20.
Increasing provider billing to$3 does not release these reservations.

Verified completed artifact accounting, FX4:
- Astra: corrected cache-write cost1.533720 PLN (1533720 microPLN); ZIP SHA256
  2ed123ba7a810824b5883842cb302db5f9ad732113b437c38ee0e673007b6dfd.
- Sol: cost0.607808 PLN (607808 microPLN); ZIP SHA256
  99d3d752fd8de690abdd038bf3ceefd21ec6e8f28313b1c298c754c35eb5aaae.
- Total2.141528 PLN; unused reserved4.958472 PLN.

Recommended separate approval: reconcile ONLY these two completed runs to verified
usage-based amounts, preserve both IDs/months and an audit record of original
reservations, artifact hashes, costs and approval. Do not delete/reset entries or
relax rerun protections. Re-read journal and compare-and-set the SHA; stop on any
new entry, ambiguous result, or mismatch. No automated reconciliation was added.
After such an explicitly approved reconciliation, the pair would reserve a combined
8.341528 PLN including previous usage, within the unchanged10 PLN policy.
This is not an invoice reconciliation or a guarantee of OpenAI account availability.

## Once merged and budget resolved

Open Actions → Weekly Review - W01 v2 comparison → Run workflow → main.
Optional free preparation: allow_paid NO. For each separately approved model,
select sol or astra, choose allow_paid YES, run once and approve the environment.
Download each `weekly-review-v2-<model>-<run>-<attempt>` ZIP for comparison.
Do not rerun a failed job. Do not start either live test before the budget decision.
Creating/merging this workflow does not authorize paid execution.
