import type { BodyMeasurement, bodyMeasurementStats } from './bodyMeasurements.ts';
import type { DailyReadiness, Exercise, MovementAssessment, SetPerformance } from './types.ts';

export interface ReviewPeriod { from: string; to: string; timeZone: string; bounds: 'inclusive-local-dates' }
export interface ReviewFact {
  id: string;
  type: 'FACT';
  metric: string;
  value: number | null;
  unit: string;
  sourceIds: string[];
  method: string;
  period: ReviewPeriod;
}
export interface ExerciseExposure {
  id: string; workoutId: string; dateKey: string; exerciseId: string;
  unit: 'reps' | 'seconds' | 'unknown'; loading: Exercise['loading'] | null;
  comparisonKey: string | null;
  recordedSets: (SetPerformance | null)[];
  warmupSets: SetPerformance[];
  actualVolume: number | null; externalLoadVolume: number | null;
  prescribedVolume: number; missingActualSets: number;
  context: 'training' | 'return' | 'trial' | 'warmup';
}
export interface WeeklyReviewInput {
  contractVersion: 'weekly-review.v1'; requestId: string; locale: 'en';
  period: ReviewPeriod;
  facts: ReviewFact[];
  training: { id: string; dateKey: string; completed: boolean; durationSeconds: number; context: 'training' | 'return' | 'trial' }[];
  exerciseExposures: ExerciseExposure[];
  adherence: { completedTrainingSessions: number; activeDays: number; plannedSessions: number | null; rate: number | null; reason: string };
  archivedAdherence: { id: string; completedSessions: number; scheduledSessions: number; rate: number; targetSource: 'cycle-start' | 'legacy-estimate'; scope: 'archived-cycle-not-review-period' }[];
  wellbeing: DailyReadiness[];
  tests: { method: 'self-report'; records: MovementAssessment[] };
  body: { records: BodyMeasurement[]; statistics: ReturnType<typeof bodyMeasurementStats> };
  dataCoverage: { calendarDays: number; wellbeingDays: number; missingWellbeingDays: number; measurementDays: number; missingActualSets: number };
  photos: { status: 'no_pixels_attached'; localAnalysis: 'not_run'; manifest: { id: string; recordedOn: string; protocol: string | null; views: string[] }[] };
  constraints: { mayModifyPlan: false; mayDiagnose: false; mayEstimateBodyComposition: false };
}
export type ClaimType = 'FACT' | 'OBSERVATION' | 'HYPOTHESIS' | 'RECOMMENDATION';
export interface AIClaim {
  id: string; type: ClaimType; topic: string; text: string; evidenceIds: string[];
  confidence: { level: 'low' | 'medium' | 'high'; reason: string };
  limitations: string[]; alternatives: string[];
}
export interface ExerciseChangeProposal {
  fromExerciseId: string; toExerciseId: string; reason: string;
  evidenceIds: string[]; requiresUserAcceptance: true; startingLoadKg: null;
}
export interface ProgressReview {
  contractVersion: 'progress-review.v1'; requestId: string;
  status: 'complete' | 'insufficient_evidence'; summary: string;
  claims: AIClaim[]; questions: string[]; proposedChanges: ExerciseChangeProposal[];
}
export interface ReplacementInput {
  contractVersion: 'exercise-replacement.v1'; requestId: string;
  currentExerciseId: string; eligibleExerciseIds: string[]; evidence: ReviewFact[];
  // Candidates must already pass local constraints. Pain coaching is not implemented.
  safetyHold: boolean;
}
export interface ReplacementReview { requestId: string; status: 'proposal' | 'no_proposal'; proposedChanges: ExerciseChangeProposal[] }
export type AIResult<T> = { ok: true; data: T; provenance: { providerId: string; mode: 'mock' | 'local' | 'cloud'; label: string } }
  | { ok: false; error: { code: 'unsupported' | 'cancelled' | 'invalid_input' | 'unavailable'; message: string } };
export interface AIExecutionPolicy { signal?: AbortSignal; allowNetwork: boolean }
export interface AIProvider {
  readonly id: string;
  capabilities(): { mode: 'mock' | 'local' | 'cloud'; progress: boolean; replacement: boolean; physique: boolean };
  analyzeProgress(input: WeeklyReviewInput, policy: AIExecutionPolicy): Promise<AIResult<ProgressReview>>;
  suggestExerciseReplacement(input: ReplacementInput, policy: AIExecutionPolicy): Promise<AIResult<ReplacementReview>>;
  // A future version adds analyzePhysique only with a dedicated consent/image contract.
}
