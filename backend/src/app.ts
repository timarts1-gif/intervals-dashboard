import express, { type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from './config/env.js';
import type { IntervalsClient } from './services/intervalsClient.js';
import type { CoachService } from './services/coach.js';
import { createOwnerRouter } from './routes/api.js';
import { createAuthRouter } from './routes/auth.js';
import { createShareRouter } from './routes/share.js';
import { requireRole, sessionReader } from './auth/middleware.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

interface Deps {
  config: AppConfig;
  intervals: IntervalsClient;
  coach: CoachService;
}

export function createApp({ config, intervals, coach }: Deps) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  // Beveiligingsheaders en niet-indexeerbaar, voor elke response.
  app.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use(sessionReader(config));

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
  });

  // API-responses nooit in (gedeelde) caches.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', createAuthRouter(config));
  app.use('/api/share', createShareRouter(coach));
  app.use('/api', requireRole('owner'), createOwnerRouter(config, intervals, coach));
  app.use('/api', notFound);

  // Productie: gebouwde frontend serveren.
  if (config.staticDir && fs.existsSync(config.staticDir)) {
    const dir = path.resolve(config.staticDir);
    const sendHtml = (file: string) => (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(dir, file));
    };
    // Scripts/stijlen bevatten geen data of geheimen en mogen voor iedereen.
    app.use('/assets', express.static(path.join(dir, 'assets'), { index: false }));
    app.get('/favicon.svg', (_req, res) => res.sendFile(path.join(dir, 'favicon.svg')));
    // Gedeelde coachpagina (login staat op de pagina zelf).
    app.get(['/share', '/share/'], sendHtml('share/index.html'));
    // Alles wat overblijft is het eigen dashboard: niet voor de share-rol.
    app.use((req, res, next) => {
      if (req.role === 'share') {
        res.redirect(302, '/share/');
        return;
      }
      next();
    });
    app.get('*', sendHtml('index.html'));
  }

  app.use(errorHandler);
  return app;
}
