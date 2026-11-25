import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { config, isConfigured } from './config/env.js';
import { apiRouter } from './routes/api.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

app.use('/api', apiRouter);
app.use('/api', notFound);

// In productie kan de backend de gebouwde frontend serveren (één proces om te hosten).
if (config.staticDir && fs.existsSync(config.staticDir)) {
  const dir = path.resolve(config.staticDir);
  app.use(express.static(dir));
  app.get('*', (_req, res) => res.sendFile(path.join(dir, 'index.html')));
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend draait op http://localhost:${config.port}`);
  if (!isConfigured()) {
    console.warn('Let op: INTERVALS_API_KEY ontbreekt. Zie backend/.env.example.');
  }
});
