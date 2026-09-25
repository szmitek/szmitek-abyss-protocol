import type { WeeklyReviewInput } from './aiContracts.ts';
import { isMeasurementDay } from './bodyMeasurements.ts';
import { shiftReviewDay } from './reviewSession.ts';
import { buildWeeklyReview } from './weeklyReview.ts';
import type { AppSnapshot, MovementAssessment, TrainingArc, UserProfile } from './types.ts';

export interface ArcReviewContext {
  contractVersion: 'arc-review-context.v1';
  arcId: string;
  cycleNumber: number;
  state: 'in_progress' | 'ready_for_reassessment' | 'completed';
  checkpoints: { baseline: MovementAssessment | null; completion: MovementAssessment | null };
  nominalEnd: string;
  actualEnd: string | null;
  plannedFrequency: TrainingArc['planSnapshot'];
  profileContext: { scope: 'current-settings-not-historical-plan'; goal: UserProfile['goal']; experienceLevel: UserProfile['experienceLevel']; workoutDuration: UserProfile['workoutDuration']; availableEquipment: UserProfile['availableEquipment'] };
  limitations: string[];
}

// Disjoint date windows: a reassessment day belongs to the new arc. Old local
// verdicts remain untouched; they historically included the reassessment day.
export function prepareArcReview(snapshot: AppSnapshot, arcId: string, today: string, timeZone: string): WeeklyReviewInput {
  const profile = snapshot.profile;
  const arc = profile?.trainingArcs.find(a => a.id === arcId);
  if (!profile || !arc || !isMeasurementDay(today) || !isMeasurementDay(arc.startDateKey) || arc.startDateKey > today) throw new Error('Arc not available for this date.');
  const baseline = profile.movementAssessments.find(a => a.id === arc.baselineAssessmentId);
  if (baseline && baseline.dateKey !== arc.startDateKey) throw new Error('Inconsistent baseline date.');
  const completion = profile.movementAssessments.find(a => a.id === arc.completionAssessmentId);
  if (completion && completion.kind !== 'reassessment') throw new Error('Invalid completion checkpoint.');
  if (arc.completionAssessmentId && !completion) throw new Error('Missing arc completion record.');
  const next = profile.trainingArcs.filter(a => a.cycleNumber > arc.cycleNumber).sort((a, b) => a.cycleNumber - b.cycleNumber)[0];
  if (next && !completion) throw new Error('A later arc requires a completion checkpoint.');
  const boundary = completion?.dateKey ?? next?.startDateKey ?? null;
  if (boundary && (!isMeasurementDay(boundary) || boundary <= arc.startDateKey || boundary > today || next && next.startDateKey !== boundary)) throw new Error('Inconsistent arc boundary.');
  const end = boundary ? shiftReviewDay(boundary, -1) : today;
  const nominalEnd = shiftReviewDay(arc.startDateKey, arc.durationWeeks * 7 - 1);
  const input = buildWeeklyReview(snapshot, { from: arc.startDateKey, to: end, timeZone, bounds: 'inclusive-local-dates' }, `arc:${arc.id}:${end}`);
  // Do not present older verdict denominators as adherence for this new window.
  input.archivedAdherence = [];
  for (const [metric, values] of Object.entries(input.body.statistics.metrics)) {
    input.facts.push({ id: `arc:body:${metric}:first-last`, type: 'FACT', metric: `${metric} first-to-last daily mean change`, value: values.firstToLastDailyMeanChange, unit: values.unit, sourceIds: [...values.evidenceIds], period: { ...input.period }, method: 'Last measured daily mean minus first measured daily mean within this arc, same protocol as latest reading. No missing-day imputation or body composition inference.' });
  }
  input.arcContext = {
    contractVersion: 'arc-review-context.v1', arcId: arc.id, cycleNumber: arc.cycleNumber,
    state: boundary ? 'completed' : today > nominalEnd ? 'ready_for_reassessment' : 'in_progress',
    checkpoints: { baseline: baseline ?? null, completion: completion ?? null },
    nominalEnd, actualEnd: boundary ? end : null,
    plannedFrequency: arc.planSnapshot ? { ...arc.planSnapshot } : null,
    profileContext: { scope: 'current-settings-not-historical-plan', goal: profile.goal, experienceLevel: profile.experienceLevel, workoutDuration: profile.workoutDuration, availableEquipment: [...profile.availableEquipment] },
    limitations: [
      'The original exercise-by-exercise arc plan is not retained. Recorded prescriptions describe completed exposures only.',
      'Current goals and equipment are current settings, not a reconstruction of this arc.',
      'Reassessment-day training belongs to the next arc; boundary movement checks are supplied separately. Historical verdicts may use different boundaries.',
      'Missing sessions, wellbeing or measurements do not establish good or bad progress.',
      'No image pixels, previous AI conclusions, medical diagnoses or automatic plan changes.',
    ],
  };
  return JSON.parse(JSON.stringify(input)) as WeeklyReviewInput;
}
