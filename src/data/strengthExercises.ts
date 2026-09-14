import { EQUIPMENT as E, type Exercise, type Equipment, type MovementCheck, type MuscleGroup, type PainArea } from '../domain/types.ts';

function strength(id: string, name: string, description: string, equipment: Equipment[], primary: MuscleGroup,
  secondary: MuscleGroup[], loading: NonNullable<Exercise['loading']>, checks: MovementCheck[], pain: PainArea[], difficulty: 1 | 2 = 1): Exercise {
  return {
    id, name, description, requiredEquipment: equipment, primaryMuscle: primary, muscleGroups: [primary, ...secondary],
    loading, requiredClearChecks: checks, blockedPainAreas: pain, difficulty,
    // Each implement has its own history. A bodyweight success never unlocks an external load.
    progressionGroup: id, progressionLevel: 1, exerciseType: 'strength', repType: 'reps',
    minReps: 8, maxReps: 12, defaultRest: 90,
    statImpact: { strength: 2, vitality: 1 },
    muscleLoad: { [primary]: 3, ...Object.fromEntries(secondary.map((muscle) => [muscle, 2])) },
  };
}

export const STRENGTH_EXERCISES: Exercise[] = [
  strength('dumbbell-floor-press', 'Dumbbell Floor Press', 'Lie on the floor with knees bent. Keep wrists stacked over elbows; lower until upper arms gently meet the floor, then press without bouncing. Log kg per dumbbell.', [E.DUMBBELLS], 'chest', ['shoulders', 'arms'], 'per-hand', ['plank-control'], ['wrists', 'shoulders', 'upper-back-neck']),
  strength('dumbbell-bench-press', 'Dumbbell Bench Press', 'Use a stable flat bench with feet grounded. Lower the dumbbells with control and press through a comfortable range. Log kg per dumbbell.', [E.DUMBBELLS, E.BENCH], 'chest', ['shoulders', 'arms'], 'per-hand', ['plank-control'], ['wrists', 'shoulders', 'upper-back-neck'], 2),
  strength('dumbbell-goblet-squat', 'Dumbbell Goblet Squat', 'Hold one dumbbell close to the chest. Keep heels grounded and knees tracking with toes; squat only as far as you can control. Log the weight of that one dumbbell.', [E.DUMBBELLS], 'quads', ['glutes', 'core'], 'total', ['squat-control', 'plank-control'], ['wrists', 'shoulders', 'knees', 'hips', 'ankles', 'lower-back']),
  strength('dumbbell-rdl', 'Dumbbell Romanian Deadlift', 'Hold two dumbbells close to your legs. With soft knees, move hips backward and stop before your back rounds. Stand by extending the hips. Log kg per dumbbell.', [E.DUMBBELLS], 'hamstrings', ['glutes', 'back'], 'per-hand', ['hip-hinge', 'plank-control'], ['wrists', 'lower-back', 'hips', 'upper-back-neck'], 2),
  strength('dumbbell-curl', 'Dumbbell Curl', 'Stand tall with elbows near your sides. Curl both dumbbells without swinging your torso, then lower slowly. One simultaneous curl is one rep; log kg per dumbbell.', [E.DUMBBELLS], 'arms', [], 'per-hand', ['plank-control'], ['wrists', 'shoulders']),
  strength('dumbbell-seated-press', 'Seated Dumbbell Shoulder Press', 'Sit upright on a stable bench with feet planted. Press overhead through a comfortable range without arching your back. Log kg per dumbbell.', [E.DUMBBELLS, E.BENCH], 'shoulders', ['arms', 'core'], 'per-hand', ['overhead-reach', 'plank-control'], ['wrists', 'shoulders', 'lower-back', 'upper-back-neck'], 2),
  strength('cable-standing-row', 'Standing Cable Row', 'Set the cable at lower-chest height and use its handle. Stand with soft knees; pull toward the ribs without rocking your torso, then return slowly. Log the selected stack marking in kg.', [E.CABLE], 'back', ['arms', 'shoulders'], 'stack', ['hip-hinge', 'plank-control'], ['wrists', 'shoulders', 'lower-back', 'upper-back-neck'], 2),
  strength('machine-chest-press', 'Machine Chest Press', 'Adjust the seat so handles sit near mid-chest. Keep your back supported; press and return smoothly without locking elbows. Log the selected stack marking in kg.', [E.CHEST_PRESS], 'chest', ['shoulders', 'arms'], 'stack', ['plank-control'], ['wrists', 'shoulders', 'upper-back-neck']),
  strength('machine-lat-pulldown', 'Lat Pulldown', 'Secure the thigh pad and grip the bar. Pull toward your upper chest without swinging or pulling behind your neck; return under control. Log the selected stack marking in kg.', [E.LAT_PULLDOWN], 'back', ['arms', 'shoulders'], 'stack', ['overhead-reach', 'plank-control'], ['wrists', 'shoulders', 'upper-back-neck']),
  strength('machine-leg-press', 'Leg Press', 'Adjust the seat and stops. Keep your back and pelvis against the pad, lower through a controlled range and press without locking knees. Log the displayed kg or total added plates; keep using the same convention and machine.', [E.LEG_PRESS], 'quads', ['glutes'], 'stack', ['squat-control', 'hip-hinge'], ['knees', 'hips', 'ankles', 'lower-back']),
  strength('barbell-rdl', 'Barbell Romanian Deadlift', 'Use a load you can set up and control. Keep the bar close, knees soft and spine steady as hips move back; stand without leaning backward. Log total kg including the bar.', [E.BARBELL], 'hamstrings', ['glutes', 'back'], 'total', ['hip-hinge', 'plank-control'], ['wrists', 'lower-back', 'hips', 'upper-back-neck'], 2),
  strength('barbell-bench-press', 'Barbell Bench Press', 'Use a stable bench inside a rack with correctly adjusted safeties. Keep feet grounded, lower the bar under control and press without bouncing. Log total kg including the bar.', [E.BARBELL, E.BENCH, E.RACK], 'chest', ['arms', 'shoulders'], 'total', ['plank-control'], ['wrists', 'shoulders', 'upper-back-neck'], 2),
];
