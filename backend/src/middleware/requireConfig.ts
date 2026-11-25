import type { NextFunction, Request, Response } from 'express';
import { isConfigured } from '../config/env.js';

/** Blokkeert API-routes zolang er geen API-key is ingesteld. */
export function requireConfig(_req: Request, res: Response, next: NextFunction): void {
  if (!isConfigured()) {
    res.status(503).json({
      error: 'INTERVALS_API_KEY ontbreekt. Kopieer backend/.env.example naar backend/.env en vul je API-key in.',
    });
    return;
  }
  next();
}
