import bcrypt from 'bcryptjs';
import type { AppConfig } from '../config/env.js';
import type { Role } from './session.js';

// Vaste dummy-hash zodat een ontbrekende hash dezelfde rekentijd kost (geen timing-lek).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-not-used', 12);

async function check(password: string, hash: string): Promise<boolean> {
  const ok = await bcrypt.compare(password, hash || DUMMY_HASH);
  return ok && hash !== '';
}

/** Bepaalt de rol bij een wachtwoord; vergelijkt altijd met beide hashes. */
export async function roleForPassword(c: AppConfig, password: string): Promise<Role | null> {
  const [owner, share] = await Promise.all([
    check(password, c.auth.ownerAuth ? c.auth.ownerPasswordHash : ''),
    check(password, c.auth.sharePasswordHash),
  ]);
  if (owner) return 'owner';
  if (share) return 'share';
  return null;
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
