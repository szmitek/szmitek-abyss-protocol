// Strict, platform-independent allowlist for future text-only Arc Review payloads.
// This validates the supported public data contract, not authentication, consent,
// clinical accuracy, costs or server-side ownership of a submitted request.
import { BODY_METRICS } from './bodyMeasurements.ts';
import { MOVEMENT_CHECKS } from './types.ts';
import type { WeeklyReviewInput } from './aiContracts.ts';

type Scalar = 'string' | 'number' | 'nonnegative-integer' | 'boolean' | 'null' | 'date';
type Schema =
  | Scalar
  | { readonly kind: 'array'; readonly element: Schema }
  | { readonly kind: 'object'; readonly fields: Readonly<Record<string, Schema>>; readonly optional: readonly string[] }
  | { readonly kind: 'union'; readonly options: readonly Schema[] }
  | { readonly kind: 'literal'; readonly value: string | number | boolean };

const array = (element: Schema): Schema => ({ kind: 'array', element });
const obj = (fields: Record<string, Schema>, optional: string[] = []): Schema =>
  ({ kind: 'object', fields, optional });
const either = (...options: Schema[]): Schema => ({ kind: 'union', options });
const literal = (value: string | number | boolean): Schema => ({ kind: 'literal', value });
const nullable = (value: Schema): Schema => either(value, 'null');
const count: Schema = 'nonnegative-integer';

const period = obj({
  from: 'date', to: 'date', timeZone: 'string', bounds: literal('inclusive-local-dates'),
});
const movementCheck = obj({
  id: 'string', kind: either(literal('baseline'), literal('reassessment')),
  date: 'string', dateKey: 'date',
  results: obj(Object.fromEntries(MOVEMENT_CHECKS.map(key => [key, either(literal('clear'), literal('limited'), literal('pain'))]))),
});
const machine = obj({ id: 'string', exerciseId: 'string', location: 'string', label: 'string' });
const decision = obj({
  previousKg: 'number', incrementKg: 'number', evidenceDateKeys: array('date'),
});
const set = obj({
  actual: 'number', loadKg: nullable('number'), effort: nullable('string'),
  loadDecision: decision, machineSetup: machine,
}, ['loadDecision', 'machineSetup']);
const measurementPoint = obj({ id: 'string', date: 'date', value: 'number' });
const measurementMetric = obj({
  unit: 'string', latest: nullable(measurementPoint), previous: nullable(measurementPoint),
  change: nullable('number'), mean: nullable('number'),
  firstToLastDailyMeanChange: nullable('number'),
  sampleCount: count, measuredDays: count, excludedProtocolCount: count,
  protocolId: nullable('string'), evidenceIds: array('string'),
});
const measurement = obj({
  id: 'string', measuredOn: 'date', recordedAt: 'string', schemaVersion: literal(1),
  protocolId: 'string', units: obj({ weight: literal('kg'), circumference: literal('cm') }),
  values: obj(Object.fromEntries(BODY_METRICS.map(key => [key, nullable('number')]))),
});

const arcContext = obj({
  contractVersion: literal('arc-review-context.v1'), arcId: 'string', cycleNumber: count,
  state: either(literal('in_progress'), literal('ready_for_reassessment'), literal('completed')),
  checkpoints: obj({ baseline: nullable(movementCheck), completion: nullable(movementCheck) }),
  nominalEnd: 'date', actualEnd: nullable('date'),
  plannedFrequency: nullable(obj({ workoutsPerWeek: count, source: 'string' })),
  profileContext: obj({
    scope: literal('current-settings-not-historical-plan'), goal: 'string',
    experienceLevel: 'string', workoutDuration: count, availableEquipment: array('string'),
  }),
  limitations: array('string'),
});

const review: Schema = obj({
  contractVersion: literal('weekly-review.v1'), requestId: 'string', locale: literal('en'),
  period,
  facts: array(obj({
    id: 'string', type: literal('FACT'), metric: 'string', value: nullable('number'),
    unit: 'string', sourceIds: array('string'), method: 'string', period,
  })),
  training: array(obj({
    id: 'string', dateKey: 'date', completed: 'boolean', durationSeconds: count,
    context: 'string',
  })),
  exerciseExposures: array(obj({
    id: 'string', workoutId: 'string', dateKey: 'date', exerciseId: 'string',
    unit: 'string', loading: nullable('string'), comparisonKey: nullable('string'),
    recordedSets: array(nullable(set)), warmupSets: array(set),
    actualVolume: nullable('number'), externalLoadVolume: nullable('number'),
    prescribedVolume: 'number', missingActualSets: count, context: 'string',
  })),
  adherence: obj({
    completedTrainingSessions: count, activeDays: count, plannedSessions: nullable(count),
    rate: nullable('number'), reason: 'string',
  }),
  archivedAdherence: array(obj({
    id: 'string', completedSessions: count, scheduledSessions: count, rate: 'number',
    targetSource: 'string', scope: literal('archived-cycle-not-review-period'),
  })),
  wellbeing: array(obj({
    id: 'string', date: 'string', dateKey: 'date', energy: 'string',
    sleep: 'string', soreness: 'string', soreMuscles: array('string'),
    painOrWarning: 'boolean', band: 'string',
  })),
  tests: obj({ method: literal('self-report'), records: array(movementCheck) }),
  body: obj({
    records: array(measurement),
    statistics: obj({
      recordCount: count, measuredDays: count,
      metrics: obj(Object.fromEntries(BODY_METRICS.map(key => [key, measurementMetric]))),
    }),
  }),
  dataCoverage: obj({
    calendarDays: count, wellbeingDays: count, missingWellbeingDays: count,
    measurementDays: count, missingActualSets: count,
  }),
  photos: obj({
    status: literal('no_pixels_attached'), localAnalysis: literal('not_run'),
    manifest: array(obj({
      id: 'string', recordedOn: 'date', protocol: nullable('string'), views: array('string'),
    })),
  }),
  constraints: obj({
    mayModifyPlan: literal(false), mayDiagnose: literal(false),
    mayEstimateBodyComposition: literal(false),
  }),
  arcContext,
});

function plainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function followsSchema(value: unknown, schema: Schema, depth = 0): boolean {
  if (depth > 40) return false;
  if (typeof schema === 'string') {
    if (schema === 'string') return typeof value === 'string';
    if (schema === 'number') return typeof value === 'number' && Number.isFinite(value);
    if (schema === 'nonnegative-integer') return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
    if (schema === 'boolean') return typeof value === 'boolean';
    if (schema === 'null') return value === null;
    if (schema === 'date') return typeof value === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value))
      && new Date(value).toISOString().slice(0, 10) === value;
  }
  if (typeof schema === 'string') return false;
  if (schema.kind === 'literal') return value === schema.value;
  if (schema.kind === 'union') return schema.options.some(option => followsSchema(value, option, depth + 1));
  if (schema.kind === 'array') return Array.isArray(value)
    && value.every(entry => followsSchema(entry, schema.element, depth + 1));
  if (schema.kind === 'object') {
    if (!plainObject(value)) return false;
    const fields = Object.keys(schema.fields);
    const present = Object.keys(value);
    return present.every(key => fields.includes(key))
      && fields.every(key => schema.optional.includes(key) || Object.prototype.hasOwnProperty.call(value, key))
      && present.every(key => followsSchema(value[key], schema.fields[key]!, depth + 1));
  }
  return false;
}

/** Refuse unknown nested fields instead of silently transmitting additions. */
export function assertTextArcSchema(input: unknown): asserts input is WeeklyReviewInput {
  if (!followsSchema(input, review)) {
    throw new Error('Text Arc Review has an unsupported or incomplete data field.');
  }
}
