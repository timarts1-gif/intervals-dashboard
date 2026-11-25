/**
 * Subset van de Intervals.icu API-schema's (bron: https://intervals.icu/api/v1/docs).
 * Alleen de velden die het dashboard gebruikt zijn opgenomen.
 */

export interface IntervalsZoneTime {
  id: string;
  secs: number;
}

export interface IntervalsActivity {
  id: string;
  start_date_local: string;
  type: string;
  name?: string;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  total_elevation_gain?: number;
  icu_training_load?: number;
  icu_intensity?: number;
  icu_average_watts?: number;
  icu_weighted_avg_watts?: number;
  icu_ftp?: number;
  icu_rolling_ftp?: number;
  icu_pm_ftp?: number;
  icu_joules?: number;
  calories?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number;
  average_cadence?: number;
  icu_efficiency_factor?: number;
  icu_variability_index?: number;
  decoupling?: number;
  icu_ctl?: number;
  icu_atl?: number;
  icu_zone_times?: IntervalsZoneTime[];
  icu_hr_zone_times?: number[];
  trainer?: boolean;
  race?: boolean;
  icu_weight?: number;
}

export interface IntervalsSportInfo {
  type: string;
  eftp?: number;
  wPrime?: number;
  pMax?: number;
}

export interface IntervalsWellness {
  id: string; // datum, YYYY-MM-DD
  ctl?: number;
  atl?: number;
  rampRate?: number;
  ctlLoad?: number;
  atlLoad?: number;
  sportInfo?: IntervalsSportInfo[];
  weight?: number;
  restingHR?: number;
  hrv?: number;
  sleepSecs?: number;
  sleepScore?: number;
  vo2max?: number;
}

export interface IntervalsSportSettings {
  id: number;
  types: string[];
  ftp?: number;
  indoor_ftp?: number;
  w_prime?: number;
  p_max?: number;
  lthr?: number;
  max_hr?: number;
  power_zones?: number[];
  power_zone_names?: string[];
  hr_zones?: number[];
  hr_zone_names?: string[];
  sweet_spot_min?: number;
  sweet_spot_max?: number;
}

export interface IntervalsAthlete {
  id: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  timezone?: string;
  icu_weight?: number;
  weight?: number;
  icu_resting_hr?: number;
  sportSettings?: IntervalsSportSettings[];
}

export interface IntervalsPowerCurve {
  id: string;
  label?: string;
  start_date_local?: string;
  end_date_local?: string;
  days?: number;
  secs: number[];
  values?: number[];
  watts?: number[];
  watts_per_kg?: number[];
  activity_id?: string[];
  weight?: number;
}

export interface IntervalsPowerCurveSet {
  list: IntervalsPowerCurve[];
}

/** Subset van SummaryWithCats (athlete-summary). Overige velden (email, weight, ...) worden genegeerd. */
export interface IntervalsAthleteSummary {
  athlete_id: string;
  athlete_name?: string;
  date?: string;
}
