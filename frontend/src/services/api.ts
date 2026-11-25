import type { Activity, Athlete, Health, PowerCurve, WellnessDay } from '../types/api';

/** Basis-URL van de backend. Leeg = zelfde origin (Vite-proxy in dev, Express in productie). */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const url = `${BASE}/api${path}${qs.size ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError(0, 'Backend niet bereikbaar. Draait "npm run dev" in de projectmap?');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Fout ${res.status}`);
  return body as T;
}

export const api = {
  health: () => get<Health>('/health'),
  athlete: () => get<Athlete>('/athlete'),
  activities: (oldest: string, newest?: string) => get<Activity[]>('/activities', { oldest, newest }),
  wellness: (oldest: string, newest?: string) => get<WellnessDay[]>('/wellness', { oldest, newest }),
  powerCurves: (type = 'Ride', curves?: string) => get<PowerCurve[]>('/power-curves', { type, curves }),
  clearCache: async () => {
    const res = await fetch(`${BASE}/api/cache/clear`, { method: 'POST' });
    if (!res.ok) throw new ApiError(res.status, 'Cache legen mislukt');
  },
};
