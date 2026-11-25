import 'dotenv/config';

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Omgevingsvariabele ${name} moet een getal zijn, kreeg "${raw}"`);
  }
  return value;
}

export const config = {
  port: readNumber('PORT', 4000),
  intervals: {
    baseUrl: process.env.INTERVALS_BASE_URL ?? 'https://intervals.icu/api/v1',
    apiKey: process.env.INTERVALS_API_KEY ?? '',
    athleteId: process.env.INTERVALS_ATHLETE_ID || '0',
  },
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  cacheTtlMs: readNumber('CACHE_TTL_SECONDS', 300) * 1000,
  /** Map met de gebouwde frontend; wordt geserveerd als die bestaat (productie). */
  staticDir: process.env.STATIC_DIR ?? '',
} as const;

export const isConfigured = (): boolean => config.intervals.apiKey.length > 0;
