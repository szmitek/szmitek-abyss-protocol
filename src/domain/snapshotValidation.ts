import { isValidMachineSetup, validateLoadouts } from './loadouts.ts';
import { EXERCISE_BY_ID } from '../data/exercises.ts';
import { isValidSetPerformance } from './setPerformance.ts';
import { calculateReadinessBand } from './readiness.ts';
import { CORRECTIVE_GOALS, EQUIPMENT, GOALS, MOVEMENT_CHECKS, MUSCLE_GROUPS, PAIN_AREAS, POSTURE_PRIORITIES, POSTURE_VIEWS, SAFETY_SIGNALS, STAT_KEYS, type AppSnapshot } from './types.ts';

type Check = (value: unknown, path: string) => void;
const fail = (path: string): never => { throw new Error(`Invalid Player data at ${path}.`); };
const str: Check = (v, p) => { if (typeof v !== 'string' || v.length > 20000) fail(p); };
const id: Check = (v, p) => { if (typeof v !== 'string' || !v.length || v.length > 256) fail(p); };
const bool: Check = (v, p) => { if (typeof v !== 'boolean') fail(p); };
const number = (min = 0, max = 1e9): Check => (v, p) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(p); };
const integer = (min = 0, max = 1e9): Check => (v, p) => { number(min, max)(v, p); if (!Number.isInteger(v)) fail(p); };
const choice = (values: readonly unknown[]): Check => (v, p) => { if (!values.includes(v)) fail(p); };
const nullable = (check: Check): Check => (v, p) => { if (v !== null) check(v, p); };
const optional = (check: Check): Check => (v, p) => { if (v !== undefined) check(v, p); };
const list = (check: Check, max = 10000): Check => (v, p) => { if (!Array.isArray(v) || v.length > max) fail(p); (v as unknown[]).forEach((item, i) => check(item, `${p}[${i}]`)); };
const shape = (fields: Record<string, Check>): Check => (v, p) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p);
  for (const [key, check] of Object.entries(fields)) check((v as Record<string, unknown>)[key], `${p}.${key}`);
};
const day: Check = (v, p) => { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) fail(p); };
const date: Check = (v, p) => { if (typeof v !== 'string' || v.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(v) || !Number.isFinite(Date.parse(v))) fail(p); };
const counts = (keys: readonly string[]) => shape(Object.fromEntries(keys.map((key) => [key, integer()])));
const stats = counts(STAT_KEYS);
const rank = choice(['E', 'D', 'C', 'B', 'A', 'S']);
const decision = choice(['advance', 'continue', 'recalibrate', 'recovery', 'hold']);
const phase = choice(['calibration', 'foundation', 'overload', 'consolidation']);
const band = choice(['normal', 'reduced', 'recovery', 'hold']);
const targetSource = choice(['cycle-start', 'legacy-estimate']);
const targets = list(shape({ goal: choice(CORRECTIVE_GOALS), priority: choice(['primary', 'support']), sources: list(choice(['self-observation', 'player-scan', 'movement-analysis', 'posture-archive']), 4) }), 7);
const photo = shape({ view: choice(POSTURE_VIEWS), uri: str, width: integer(1, 32768), height: integer(1, 32768), source: choice(['camera', 'library']), capturedAt: date });
const location = choice(['home', 'gym']);
const machineSetup: Check = (v, p) => { if (!isValidMachineSetup(v)) fail(p); };
const equipment = list(choice(Object.values(EQUIPMENT)), Object.keys(EQUIPMENT).length);
const setPerformance = shape({ loadDecision: optional(shape({ previousKg: number(0, 1000), incrementKg: number(0, 100), evidenceDateKeys: list(day, 2) })), machineSetup: optional(machineSetup), actual: integer(0, 3600), loadKg: nullable(number(0, 1000)), effort: nullable(choice(['too-easy', 'perfect', 'too-hard'])) });
const result = shape({ warmupSets: optional(list(setPerformance, 5)), recordedSets: optional(list(nullable(setPerformance), 100)), exerciseId: id, completedSets: integer(0, 10000), targetPerSet: number(0, 100000), completedVolume: number() });
const history = list(shape({ returnBlockId: optional(id), location: optional(location), id, date, dateKey: day, planId: id, title: str, completed: bool, durationSeconds: integer(), difficulty: choice([1, 2, 3]), perceivedDifficulty: choice(['too-easy', 'perfect', 'too-hard']), results: list(result, 200), xpEarned: integer(), attributeXpEarned: stats, statGains: stats }));
const profile = shape({
  returnPlan: optional(shape({ id, startedAt: date, startDateKey: day, endedAt: nullable(date), endDateKey: nullable(day), exitReason: nullable(choice(['completed', 'early-exit'])) })),
  loadouts: optional(shape({ active: location, home: equipment, gym: equipment })), machineSetups: optional(list(machineSetup, 50)),
  id, ...Object.fromEntries(STAT_KEYS.map((key) => [key, integer(0, 100000)])), level: integer(1, 100000), xp: integer(), rank, attributeXp: stats,
  goal: choice(Object.values(GOALS)), experienceLevel: choice(['beginner', 'intermediate', 'advanced']), workoutDuration: choice([10, 15, 20, 30, 45, 60]), workoutsPerWeek: choice([2, 3, 4, 5, 6, 7]),
  availableEquipment: list(choice(Object.values(EQUIPMENT)), Object.keys(EQUIPMENT).length), excludedExercises: list(id, 1000), streak: integer(), longestStreak: integer(), totalWorkouts: integer(), lastWorkoutDateKey: nullable(day), activeTrainingWeeks: list(id), rankTrialCompleted: list(rank, 6),
  healthProfile: shape({ scanCompleted: bool, painAreas: list(choice(PAIN_AREAS), 7), posturePriorities: list(choice(POSTURE_PRIORITIES), 5), safetySignals: list(choice(SAFETY_SIGNALS), 5), knownConditions: str, clinicianRestrictions: str, updatedAt: nullable(date) }),
  correctiveProfile: shape({ configured: bool, targets, updatedAt: nullable(date) }),
  correctiveHistory: list(shape({ id, date: nullable(date), trainingArcId: nullable(id), source: choice(['confirmed', 'legacy-current']), targets })),
  movementAssessments: list(shape({ id, date, dateKey: day, kind: choice(['baseline', 'reassessment']), results: shape(Object.fromEntries(MOVEMENT_CHECKS.map((key) => [key, choice(['clear', 'limited', 'pain'])]))) })),
  trainingArcs: list(shape({ id, cycleNumber: integer(1, 10000), startDateKey: day, durationWeeks: choice([4]), baselineAssessmentId: id, completionAssessmentId: nullable(id), reviewId: nullable(id), entryDecision: nullable(decision), directiveReviewedAt: nullable(date), planSnapshot: nullable(shape({ workoutsPerWeek: choice([2, 3, 4, 5, 6, 7]), source: targetSource })) })),
  trainingArcReviews: list(shape({ id, trainingArcId: id, cycleNumber: integer(1, 10000), date, dateKey: day, baselineAssessmentId: id, completionAssessmentId: id, baselinePostureScanId: nullable(id), completionPostureScanId: nullable(id), adherence: shape({ scheduledSessions: integer(1), completedSessions: integer(), rate: number(0, 1), targetSource }), movement: counts(['improved', 'declined', 'unchanged']), difficulty: counts(['tooEasy', 'perfect', 'tooHard']), readiness: counts(['normal', 'reduced', 'recovery', 'hold']), decision, reasons: list(str, 100) })),
  postureScans: list(shape({ id, date, dateKey: day, trainingArcId: nullable(id), trainingArcCycle: nullable(integer(1)), photos: shape(Object.fromEntries(POSTURE_VIEWS.map((view) => [view, photo]))) }), 1000),
  readinessLog: list(shape({ id, date, dateKey: day, energy: choice(['low', 'stable', 'high']), sleep: choice(['poor', 'fair', 'good']), soreness: choice(['none', 'mild', 'high']), soreMuscles: list(choice(MUSCLE_GROUPS), 11), painOrWarning: bool, band }), 90),
});
const numericMap = (keys: readonly string[]) => shape(Object.fromEntries(keys.map((key) => [key, optional(number())])));
const exercise = shape({ loading: optional(choice(['per-hand', 'total', 'stack'])), blockedPainAreas: optional(list(choice(PAIN_AREAS), 7)), requiredClearChecks: optional(list(choice(MOVEMENT_CHECKS), 5)), id, name: str, description: str, muscleGroups: list(choice(MUSCLE_GROUPS), 11), primaryMuscle: choice(MUSCLE_GROUPS), requiredEquipment: list(choice(Object.values(EQUIPMENT)), Object.keys(EQUIPMENT).length), difficulty: choice([1, 2, 3]), progressionGroup: id, progressionLevel: integer(), exerciseType: choice(['warmup', 'strength', 'cardio', 'core', 'mobility']), repType: choice(['reps', 'seconds']), minReps: number(), maxReps: number(), defaultRest: number(), statImpact: numericMap(STAT_KEYS), muscleLoad: numericMap(MUSCLE_GROUPS) });
const plan = shape({ returnBlockId: optional(id), location: optional(location), id, dateKey: day, kind: optional(choice(['training', 'rank-trial', 'recovery', 'safety-hold', 'reassessment', 'directive-review'])), title: str, focus: str, estimatedMinutes: number(), difficulty: choice([1, 2, 3]), rewardXp: integer(),
  exercises: list(shape({ exercise, sets: integer(1, 100), target: number(), restSeconds: number(), selectionReasons: optional(list(shape({ code: choice(['prepare', 'training-goal', 'corrective', 'player-scan', 'movement-analysis', 'recovery', 'mobility']), label: str }), 10)) }), 200),
  trainingArc: optional(shape({ cycleNumber: integer(1), week: choice([1, 2, 3, 4]), phase, entryDecision: optional(nullable(decision)) })), readinessBand: optional(band), correctiveFocus: optional(choice(CORRECTIVE_GOALS)),
  weeklySession: optional(shape({ protocolId: id, code: choice(['A', 'B', 'C', 'D', 'E', 'F', 'G']), sessionIndex: integer(0, 6), sessionCount: integer(1, 7), weekStartDateKey: day, objective: str })),
});

export function assertValidSnapshot(value: unknown): asserts value is AppSnapshot {
  shape({ schemaVersion: choice([15]), onboardingComplete: bool, profile: nullable(profile), history, pendingArcReviewId: nullable(id),
    dailyQuest: nullable(shape({ id, dateKey: day, status: choice(['available', 'active', 'complete']), plan })),
    activeWorkout: nullable(shape({ questId: id, plan, warmupSets: optional(list(list(setPerformance, 5), 200)), recordedSets: optional(list(list(nullable(setPerformance), 100), 200)), exerciseIndex: integer(0, 200), completedSets: list(integer(0, 100), 200), startedAt: date })),
    weeklyProtocol: nullable(shape({ id, weekStartDateKey: day, weekEndDateKey: day, createdAt: date, profileFingerprint: str, trainingArcCycle: nullable(integer(1)), trainingArcWeek: nullable(integer(1, 4)), volumeCaps: numericMap(MUSCLE_GROUPS), sessions: list(shape({ code: choice(['A', 'B', 'C', 'D', 'E', 'F', 'G']), dateKey: day, title: str, objective: str, focusMuscles: list(choice(MUSCLE_GROUPS), 11), plan }), 7) })),
    lastCompletion: nullable(shape({ id, planTitle: str, xpEarned: integer(), attributeXpEarned: stats, statGains: stats, levelBefore: integer(1), levelAfter: integer(1), rankBefore: rank, rankAfter: rank, rankTrial: bool })),
  })(value, 'snapshot');
  const snapshot = value as AppSnapshot;
  if (snapshot.onboardingComplete !== Boolean(snapshot.profile)) fail('snapshot.profile');
  const p = snapshot.profile;
  for (const entries of [snapshot.history, p?.movementAssessments ?? [], p?.trainingArcs ?? [], p?.trainingArcReviews ?? [], p?.postureScans ?? []]) {
    if (new Set(entries.map((entry) => entry.id)).size !== entries.length) fail('duplicate IDs');
  }
  if (p) {
    const block = p.returnPlan;
    if (block) {
      if ((block.endedAt === null) !== (block.endDateKey === null) || (block.endedAt === null) !== (block.exitReason === null)
        || (block.endedAt && (Date.parse(block.endedAt) < Date.parse(block.startedAt) || block.endDateKey! < block.startDateKey))) fail('return plan chronology');
      for (const [timestamp, dateKey] of [[block.startedAt, block.startDateKey], [block.endedAt, block.endDateKey]]) {
        if (timestamp && dateKey && Math.abs(Date.parse(timestamp) - Date.parse(`${dateKey}T12:00:00Z`)) > 86400000) fail('return plan date');
      }
      for (const entry of snapshot.history.filter((entry) => entry.returnBlockId === block.id)) {
        if (entry.dateKey < block.startDateKey || Date.parse(entry.date) < Date.parse(block.startedAt)
          || block.endedAt && Date.parse(entry.date) > Date.parse(block.endedAt)) fail('return completion chronology');
      }
    }
    if (!p.availableEquipment.includes('none')) fail('equipment');
    if (p.loadouts) {
      validateLoadouts(p.loadouts, p.machineSetups ?? []);
      if ([...p.availableEquipment].sort().join('|') !== [...p.loadouts[p.loadouts.active]].sort().join('|')) fail('active loadout equipment');
    } else if (p.machineSetups?.length) fail('machine location');
    for (const signal of p.readinessLog) if (signal.band !== calculateReadinessBand(signal)) fail('readiness band');
    if (new Set(p.readinessLog.map((signal) => signal.dateKey)).size !== p.readinessLog.length) fail('duplicate readiness days');
    if (p.trainingArcs.filter((arc) => !arc.completionAssessmentId).length > 1) fail('active training arcs');
    for (const arc of p.trainingArcs) if (!p.movementAssessments.some((assessment) => assessment.id === arc.baselineAssessmentId)) fail('arc baseline');
    for (const scan of p.postureScans) for (const view of POSTURE_VIEWS) if (scan.photos[view].view !== view) fail('photo view');
  }
  if (snapshot.pendingArcReviewId && !p?.trainingArcReviews.some((review) => review.id === snapshot.pendingArcReviewId)) fail('pending report');
  for (const workout of snapshot.history) for (const result of workout.results) {
    const known = EXERCISE_BY_ID.get(result.exerciseId);
    if (known && result.recordedSets?.some((set) => set !== null && !isValidSetPerformance(set, known))) fail('recorded set performance');
    if (result.warmupSets?.some((set) => !known?.loading || known.repType !== 'reps' || !isValidSetPerformance(set, known) || set.loadDecision)) fail('warm-up history');
    if (result.recordedSets?.some((set, index) => set?.loadDecision && (index !== 0 || set.loadDecision.evidenceDateKeys.some((d) => d >= workout.dateKey)))) fail('load decision history');
    if (result.recordedSets && (result.recordedSets.length !== result.completedSets
      || result.recordedSets.reduce((sum, set) => sum + (set?.actual ?? result.targetPerSet), 0) !== result.completedVolume)) fail('recorded workout sets');
  }
  const active = snapshot.activeWorkout;
  for (const workout of snapshot.history) if (workout.returnBlockId && workout.planId.startsWith('rank-trial-')) fail('return trial');
  for (const candidate of [snapshot.dailyQuest?.plan, active?.plan, ...(snapshot.weeklyProtocol?.sessions.map((s) => s.plan) ?? [])]) {
    if (candidate?.returnBlockId && (candidate.kind !== 'training' || candidate.exercises.some(({ exercise: e, sets, target }) => e.difficulty > 2
      || (!['warmup', 'mobility'].includes(e.exerciseType) && (sets > 2 || target !== e.minReps))))) fail('return plan limits');
  }
  if (active?.plan.returnBlockId && (!p?.returnPlan || p.returnPlan.endedAt !== null || active.plan.returnBlockId !== p.returnPlan.id)) fail('active return plan');
  if (active?.warmupSets && (active.warmupSets.length !== active.plan.exercises.length
    || active.warmupSets.some((sets, index) => sets.some((set) => active.plan.kind !== 'training' || index > active.exerciseIndex
      || !active.plan.exercises[index]!.exercise.loading || active.plan.exercises[index]!.exercise.repType !== 'reps'
      || !isValidSetPerformance(set, active.plan.exercises[index]!.exercise) || set.loadDecision)))) fail('active warm-ups');
  if (active?.recordedSets?.some((sets) => sets.some((set, index) => set?.loadDecision && (index !== 0 || active.plan.kind !== 'training'
    || set.loadDecision.evidenceDateKeys.some((d) => d >= active.plan.dateKey))))) fail('active load decision');
  if (active?.recordedSets && (active.recordedSets.length !== active.plan.exercises.length
    || active.recordedSets.some((sets, index) => sets.length !== active.completedSets[index]
      || sets.some((set) => set !== null && !isValidSetPerformance(set, active.plan.exercises[index]!.exercise))))) fail('recorded active sets');
  if (active && (!p || active.exerciseIndex > active.plan.exercises.length || active.completedSets.length !== active.plan.exercises.length || active.completedSets.some((sets, index) => sets > active.plan.exercises[index]!.sets))) fail('active workout');
}
