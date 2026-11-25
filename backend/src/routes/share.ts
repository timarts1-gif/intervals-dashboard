import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireRole } from '../auth/middleware.js';
import type { CoachService } from '../services/coach.js';

/** Coachoverzicht: bereikbaar voor de share-rol én de eigenaar. */
export function createShareRouter(coach: CoachService) {
  const router = Router();
  router.get(
    '/coach',
    requireRole('share', 'owner'),
    asyncHandler(async (_req, res) => {
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(await coach.getOverview());
    }),
  );
  return router;
}
