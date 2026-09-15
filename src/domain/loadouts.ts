import { EXERCISE_BY_ID } from '../data/exercises.ts';
import { EQUIPMENT, type MachineSetup, type SetPerformance, type TrainingLoadouts, type TrainingLocation, type UserProfile } from './types.ts';

export function draftLoadouts(profile: UserProfile): TrainingLoadouts {
  return profile.loadouts ?? { active: 'home', home: [...profile.availableEquipment], gym: [EQUIPMENT.NONE] };
}

export function isValidMachineSetup(value: unknown): value is MachineSetup {
  if (!value || typeof value !== 'object') return false;
  const s = value as MachineSetup;
  return typeof s.id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(s.id)
    && ['home', 'gym'].includes(s.location) && EXERCISE_BY_ID.get(s.exerciseId)?.loading === 'stack'
    && typeof s.label === 'string' && s.label.trim() === s.label && s.label.length > 0 && s.label.length <= 60 && ![...s.label].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}

export function validateLoadouts(loadouts: TrainingLoadouts, setups: MachineSetup[]): void {
  if (!loadouts || !['home', 'gym'].includes(loadouts.active)) throw new Error('Select HOME or GYM.');
  for (const location of ['home', 'gym'] as const) {
    const gear = loadouts[location];
    if (!Array.isArray(gear) || !gear.includes(EQUIPMENT.NONE) || gear.length > Object.keys(EQUIPMENT).length
      || new Set(gear).size !== gear.length || gear.some((item) => !Object.values(EQUIPMENT).includes(item))) throw new Error('Select valid equipment for each location.');
  }
  if (!Array.isArray(setups) || setups.length > 50 || setups.some((s) => !isValidMachineSetup(s)) || new Set(setups.map((s) => s.id)).size !== setups.length) throw new Error('Check machine names and identifiers (maximum 50).');
  if (new Set(setups.map((s) => `${s.location}:${s.exerciseId}:${s.label.toLowerCase()}`)).size !== setups.length) throw new Error('Use different names for different machine setups.');
}

export function configureLoadouts(profile: UserProfile, loadouts: TrainingLoadouts, setups: MachineSetup[]): UserProfile {
  validateLoadouts(loadouts, setups);
  // An identifier is immutable: a replacement machine/configuration gets a new record.
  for (const setup of setups) {
    const old = profile.machineSetups?.find((s) => s.id === setup.id);
    if (old && (old.exerciseId !== setup.exerciseId || old.location !== setup.location || old.label !== setup.label)) throw new Error('Create a new setup when the machine or configuration changes.');
  }
  return { ...profile, loadouts: { active: loadouts.active, home: [...loadouts.home], gym: [...loadouts.gym] },
    availableEquipment: [...loadouts[loadouts.active]], machineSetups: setups.map((s) => ({ ...s })) };
}

export function setupsForExercise(profile: UserProfile, exerciseId: string): MachineSetup[] {
  return (profile.machineSetups ?? []).filter((s) => s.exerciseId === exerciseId && s.location === profile.loadouts?.active);
}

export function sameMachine(a: SetPerformance | null, setup: MachineSetup): boolean {
  return a?.machineSetup?.id === setup.id && a.machineSetup.exerciseId === setup.exerciseId
    && a.machineSetup.location === setup.location && a.machineSetup.label === setup.label;
}

export function locationLabel(location?: TrainingLocation): string {
  return location ? location.toUpperCase() : 'CURRENT LOADOUT';
}
