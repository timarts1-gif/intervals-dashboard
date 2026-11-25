import crypto from 'node:crypto';
import type { AppConfig } from '../config/env.js';

export type Role = 'owner' | 'share';

export const SESSION_COOKIE = 'idash_session';

interface Payload {
  r: Role;
  exp: number; // ms sinds epoch
  v: number; // sessieversie
  h: string; // vingerafdruk van de wachtwoordhash van de rol
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');

/** Korte vingerafdruk van de hash: wachtwoord wijzigen maakt bestaande sessies ongeldig. */
function fingerprint(c: AppConfig, role: Role): string {
  const hash = role === 'owner' ? c.auth.ownerPasswordHash : c.auth.sharePasswordHash;
  return crypto.createHash('sha256').update(hash).digest('base64url').slice(0, 16);
}

function sign(c: AppConfig, data: string): string {
  return crypto.createHmac('sha256', c.auth.sessionSecret).update(data).digest('base64url');
}

export function createSessionToken(c: AppConfig, role: Role, now = Date.now()): string {
  const payload: Payload = { r: role, exp: now + c.auth.sessionTtlMs, v: c.auth.sessionVersion, h: fingerprint(c, role) };
  const data = b64(JSON.stringify(payload));
  return `${data}.${sign(c, data)}`;
}

export function verifySessionToken(c: AppConfig, token: string | undefined, now = Date.now()): Role | null {
  if (!token || c.auth.sessionSecret.length < 32) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(c, data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  let p: Payload;
  try {
    p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (p.r !== 'owner' && p.r !== 'share') return null;
  if (typeof p.exp !== 'number' || p.exp <= now) return null;
  if (p.v !== c.auth.sessionVersion) return null;
  if (p.h !== fingerprint(c, p.r)) return null;
  return p.r;
}

export function cookieOptions(c: AppConfig) {
  return {
    httpOnly: true,
    secure: true, // browsers accepteren Secure-cookies ook op http://localhost
    sameSite: 'strict' as const,
    path: '/',
    maxAge: c.auth.sessionTtlMs,
  };
}
