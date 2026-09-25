# Weekly Summary + Arc Review (local package)

Accepted direction: local weekly summaries, optional AI review before the next arc,
then contextual help later. This document updates the cadence in AI Research v2;
its evidence, privacy and user-control requirements remain authoritative.

## Delivered behavior

Progress has **Weekly Summary · Offline** and **Arc Review · Development Mock**.
Summary selects completed Monday–Sunday weeks and computes only that week's facts:
training completions, active days, same-exercise/equipment exposure changes,
recorded effort, weight/waist latest/previous-day change/daily mean, wellbeing,
movement records and missing coverage. No provider is invoked.

Arc Review selects an actual stored arc, uses real local data, renders coverage,
current goal and cycle-start frequency, boundary movement checkpoints and a
validated mock with evidence navigation. Reports are ephemeral and clearly labelled.
The mock copies supported facts and asks illustrative questions; it does not reason,
choose exercises or measure the quality of any model. Empty evidence stays empty.

Existing arcs last four weeks. An active arc is a partial preview until the day
following its nominal end; a delayed reassessment extends the actual window.
Completed-arc training ends the day before reassessment, so a new arc's first day
is never counted twice. Baseline/completion movement checks are separately scoped
context and available evidence, even at the boundary. Existing deterministic arc
verdicts are preserved; their historical inclusive periods can differ.

Original exercise-by-exercise plans and daily historical attendance schedules are
not retained. Do not fabricate these from current settings or turn saved frequency
into a supposedly exact adherence denominator. Archived verdicts are not recycled
as facts for the new window. Current goal/equipment are explicitly current context.

## Contracts and persistence

AIProvider.analyzeProgress and progress-review.v1 remain unchanged. The existing
period-based weekly-review.v1 input gains optional, versioned arcContext
(arc-review-context.v1). Historical weekly fixtures omit it and remain unchanged.
No overlap/historyContext is added to arc inputs. The same evidence registry and
runtime validator apply; proposedChanges must still be empty. Plan modification
and Accept/Reject are a later package, not fake functional controls in this one.

No persisted fields or storage migration. Snapshot/Data Vault schema remains v17;
existing measurements, training, photos, settings and backup behavior are untouched.
Changing source data or selection invalidates the displayed mock. Leaving the
screen clears it. Native versionCode target is 21; source completion is not proof
of a published or physically tested APK.

## Delivery checks

Run tests, TypeScript, lint, Android export and the offline arc preparation.
Manual phone checks after native release: empty profile; partial and completed arc;
week navigation across year/DST; weight-only and circumference-only records;
source navigation/back; large fonts; data refresh while a report is open;
backup restore; upgrade without uninstalling; existing reassessment transition.
No device walkthrough has been performed in this workspace.

## Next bounded package

Review the A01–A10 dry-run payloads/rubric. Before any paid call: verify current
model availability/pricing and remaining journal/account budget; freeze the exact
request and cost limit; obtain separate explicit approval. A01 first, then remaining
quality gates by agreement. No automatic reruns, high, Sol/Luna or image requests.
A text pilot cannot qualify vision or full exercise-plan recommendations.

Verified locally on 2026-09-25: 254 tests passed, TypeScript, ESLint and Android export passed; ten offline benchmark cases validated at zero API cost. Native installation and visual phone checks remain pending.
