import type { Activity, Athlete, PowerCurve, Status, WellnessDay } from '../types/api';
import { get, post, request } from './http';
import { authApi } from './authApi';

export { ApiError } from './http';

export const api = {
  ...authApi,
  status: () => get<Status>('/status'),
  athlete: () => get<Athlete>('/athlete'),
  /** Activiteiten plus het aantal dat de API niet levert (via Strava geïmporteerd). */
  activities: async (oldest: string, newest?: string) => {
    const { body, headers } = await request<Activity[]>('/activities', { oldest, newest });
    return { activities: body, unavailable: Number(headers.get('X-Unavailable-Activities') ?? 0) };
  },
  wellness: (oldest: string, newest?: string) => get<WellnessDay[]>('/wellness', { oldest, newest }),
  powerCurves: (type = 'Ride', curves?: string) => get<PowerCurve[]>('/power-curves', { type, curves }),
  clearCache: () => post<{ cleared: true }>('/cache/clear'),
};
