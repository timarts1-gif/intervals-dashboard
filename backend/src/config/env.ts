import 'dotenv/config';

function readNumber(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Omgevingsvariabele ${name} moet een getal zijn, kreeg "${raw}"`);
  }
  return value;
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1']);

export interface AppConfig {
  port: number;
  /** Interface waarop de server luistert. Standaard alleen deze computer. */
  host: string;
  intervals: { baseUrl: string; apiKey: string; athleteId: string };
  corsOrigins: string[];
  cacheTtlMs: number;
  coach: {
    /** Expliciete lijst athlete-ID's die je coacht (de API onderscheidt coachen niet van volgen). */
    athleteIds: string[];
    cacheTtlMs: number;
  };
  auth: {
    /** false = geen login voor de eigenaar; alleen toegestaan als host loopback is. */
    ownerAuth: boolean;
    ownerPasswordHash: string;
    sharePasswordHash: string;
    sessionSecret: string;
    /** Ophogen trekt alle bestaande sessies in. */
    sessionVersion: number;
    sessionTtlMs: number;
    loginMaxAttempts: number;
    loginWindowMs: number;
  };
  /** Express 'trust proxy'-instelling, nodig achter een reverse proxy voor juiste IP's. */
  trustProxy: string | number | boolean;
  staticDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const host = env.HOST || '127.0.0.1';
  const ownerAuth = (env.OWNER_AUTH ?? 'on').toLowerCase() !== 'off';
  if (!ownerAuth && !LOOPBACK.has(host)) {
    throw new Error('OWNER_AUTH=off mag alleen als HOST een loopback-adres is (127.0.0.1/localhost).');
  }
  const trustRaw = env.TRUST_PROXY ?? '';
  const trustProxy = trustRaw === '' ? false : /^\d+$/.test(trustRaw) ? Number(trustRaw) : trustRaw === 'true' ? true : trustRaw;

  return {
    port: readNumber(env, 'PORT', 4000),
    host,
    intervals: {
      baseUrl: env.INTERVALS_BASE_URL ?? 'https://intervals.icu/api/v1',
      apiKey: env.INTERVALS_API_KEY ?? '',
      athleteId: env.INTERVALS_ATHLETE_ID || '0',
    },
    corsOrigins: (env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    cacheTtlMs: readNumber(env, 'CACHE_TTL_SECONDS', 300) * 1000,
    coach: {
      athleteIds: (env.COACH_ATHLETE_IDS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      cacheTtlMs: readNumber(env, 'COACH_CACHE_TTL_SECONDS', 3600) * 1000,
    },
    auth: {
      ownerAuth,
      ownerPasswordHash: env.OWNER_PASSWORD_HASH ?? '',
      sharePasswordHash: env.SHARE_PASSWORD_HASH ?? '',
      sessionSecret: env.SESSION_SECRET ?? '',
      sessionVersion: readNumber(env, 'SESSION_VERSION', 1),
      sessionTtlMs: readNumber(env, 'SESSION_TTL_HOURS', 12) * 3600 * 1000,
      loginMaxAttempts: readNumber(env, 'LOGIN_MAX_ATTEMPTS', 5),
      loginWindowMs: readNumber(env, 'LOGIN_WINDOW_MINUTES', 15) * 60 * 1000,
    },
    trustProxy,
    staticDir: env.STATIC_DIR ?? '',
  };
}

/** Controleert of de auth-config bruikbaar is; geeft een lijst problemen terug. */
export function authProblems(c: AppConfig): string[] {
  const p: string[] = [];
  const needsSessions = c.auth.ownerAuth || c.auth.sharePasswordHash !== '';
  if (needsSessions && c.auth.sessionSecret.length < 32) p.push('SESSION_SECRET ontbreekt of is korter dan 32 tekens');
  if (c.auth.ownerAuth && !c.auth.ownerPasswordHash) p.push('OWNER_PASSWORD_HASH ontbreekt (of zet OWNER_AUTH=off voor alleen lokaal gebruik)');
  return p;
}
