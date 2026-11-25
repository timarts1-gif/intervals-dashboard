import type { NextFunction, Request, Response } from 'express';
import type { AppConfig } from '../config/env.js';
import { SESSION_COOKIE, verifySessionToken, type Role } from './session.js';

declare module 'express-serve-static-core' {
  interface Request {
    role?: Role | null;
  }
}

/** Leest de sessie uit de cookie. Met OWNER_AUTH=off geldt elk verzoek als eigenaar. */
export function sessionReader(c: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const fromCookie = verifySessionToken(c, req.cookies?.[SESSION_COOKIE]);
    req.role = fromCookie ?? (c.auth.ownerAuth ? null : 'owner');
    next();
  };
}

/** Laat alleen de genoemde rollen door: 401 zonder sessie, 403 met de verkeerde rol. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.role) {
      res.status(401).json({ error: 'Niet ingelogd' });
      return;
    }
    if (!roles.includes(req.role)) {
      res.status(403).json({ error: 'Geen toegang' });
      return;
    }
    next();
  };
}
