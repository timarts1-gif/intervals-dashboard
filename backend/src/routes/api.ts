import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { IntervalsClient } from '../services/intervalsClient.js';
import type { CoachService } from '../services/coach.js';
import { toActivity, toAthlete, toPowerCurve, toWellness } from '../services/normalize.js';
import type { AppConfig } from '../config/env.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dateParam(value: unknown, name: string, required: boolean): string | undefined {
  if (value === undefined || value === '') {
    if (required) throw new HttpError(400, `Queryparameter "${name}" (YYYY-MM-DD) is verplicht`);
    return undefined;
  }
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new HttpError(400, `Queryparameter "${name}" moet het formaat YYYY-MM-DD hebben`);
  }
  return value;
}

/** Routes van het eigen dashboard. Alleen bereikbaar met de owner-rol (zie app.ts). */
export function createOwnerRouter(config: AppConfig, intervals: IntervalsClient, coach: CoachService) {
  const apiRouter = Router();

  apiRouter.get('/status', (_req, res) => {
    res.json({
      configured: config.intervals.apiKey.length > 0,
      athleteId: config.intervals.athleteId,
      cacheEntries: intervals.cacheSize(),
      coachAthletes: config.coach.athleteIds.length,
      shareEnabled: config.auth.sharePasswordHash !== '',
      ownerAuth: config.auth.ownerAuth,
    });
  });

  apiRouter.use((_req, res, next) => {
    if (!config.intervals.apiKey) {
      res.status(503).json({
        error: 'INTERVALS_API_KEY ontbreekt. Kopieer backend/.env.example naar backend/.env en vul je API-key in.',
      });
      return;
    }
    next();
  });

  apiRouter.get(
    '/athlete',
    asyncHandler(async (_req, res) => {
      res.json(toAthlete(await intervals.getAthlete()));
    }),
  );

  apiRouter.get(
    '/activities',
    asyncHandler(async (req, res) => {
      const oldest = dateParam(req.query.oldest, 'oldest', true)!;
      const newest = dateParam(req.query.newest, 'newest', false);
      const raw = await intervals.listActivities(oldest, newest);
      // Activiteiten die via Strava binnenkwamen levert de API alleen als stub
      // ("STRAVA activities are not available via the API"): zonder type of data.
      const available = raw.filter((a) => typeof a.type === 'string' && a.type !== '');
      const activities = available.map(toActivity).sort((a, b) => a.date.localeCompare(b.date));
      res.setHeader('X-Unavailable-Activities', String(raw.length - available.length));
      res.json(activities);
    }),
  );

  apiRouter.get(
    '/wellness',
    asyncHandler(async (req, res) => {
      const oldest = dateParam(req.query.oldest, 'oldest', true)!;
      const newest = dateParam(req.query.newest, 'newest', false);
      const raw = await intervals.listWellness(oldest, newest);
      res.json(raw.map(toWellness).sort((a, b) => a.date.localeCompare(b.date)));
    }),
  );

  apiRouter.get(
    '/power-curves',
    asyncHandler(async (req, res) => {
      const type = typeof req.query.type === 'string' && req.query.type ? req.query.type : 'Ride';
      const curves = typeof req.query.curves === 'string' ? req.query.curves : undefined;
      if (curves !== undefined && !/^[A-Za-z0-9.,_-]+$/.test(curves)) {
        throw new HttpError(400, 'Ongeldige waarde voor "curves"');
      }
      const set = await intervals.listPowerCurves(type, curves);
      res.json((set.list ?? []).map(toPowerCurve));
    }),
  );

  apiRouter.post('/cache/clear', (_req, res) => {
    intervals.clearCache();
    coach.clearCache();
    res.json({ cleared: true });
  });

  return apiRouter;
}
