# Strength log: first gym package

## Behavior

- Twelve new implement-specific exercises; availability requires every named piece of gear and clear results for each declared movement check. Pain exclusions remain hard filters.
- No bodyweight-to-weighted variant jump; each implement has a separate exercise ID/history.
- Repetition sets confirm actual reps, including zero. Loaded sets require kg and perceived effort. Timed sets record completed seconds, including an early stop.
- Kg means per dumbbell, total including a bar, or machine marking/added plates as labeled. No comparison across exercises or machine types. Machine weight is never suggested automatically; users must keep the same machine and convention for their own comparisons.
- Only confirmed sets persist. Per-set form resets by workout step; current-session load can be reused on the next set of the same exercise. Historical weight is shown as context, never filled as a starting prescription.
- A load-review message requires two distinct prior completed sessions, same recorded kg, every set at the top of the range, acceptable effort, normal readiness and an eligible arc phase. It suggests considering the smallest available increase; it never chooses new kg. This is a conservative product heuristic, not a validated clinical prescription.
- Actual per-set results determine mastery and trial success. Extra reps in one set do not cancel a missed target in another.
- History totals use recorded reps/seconds. Old history and interrupted legacy sets are explicitly unmeasured and keep old target-derived totals without inventing weights.

## Persistence

Schema v12, unchanged storage key, Data Vault format v1. The v11 backup checksum is verified before upgrading its schema; migrated content gets a fresh checksum for subsequent restore validation. Active checkpoints survive upgrade; unknown old sets become null only when recording resumes. No new dependency or remote API.

## Evidence and scope

General rationale for gradual, individualized resistance training: ACSM, 2026 position-stand summary, https://acsm.org/resistance-training-guidelines-update-2026/ . Our exact load-review thresholds and hard filters are implementation choices, not a claim of ACSM endorsement or automatic rehabilitation.

This package is a foundation, not a complete gym trainer. Separate location loadouts, warm-up sets, machine IDs, more movements and richer periodization remain on the roadmap. Textual exercise guidance is used where motion assets are absent; animations are explicitly deferred.

## Device checks still required

- Settings: enable dumbbells only, then add bench/rack or individual machines and inspect generated plans after normal readiness/clear calibration.
- Record different reps and decimal kg (dot/comma), select effort; reject blank/negative input; double tap cannot log another set.
- Background/kill after confirming a set, resume explicitly and verify logged values. Unsubmitted form input is not persisted.
- End a timed set early and inspect actual seconds in Progress.
- Inspect per-set history and export/import the new backup. Import a real prior v11 backup.
- Check keyboard visibility, scrolling and enlarged text on Android.
