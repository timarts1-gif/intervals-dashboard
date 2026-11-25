import { Router } from 'express';
import type { AppConfig } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { roleForPassword } from '../auth/password.js';
import { RateLimiter } from '../auth/rateLimit.js';
import { cookieOptions, createSessionToken, SESSION_COOKIE } from '../auth/session.js';

const GENERIC_ERROR = 'Ongeldig wachtwoord';

export function createAuthRouter(config: AppConfig) {
  const router = Router();
  const limiter = new RateLimiter(config.auth.loginMaxAttempts, config.auth.loginWindowMs);

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const key = req.ip ?? 'unknown';
      if (!limiter.take(key)) {
        res.status(429).json({ error: 'Te veel pogingen. Probeer het later opnieuw.' });
        return;
      }
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const role = password && password.length <= 200 ? await roleForPassword(config, password) : null;
      if (!role) {
        res.status(401).json({ error: GENERIC_ERROR });
        return;
      }
      limiter.reset(key);
      res.cookie(SESSION_COOKIE, createSessionToken(config, role), cookieOptions(config));
      res.json({ role });
    }),
  );

  router.post('/logout', (_req, res) => {
    const { maxAge: _m, ...opts } = cookieOptions(config);
    res.clearCookie(SESSION_COOKIE, opts);
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    if (!req.role) {
      res.status(401).json({ error: 'Niet ingelogd' });
      return;
    }
    res.json({ role: req.role, ownerAuth: config.auth.ownerAuth });
  });

  return router;
}
