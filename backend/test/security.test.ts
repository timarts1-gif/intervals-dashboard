import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, type AppConfig } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCoachService } from '../src/services/coach.js';
import type { IntervalsClient } from '../src/services/intervalsClient.js';

const OWNER_PW = 'owner-wachtwoord-123';
const SHARE_PW = 'share-wachtwoord-456';
const API_KEY = 'TEST_API_KEY_never_leak_1234567890';

/** Velden die nooit in het share-endpoint mogen voorkomen (stub levert ze bewust wél aan). */
const FORBIDDEN = ['email', 'weight', 'hrv', 'restingHR', 'sleepSecs', 'comments', 'injury', 'mood', 'icu_date_of_birth', 'athlete_id', 'i49046', 'privacy@example.com', API_KEY];

/** Exacte whitelist van het share-endpoint. */
const TOP_KEYS = ['athletes', 'generatedAt', 'periodEnd', 'periodStart'];
const ATHLETE_KEYS = ['atl', 'atlChange28', 'ctl', 'ctlChange28', 'form', 'formChange28', 'lastDataDate', 'name', 'rampRate', 'series', 'weeklyLoad'];
const POINT_KEYS = ['atl', 'ctl', 'date', 'form'];

const OWNER_ENDPOINTS: [string, string][] = [
  ['get', '/api/status'],
  ['get', '/api/athlete'],
  ['get', '/api/activities?oldest=2026-01-01'],
  ['get', '/api/wellness?oldest=2026-01-01'],
  ['get', '/api/power-curves'],
  ['post', '/api/cache/clear'],
];

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function stubIntervals(): IntervalsClient {
  const sensitive = { hrv: 80, restingHR: 45, sleepSecs: 28000, weight: 60, comments: 'privé', injury: 1, mood: 2 };
  return {
    getAthlete: async () => ({ id: 'i0', name: 'Eigenaar', sportSettings: [] }),
    listActivities: async () => [],
    listWellness: async () => [],
    listPowerCurves: async () => ({ list: [] }),
    athleteSummary: async () => [
      { athlete_id: 'i49046', athlete_name: 'Florien Bolks', email: 'privacy@example.com', weight: 60, icu_date_of_birth: '2000-01-01' } as never,
    ],
    listWellnessFields: async () =>
      Array.from({ length: 29 }, (_, i) => ({ id: isoDaysAgo(28 - i), ctl: 40 + i, atl: 35 + i, rampRate: 1.5, atlLoad: 50, ...sensitive })),
    clearCache: () => {},
    cacheSize: () => 0,
  } as unknown as IntervalsClient;
}

let staticDir: string;
let config: AppConfig;

function makeConfig(extra: Record<string, string> = {}): AppConfig {
  return loadConfig({
    INTERVALS_API_KEY: API_KEY,
    OWNER_PASSWORD_HASH: bcrypt.hashSync(OWNER_PW, 4),
    SHARE_PASSWORD_HASH: bcrypt.hashSync(SHARE_PW, 4),
    SESSION_SECRET: 'x'.repeat(48),
    COACH_ATHLETE_IDS: 'i49046',
    STATIC_DIR: staticDir,
    LOGIN_MAX_ATTEMPTS: '5',
    ...extra,
  });
}

function makeApp(c = config) {
  const intervals = stubIntervals();
  return createApp({ config: c, intervals, coach: createCoachService(c, intervals) });
}

async function login(app: ReturnType<typeof makeApp>, password: string) {
  const res = await request(app).post('/api/auth/login').send({ password });
  const cookie = res.headers['set-cookie']?.[0]?.split(';')[0];
  return { res, cookie };
}

function keysDeep(o: Record<string, unknown>) {
  return Object.keys(o).sort();
}

beforeAll(() => {
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idash-'));
  fs.mkdirSync(path.join(staticDir, 'share'));
  fs.mkdirSync(path.join(staticDir, 'assets'));
  fs.writeFileSync(path.join(staticDir, 'index.html'), '<html>owner</html>');
  fs.writeFileSync(path.join(staticDir, 'share', 'index.html'), '<html>share</html>');
  fs.writeFileSync(path.join(staticDir, 'assets', 'app.js'), 'console.log(1)');
  config = makeConfig();
});

describe('a) zonder sessie is geen data te verkrijgen', () => {
  it('share-endpoint geeft 401', async () => {
    const res = await request(makeApp()).get('/api/share/coach');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('Florien');
  });
  it.each(OWNER_ENDPOINTS)('%s %s geeft 401', async (method, url) => {
    const res = await (request(makeApp()) as never as Record<string, (u: string) => request.Test>)[method](url);
    expect(res.status).toBe(401);
  });
  it('een vervalste of gewijzigde cookie geeft 401', async () => {
    const app = makeApp();
    const { cookie } = await login(app, SHARE_PW);
    const [name, value] = cookie!.split('=');
    const [data, sig] = value.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data, 'base64url').toString()), r: 'owner' })).toString('base64url');
    const res = await request(app).get('/api/status').set('Cookie', `${name}=${forged}.${sig}`);
    expect(res.status).toBe(401);
  });
  it('sessies vervallen na ophogen van SESSION_VERSION', async () => {
    const { cookie } = await login(makeApp(), SHARE_PW);
    const res = await request(makeApp(makeConfig({ SESSION_VERSION: '2' }))).get('/api/share/coach').set('Cookie', cookie!);
    expect(res.status).toBe(401);
  });
  it('sessies vervallen na wijzigen van het share-wachtwoord', async () => {
    const { cookie } = await login(makeApp(), SHARE_PW);
    const res = await request(makeApp(makeConfig({ SHARE_PASSWORD_HASH: bcrypt.hashSync('ander-wachtwoord-789', 4) })))
      .get('/api/share/coach')
      .set('Cookie', cookie!);
    expect(res.status).toBe(401);
  });
});

describe('login', () => {
  it('fout wachtwoord geeft een generieke melding', async () => {
    const res = await request(makeApp()).post('/api/auth/login').send({ password: 'fout' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Ongeldig wachtwoord' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });
  it('rate limiting na 5 pogingen', async () => {
    const app = makeApp();
    for (let i = 0; i < 5; i++) await request(app).post('/api/auth/login').send({ password: 'fout' });
    const res = await request(app).post('/api/auth/login').send({ password: SHARE_PW });
    expect(res.status).toBe(429);
  });
  it('sessiecookie is httpOnly, Secure, SameSite=Strict en verloopt', async () => {
    const { res } = await login(makeApp(), SHARE_PW);
    expect(res.status).toBe(200);
    const c = res.headers['set-cookie'][0];
    expect(c).toMatch(/HttpOnly/);
    expect(c).toMatch(/Secure/);
    expect(c).toMatch(/SameSite=Strict/);
    expect(c).toMatch(/Max-Age=\d+/);
    expect(c).toMatch(/Expires=/);
  });
  it('OWNER_AUTH=off wordt geweigerd als de server niet alleen lokaal luistert', () => {
    expect(() => makeConfig({ OWNER_AUTH: 'off', HOST: '0.0.0.0' })).toThrow();
  });
});

describe('b) met de gedeelde sessie is geen andere route of endpoint bereikbaar', () => {
  it.each(OWNER_ENDPOINTS)('%s %s geeft 403', async (method, url) => {
    const app = makeApp();
    const { cookie } = await login(app, SHARE_PW);
    const res = await (request(app) as never as Record<string, (u: string) => request.Test>)[method](url).set('Cookie', cookie!);
    expect(res.status).toBe(403);
  });
  it.each(['/', '/training', '/power', '/settings', '/index.html'])('pagina %s stuurt door naar /share/', async (url) => {
    const app = makeApp();
    const { cookie } = await login(app, SHARE_PW);
    const res = await request(app).get(url).set('Cookie', cookie!);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/share/');
  });
  it('coachpagina en data zijn wel bereikbaar', async () => {
    const app = makeApp();
    const { cookie } = await login(app, SHARE_PW);
    expect((await request(app).get('/share/').set('Cookie', cookie!)).text).toContain('share');
    expect((await request(app).get('/api/share/coach').set('Cookie', cookie!)).status).toBe(200);
  });
  it('eigenaar heeft wel toegang tot alles', async () => {
    const app = makeApp();
    const { cookie } = await login(app, OWNER_PW);
    expect((await request(app).get('/api/status').set('Cookie', cookie!)).status).toBe(200);
    expect((await request(app).get('/api/share/coach').set('Cookie', cookie!)).status).toBe(200);
  });
});

describe('c) het share-endpoint bevat alleen whitelisted velden', () => {
  it('exact de toegestane sleutels, geen gevoelige data', async () => {
    const app = makeApp();
    const { cookie } = await login(app, SHARE_PW);
    const res = await request(app).get('/api/share/coach').set('Cookie', cookie!);
    expect(keysDeep(res.body)).toEqual(TOP_KEYS);
    expect(res.body.athletes).toHaveLength(1);
    for (const a of res.body.athletes) {
      expect(keysDeep(a)).toEqual(ATHLETE_KEYS);
      expect(a.weeklyLoad).toHaveLength(4);
      expect(a.weeklyLoad.every((n: unknown) => typeof n === 'number')).toBe(true);
      expect(a.series).toHaveLength(29);
      for (const p of a.series) expect(keysDeep(p)).toEqual(POINT_KEYS);
    }
    const text = JSON.stringify(res.body);
    for (const f of FORBIDDEN) expect(text).not.toContain(f);
    expect(res.body.athletes[0].name).toBe('Florien Bolks');
  });
  it('berekeningen: form = CTL − ATL, verandering t.o.v. 28 dagen, load per 7 dagen', async () => {
    const app = makeApp();
    const { cookie } = await login(app, SHARE_PW);
    const a = (await request(app).get('/api/share/coach').set('Cookie', cookie!)).body.athletes[0];
    expect(a.ctl).toBe(68);
    expect(a.atl).toBe(63);
    expect(a.form).toBe(5);
    expect(a.ctlChange28).toBe(28);
    expect(a.formChange28).toBe(0);
    expect(a.weeklyLoad).toEqual([350, 350, 350, 350]);
  });
  it('geen caching in gedeelde caches en niet indexeerbaar', async () => {
    const app = makeApp();
    const { cookie } = await login(app, SHARE_PW);
    const res = await request(app).get('/api/share/coach').set('Cookie', cookie!);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['x-robots-tag']).toContain('noindex');
    expect((await request(app).get('/robots.txt')).text).toContain('Disallow: /');
  });
});
