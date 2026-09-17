import { toDateKey } from './date.ts';

export const BODY_METRICS = ['weight', 'waist', 'hips', 'chest', 'upperArm', 'thigh', 'calf'] as const;
export type BodyMetric = typeof BODY_METRICS[number];
export type BodyValues = Record<BodyMetric, number | null>;
export interface BodyMeasurement {
  id: string;
  measuredOn: string;
  recordedAt: string;
  schemaVersion: 1;
  protocolId: string;
  units: { weight: 'kg'; circumference: 'cm' };
  values: BodyValues;
}
export const BODY_PROTOCOL = 'home-morning-relaxed-right-v1';
export function isMeasurementDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function assertBodyMeasurement(value: unknown): asserts value is BodyMeasurement {
  const m = value as BodyMeasurement | null;
  if (!m || typeof m.id !== 'string' || !m.id.length || m.id.length > 256 || m.schemaVersion !== 1
    || typeof m.protocolId !== 'string' || !m.protocolId.length || m.protocolId.length > 128
    || typeof m.measuredOn !== 'string' || !isMeasurementDay(m.measuredOn)
    || typeof m.recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(m.recordedAt) || !Number.isFinite(Date.parse(m.recordedAt))
    || m.units?.weight !== 'kg' || m.units?.circumference !== 'cm' || !m.values) throw new Error('Invalid body measurement.');
  for (const key of BODY_METRICS) {
    const v = m.values[key];
    if (v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 1000)) throw new Error('Measurements must be positive numbers, or blank.');
  }
  if (BODY_METRICS.every((key) => m.values[key] === null)) throw new Error('Enter at least one measurement.');
}
export function createBodyMeasurement(id: string, measuredOn: string, values: Partial<BodyValues>, now = new Date()): BodyMeasurement {
  const measurement: BodyMeasurement = {
    id, measuredOn, recordedAt: now.toISOString(), schemaVersion: 1, protocolId: BODY_PROTOCOL,
    units: { weight: 'kg', circumference: 'cm' },
    values: Object.fromEntries(BODY_METRICS.map((key) => [key, values[key] ?? null])) as BodyValues,
  };
  assertBodyMeasurement(measurement);
  if (measuredOn > toDateKey(now)) throw new Error('Choose today or an earlier measurement date.');
  return measurement;
}
export function appendBodyMeasurement(history: readonly BodyMeasurement[], measurement: BodyMeasurement): BodyMeasurement[] {
  assertBodyMeasurement(measurement);
  if (history.some((item) => item.id === measurement.id)) throw new Error('This measurement is already recorded.');
  if (history.length >= 10000) throw new Error('Measurement archive limit reached. Export a backup before continuing.');
  return [...history, { ...measurement, units: { ...measurement.units }, values: { ...measurement.values } }];
}
export function sortBodyMeasurements(history: readonly BodyMeasurement[]): BodyMeasurement[] {
  return [...history].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id));
}
export function bodyMeasurementStats(history: readonly BodyMeasurement[], period?: { from: string; to: string }) {
  if (period && (!isMeasurementDay(period.from) || !isMeasurementDay(period.to) || period.from > period.to)) throw new Error('Invalid measurement period.');
  const entries = sortBodyMeasurements(history).filter((m) => !period || m.measuredOn >= period.from && m.measuredOn <= period.to);
  const metrics = Object.fromEntries(BODY_METRICS.map((key) => {
    const available = entries.filter((m) => m.values[key] !== null);
    const latest = available.at(-1) ?? null;
    const comparable = available.filter((m) => m.protocolId === latest?.protocolId);
    // Equal weight per measured day: repeated entries do not overweight a day.
    const days = new Map<string, number[]>();
    for (const m of comparable) days.set(m.measuredOn, [...(days.get(m.measuredOn) ?? []), m.values[key]!]);
    const dailyMeans = [...days].map(([date, values]) => ({ date, value: values.reduce((a, b) => a + b, 0) / values.length }));
    const firstDay = dailyMeans[0], lastDay = dailyMeans.at(-1);
    const previous = comparable.filter((m) => m.measuredOn < (latest?.measuredOn ?? '')).at(-1) ?? null;
    return [key, { unit: key === 'weight' ? 'kg' : 'cm', latest: latest ? { id: latest.id, date: latest.measuredOn, value: latest.values[key]! } : null,
      previous: previous ? { id: previous.id, date: previous.measuredOn, value: previous.values[key]! } : null,
      change: latest && previous ? latest.values[key]! - previous.values[key]! : null,
      mean: dailyMeans.length ? dailyMeans.reduce((sum, d) => sum + d.value, 0) / dailyMeans.length : null,
      firstToLastDailyMeanChange: dailyMeans.length > 1 ? lastDay!.value - firstDay!.value : null,
      sampleCount: comparable.length, measuredDays: days.size, excludedProtocolCount: available.length - comparable.length,
      protocolId: latest?.protocolId ?? null, evidenceIds: comparable.map((m) => m.id),
    }];
  })) as Record<BodyMetric, { unit: string; latest: { id: string; date: string; value: number } | null; previous: { id: string; date: string; value: number } | null; change: number | null; mean: number | null; firstToLastDailyMeanChange: number | null; sampleCount: number; measuredDays: number; excludedProtocolCount: number; protocolId: string | null; evidenceIds: string[] }>;
  return { recordCount: entries.length, measuredDays: new Set(entries.map((m) => m.measuredOn)).size, metrics };
}
