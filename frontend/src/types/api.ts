/** Types zoals de backend ze levert (gelijk houden met backend/src/types/api.ts). */

export interface Activity {
  id: string;
  date: string; // lokale datum/tijd, ISO zonder tijdzone
  type: string;
  name: string;
  movingTime: number; // s
  elapsedTime: number; // s
  distance: number; // m
  elevationGain: number; // m
  trainingLoad: number | null;
  intensityFactor: number | null; // 0-1+
  avgPower: number | null;
  normalizedPower: number | null;
  ftp: number | null;
  eftp: number | null;
  kilojoules: number | null;
  calories: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgSpeed: number | null; // m/s
  avgCadence: number | null;
  efficiencyFactor: number | null;
  variabilityIndex: number | null;
  decoupling: number | null; // %
  ctl: number | null;
  atl: number | null;
  powerZoneTimes: { id: string; secs: number }[];
  hrZoneTimes: number[];
  trainer: boolean;
  race: boolean;
  weight: number | null;
}

export interface WellnessDay {
  date: string;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  rampRate: number | null;
  weight: number | null;
  restingHr: number | null;
  hrv: number | null;
  sleepSecs: number | null;
  eftpBySport: Record<string, number>;
}

export interface SportProfile {
  types: string[];
  ftp: number | null;
  indoorFtp: number | null;
  wPrime: number | null;
  pMax: number | null;
  lthr: number | null;
  maxHr: number | null;
  powerZones: number[];
  powerZoneNames: string[];
  hrZones: number[];
  hrZoneNames: string[];
}

export interface Athlete {
  id: string;
  name: string;
  timezone: string | null;
  weight: number | null;
  restingHr: number | null;
  sports: SportProfile[];
}

export interface PowerCurvePoint {
  secs: number;
  watts: number | null;
  wkg: number | null;
  activityId: string | null;
}

export interface PowerCurve {
  id: string;
  label: string;
  start: string | null;
  end: string | null;
  points: PowerCurvePoint[];
}

export interface Health {
  status: string;
  configured: boolean;
  athleteId: string;
  cacheEntries: number;
}
