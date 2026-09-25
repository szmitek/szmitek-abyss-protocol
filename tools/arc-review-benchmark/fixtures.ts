import { prepareArcReview } from '../../src/domain/arcProgressReview.ts';
import { weeklyCases, syntheticSnapshot, type TestCase } from '../weekly-review-benchmark/fixtures.ts';
import type { AppSnapshot } from '../../src/domain/types.ts';

export function withArc(s: AppSnapshot): AppSnapshot {
  const baseline = { ...s.profile!.movementAssessments[0]!, id: 'arc-baseline', dateKey: '2026-08-17', date: '2026-08-17T10:00:00Z' };
  s.profile!.movementAssessments.push(baseline);
  s.profile!.trainingArcs = [{ id: 'synthetic-arc', cycleNumber: 1, startDateKey: '2026-08-17', durationWeeks: 4, baselineAssessmentId: baseline.id, completionAssessmentId: null, reviewId: null, entryDecision: null, directiveReviewedAt: null, planSnapshot: { workoutsPerWeek: 3, source: 'cycle-start' } }];
  return s;
}
export function arcCases(): TestCase[] {
  const cases = weeklyCases(s => prepareArcReview(withArc(s), 'synthetic-arc', '2026-09-13', 'Europe/Warsaw')).map(c => ({ ...c, id: c.id.replace('W', 'A'), high: false }));
  for (const c of cases) c.input.requestId = `benchmark:${c.id}`;
  // Original adversarial mutations are retained, including inconsistent 3/3 and
  // 25% assertions. The full arc now contains more records: do not repair it.
  const empty = withArc(syntheticSnapshot());
  empty.history = []; empty.profile!.bodyMeasurements = []; empty.profile!.readinessLog = []; empty.profile!.movementAssessments = [];
  cases.push({ id: 'A09', title: 'No recorded outcomes: no invented success or mandatory changes', high: false, input: prepareArcReview(empty, 'synthetic-arc', '2026-09-14', 'Europe/Warsaw'), mutation: null });
  cases.push({ id: 'A10', title: 'Partial arc is not a completed cycle', high: false, input: prepareArcReview(withArc(syntheticSnapshot()), 'synthetic-arc', '2026-08-20', 'Europe/Warsaw'), mutation: null });
  for (const c of cases) c.input.requestId = `benchmark:${c.id}`;
  return cases;
}
