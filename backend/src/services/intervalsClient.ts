import type { AppConfig } from '../config/env.js';
import { HttpError } from '../middleware/errorHandler.js';
import { TtlCache } from './cache.js';
import type {
  IntervalsActivity,
  IntervalsAthlete,
  IntervalsAthleteSummary,
  IntervalsFollowedAthlete,
  IntervalsPowerCurveSet,
  IntervalsWellness,
} from '../types/intervals.js';

/** Velden die we bij activiteiten opvragen (houdt de payload klein). */
const ACTIVITY_FIELDS = [
  'id',
  'start_date_local',
  'type',
  'name',
  'moving_time',
  'elapsed_time',
  'distance',
  'total_elevation_gain',
  'icu_training_load',
  'icu_intensity',
  'icu_average_watts',
  'icu_weighted_avg_watts',
  'icu_ftp',
  'icu_rolling_ftp',
  'icu_pm_ftp',
  'icu_joules',
  'calories',
  'average_heartrate',
  'max_heartrate',
  'average_speed',
  'average_cadence',
  'icu_efficiency_factor',
  'icu_variability_index',
  'decoupling',
  'icu_ctl',
  'icu_atl',
  'icu_zone_times',
  'icu_hr_zone_times',
  'trainer',
  'race',
  'icu_weight',
].join(',');

export function createIntervalsClient(config: AppConfig) {
  const cache = new TtlCache(config.cacheTtlMs);

  function authHeader(): string {
    // Intervals.icu: Basic auth met gebruikersnaam "API_KEY" en de API-key als wachtwoord.
    const token = Buffer.from(`API_KEY:${config.intervals.apiKey}`).toString('base64');
    return `Basic ${token}`;
  }

  async function request<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T> {
    const url = new URL(`${config.intervals.baseUrl}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }

    return cache.getOrSet(url.toString(), async () => {
      const res = await fetch(url, {
        headers: { Authorization: authHeader(), Accept: 'application/json' },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 401 || res.status === 403) {
          throw new HttpError(502, 'Intervals.icu weigert de API-key of athlete-ID. Controleer backend/.env.');
        }
        throw new HttpError(502, `Intervals.icu gaf ${res.status} terug: ${body.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    });
  }

  const athletePath = (id = config.intervals.athleteId) => `/athlete/${encodeURIComponent(id)}`;

  return {
    getAthlete: () => request<IntervalsAthlete>(athletePath()),

    listActivities: (oldest: string, newest?: string) =>
      request<IntervalsActivity[]>(`${athletePath()}/activities`, {
        oldest,
        newest,
        fields: ACTIVITY_FIELDS,
      }),

    listWellness: (oldest: string, newest?: string) =>
      request<IntervalsWellness[]>(`${athletePath()}/wellness`, { oldest, newest }),

    listPowerCurves: (type: string, curves?: string) =>
      request<IntervalsPowerCurveSet>(`${athletePath()}/power-curves`, { type, curves }),

    /** Atleten die je volgt of coacht, inclusief jezelf (GET /athletes). */
    listAthletes: () => request<IntervalsFollowedAthlete[]>('/athletes'),

    /** Atleten die je volgt of coacht (GET /athlete/{id}/athlete-summary.json). */
    athleteSummary: () => request<IntervalsAthleteSummary[]>(`${athletePath()}/athlete-summary.json`),

    /** Wellness van een (gecoachte) atleet met alleen de gevraagde velden. */
    listWellnessFields: (athleteId: string, oldest: string, newest: string, fields: string[]) =>
      request<IntervalsWellness[]>(`${athletePath(athleteId)}/wellness`, { oldest, newest, fields: fields.join(',') }),

    clearCache: () => cache.clear(),
    cacheSize: () => cache.size,
  };
}

export type IntervalsClient = ReturnType<typeof createIntervalsClient>;
