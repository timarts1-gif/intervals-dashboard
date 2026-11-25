/** Indeling van Intervals.icu-activiteitstypes (enum uit de API-specificatie) in sportgroepen. */

export type SportGroup = 'cycling' | 'running' | 'strength' | 'swimming' | 'other';

export const SPORT_GROUPS: Record<SportGroup, { label: string; color: string; types: string[] }> = {
  cycling: {
    label: 'Fietsen',
    color: '#f97316',
    types: [
      'Ride',
      'VirtualRide',
      'GravelRide',
      'MountainBikeRide',
      'TrackRide',
      'Cyclocross',
      'EBikeRide',
      'EMountainBikeRide',
      'Velomobile',
      'Handcycle',
    ],
  },
  running: { label: 'Hardlopen', color: '#38bdf8', types: ['Run', 'VirtualRun', 'TrailRun'] },
  strength: {
    label: 'Kracht',
    color: '#a78bfa',
    types: ['WeightTraining', 'Crossfit', 'HighIntensityIntervalTraining', 'Workout', 'Pilates', 'Yoga'],
  },
  swimming: { label: 'Zwemmen', color: '#2dd4bf', types: ['Swim', 'OpenWaterSwim'] },
  other: { label: 'Overig', color: '#94a3b8', types: [] },
};

export const GROUP_ORDER: SportGroup[] = ['cycling', 'running', 'strength', 'swimming', 'other'];

const typeToGroup = new Map<string, SportGroup>();
for (const g of GROUP_ORDER) for (const t of SPORT_GROUPS[g].types) typeToGroup.set(t, g);

export const sportGroupOf = (type: string): SportGroup => typeToGroup.get(type) ?? 'other';
export const isCycling = (type: string) => sportGroupOf(type) === 'cycling';

const TYPE_LABELS: Record<string, string> = {
  Ride: 'Rit',
  VirtualRide: 'Virtuele rit',
  GravelRide: 'Gravel',
  MountainBikeRide: 'MTB',
  TrackRide: 'Baan',
  Cyclocross: 'Veldrijden',
  EBikeRide: 'E-bike',
  Run: 'Hardlopen',
  VirtualRun: 'Loopband',
  TrailRun: 'Trail',
  WeightTraining: 'Kracht',
  Swim: 'Zwemmen',
  Walk: 'Wandelen',
  Hike: 'Hiken',
  Workout: 'Workout',
  Yoga: 'Yoga',
};

export const typeLabel = (type: string) => TYPE_LABELS[type] ?? type;
