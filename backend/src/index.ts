import { authProblems, loadConfig } from './config/env.js';
import { createIntervalsClient } from './services/intervalsClient.js';
import { createCoachService } from './services/coach.js';
import { createApp } from './app.js';

const config = loadConfig();
const problems = authProblems(config);
if (problems.length) {
  console.error('Configuratie onvolledig:\n - ' + problems.join('\n - ') + '\nZie backend/.env.example en de README.');
  process.exit(1);
}

const intervals = createIntervalsClient(config);
const coach = createCoachService(config, intervals);
const app = createApp({ config, intervals, coach });

app.listen(config.port, config.host, () => {
  console.log(`Backend draait op http://${config.host}:${config.port}`);
  if (!config.intervals.apiKey) console.warn('Let op: INTERVALS_API_KEY ontbreekt. Zie backend/.env.example.');
  if (!config.auth.ownerAuth) console.warn('Let op: OWNER_AUTH=off — dashboard zonder login (alleen lokaal).');
  if (!config.auth.sharePasswordHash) console.warn('Gedeelde coachpagina staat uit (SHARE_PASSWORD_HASH leeg).');
  if (config.coach.athleteIds.length === 0) console.warn('COACH_ATHLETE_IDS is leeg: coachoverzicht toont geen atleten.');
});
