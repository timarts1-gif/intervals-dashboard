import type {
  IntervalsActivity,
  IntervalsAthlete,
  IntervalsPowerCurve,
  IntervalsWellness,
} from '../types/intervals.js';
import type { Activity, Athlete, PowerCurve, WellnessDay } from '../types/api.js';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function toActivity(a: IntervalsActivity): Activity {
  return {
    id: a.id,
    date: a.start_date_local,
    type: a.type,
    name: a.name ?? '',
    movingTime: num(a.moving_time) ?? 0,
    elapsedTime: num(a.elapsed_time) ?? 0,
    distance: num(a.distance) ?? 0,
    elevationGain: num(a.total_elevation_gain) ?? 0,
    trainingLoad: num(a.icu_training_load),
    intensityFactor: num(a.icu_intensity) !== null ? (a.icu_intensity as number) / 100 : null,
    avgPower: num(a.icu_average_watts),
    normalizedPower: num(a.icu_weighted_avg_watts),
    ftp: num(a.icu_ftp),
    eftp: num(a.icu_rolling_ftp),
    kilojoules: num(a.icu_joules) !== null ? Math.round((a.icu_joules as number) / 1000) : null,
    calories: num(a.calories),
    avgHr: num(a.average_heartrate),
    maxHr: num(a.max_heartrate),
    avgSpeed: num(a.average_speed),
    avgCadence: num(a.average_cadence),
    efficiencyFactor: num(a.icu_efficiency_factor),
    variabilityIndex: num(a.icu_variability_index),
    decoupling: num(a.decoupling),
    ctl: num(a.icu_ctl),
    atl: num(a.icu_atl),
    powerZoneTimes: (a.icu_zone_times ?? []).map((z) => ({ id: z.id, secs: z.secs })),
    hrZoneTimes: a.icu_hr_zone_times ?? [],
    trainer: a.trainer ?? false,
    race: a.race ?? false,
    weight: num(a.icu_weight),
  };
}

export function toWellness(w: IntervalsWellness): WellnessDay {
  const ctl = num(w.ctl);
  const atl = num(w.atl);
  return {
    date: w.id,
    ctl,
    atl,
    tsb: ctl !== null && atl !== null ? ctl - atl : null,
    rampRate: num(w.rampRate),
    weight: num(w.weight),
    restingHr: num(w.restingHR),
    hrv: num(w.hrv),
    sleepSecs: num(w.sleepSecs),
    eftpBySport: Object.fromEntries(
      (w.sportInfo ?? []).filter((s) => num(s.eftp) !== null).map((s) => [s.type, s.eftp as number]),
    ),
  };
}

export function toAthlete(a: IntervalsAthlete): Athlete {
  return {
    id: a.id,
    name: a.name ?? [a.firstname, a.lastname].filter(Boolean).join(' '),
    timezone: a.timezone ?? null,
    weight: num(a.icu_weight) ?? num(a.weight),
    restingHr: num(a.icu_resting_hr),
    sports: (a.sportSettings ?? []).map((s) => ({
      types: s.types,
      ftp: num(s.ftp),
      indoorFtp: num(s.indoor_ftp),
      wPrime: num(s.w_prime),
      pMax: num(s.p_max),
      lthr: num(s.lthr),
      maxHr: num(s.max_hr),
      powerZones: s.power_zones ?? [],
      powerZoneNames: s.power_zone_names ?? [],
      hrZones: s.hr_zones ?? [],
      hrZoneNames: s.hr_zone_names ?? [],
    })),
  };
}

export function toPowerCurve(c: IntervalsPowerCurve): PowerCurve {
  const watts = c.values ?? c.watts ?? [];
  return {
    id: c.id,
    label: c.label ?? c.id,
    start: c.start_date_local ?? null,
    end: c.end_date_local ?? null,
    points: c.secs.map((secs, i) => ({
      secs,
      watts: num(watts[i]),
      wkg: num(c.watts_per_kg?.[i]),
      activityId: c.activity_id?.[i] ?? null,
    })),
  };
}
