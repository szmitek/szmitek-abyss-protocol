import { EQUIPMENT, type Equipment } from '../domain/types.ts';

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: EQUIPMENT.NONE, label: 'NO EQUIPMENT' },
  { value: EQUIPMENT.MAT, label: 'MAT' },
  { value: EQUIPMENT.DUMBBELLS, label: 'DUMBBELLS' },
  { value: EQUIPMENT.BANDS, label: 'BANDS' },
  { value: EQUIPMENT.PULL_UP_BAR, label: 'PULL-UP BAR' },
  { value: EQUIPMENT.BENCH, label: 'BENCH' },
  { value: EQUIPMENT.KETTLEBELL, label: 'KETTLEBELL' },
  { value: EQUIPMENT.BARBELL, label: 'BARBELL + PLATES' },
  { value: EQUIPMENT.RACK, label: 'RACK WITH SAFETIES' },
  { value: EQUIPMENT.CABLE, label: 'CABLE STATION + HANDLE' },
  { value: EQUIPMENT.CHEST_PRESS, label: 'CHEST PRESS MACHINE' },
  { value: EQUIPMENT.LEG_PRESS, label: 'LEG PRESS MACHINE' },
  { value: EQUIPMENT.LAT_PULLDOWN, label: 'LAT PULLDOWN MACHINE' },
];
