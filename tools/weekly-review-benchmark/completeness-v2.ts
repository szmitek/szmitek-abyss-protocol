// Offline candidate only. The live v1 prompt and historical W01 remain unchanged.
import { makeRequest, type Effort } from './adapter.ts';
import { systemPrompt } from './contract.ts';
import type { TestCase } from './fixtures.ts';
export const completenessPromptVersion = 'weekly-review.completeness.v2-candidate';
export const completenessPrompt = `${systemPrompt}
Before writing, review every supplied domain: plan versus recorded execution, comparable exercise performance and effort, wellbeing, body measurements, and movement self-assessments. Prioritize discrepancies or limitations that could change the user's next decision. Within a comparable exposure, you may describe provided prescribed and actual values and their ordering, without deriving a new delta or percentage. If their meaning or comparability is uncertain, ask for clarification rather than assume noncompliance.
Do not use weight as a substitute for circumference coverage. Where body or movement data are supplied, include their material finding or interpretation limit in the summary, a claim or a question. When a domain is missing, say it cannot be assessed; do not invent a reassuring result. Movement self-assessments are subjective, not medical clearance. Distinguish the selected week from overlapping historical context.
Make the review useful: identify the most important supported signal, what merits attention, and a bounded next step or a targeted question that resolves a material uncertainty. A RECOMMENDATION is optional: prefer checking records or gathering missing context when training changes are not justified. Do not prescribe a new plan, load, diagnosis, exercise replacement or treatment. Do not force positive trends, hypotheses or recommendations when unsupported.
Keep the summary short and user-facing. Combine related points instead of repeating facts and caveats; retain claim-level evidence, uncertainty and essential limitations. Completeness means covering decision-relevant information, not mentioning every field. If no safe next step is supported, explain why and what evidence is missing. These instructions do not override the safety, evidence, numerical-ownership or response-contract rules above.`;
export function completenessRequest(test: TestCase, model: 'gpt-5.6-sol' | 'gpt-6-astra', effort: Effort = 'medium') {
  if (!['W01', 'W02', 'W03'].includes(test.id) || effort !== 'medium') throw new Error('Offline v2 scope is W01–W03 medium only.');
  const body = makeRequest(test, effort, 4096, 'compact');
  return { ...body, model, input: [{ role: 'system', content: completenessPrompt }, body.input[1]!] };
}
