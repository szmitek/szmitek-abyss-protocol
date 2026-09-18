export const dimensions = ['reasoning', 'fidelityToEvidence', 'claimTypes', 'noHallucinations', 'noFalsePrecision', 'missingData', 'conflictingData', 'evidenceSupport'] as const;
export function scoreTemplate(id: string, effort: string, repeat: number) {
  return { testcaseId: id, effort, repeat, reviewStatus: 'pending', scores: Object.fromEntries(dimensions.map((d) => [d, null])), criticalViolations: null, unsupportedClaims: null, totalClaims: null, stabilityAcrossRepeats: null, notes: '' };
}
export interface Assessment { reviewStatus: string; scores: Record<string, number | null>; criticalViolations: string[] | null; stabilityAcrossRepeats: number | null }
export function configurationVerdict(rows: { valid: boolean; dryRun: boolean; assessment: Assessment }[]) {
  if (!rows.length || rows.some((r) => r.dryRun)) return 'not_evaluated';
  if (rows.some((r) => (r.assessment.criticalViolations?.length ?? 0) > 0)) return 'disqualified';
  if (rows.some((r) => r.assessment.reviewStatus !== 'reviewed' || r.assessment.criticalViolations === null || r.assessment.stabilityAcrossRepeats === null || dimensions.some((d) => r.assessment.scores[d] === null || r.assessment.scores[d] === undefined))) return 'pending_human_review';
  const numbers = rows.flatMap((r) => [...dimensions.map((d) => r.assessment.scores[d]!), r.assessment.stabilityAcrossRepeats!]);
  if (numbers.some((n) => !Number.isFinite(n) || n < 0 || n > 4)) throw new Error('Scores must be 0–4.');
  if (rows.filter((r) => r.valid).length / rows.length < 0.95 || numbers.reduce((a, b) => a + b, 0) / numbers.length < 3) return 'failed_pilot_gate';
  return 'pilot_gate_passed_not_production_certification';
}
