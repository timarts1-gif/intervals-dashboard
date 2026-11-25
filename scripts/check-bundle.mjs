// Controleert dat de gebouwde frontend (frontend/dist) geen geheimen bevat.
// Gebruik: npm run build && npm run check:bundle
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('frontend/dist');
if (!fs.existsSync(dist)) {
  console.error('frontend/dist bestaat niet. Draai eerst: npm run build');
  process.exit(2);
}

// Echte waarden uit backend/.env (indien aanwezig) + vaste patronen.
const secrets = [];
const envFile = path.resolve('backend/.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(INTERVALS_API_KEY|SESSION_SECRET|OWNER_PASSWORD_HASH|SHARE_PASSWORD_HASH)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (value.length >= 8) secrets.push({ label: `waarde van ${m[1]}`, needle: value });
  }
}
const patterns = [
  { label: 'naam INTERVALS_API_KEY', needle: 'INTERVALS_API_KEY' },
  { label: 'naam SESSION_SECRET', needle: 'SESSION_SECRET' },
  { label: 'naam *_PASSWORD_HASH', needle: 'PASSWORD_HASH' },
  { label: 'Basic-auth gebruikersnaam API_KEY:', needle: 'API_KEY:' },
  { label: 'intervals.icu API-URL', needle: 'intervals.icu/api' },
  { label: 'bcrypt-hash', regex: /\$2[aby]\$\d{2}\$/ },
];

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : files.push(p);
  }
})(dist);

let found = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const s of [...secrets, ...patterns]) {
    const hit = s.regex ? s.regex.test(text) : text.includes(s.needle);
    if (hit) {
      found++;
      console.error(`GEVONDEN: ${s.label} in ${path.relative(process.cwd(), f)}`);
    }
  }
}
console.log(`${files.length} bestanden gecontroleerd, ${secrets.length} echte waarden uit backend/.env, ${patterns.length} patronen.`);
if (found) process.exit(1);
console.log('OK: geen API-key, sessiegeheim of wachtwoordhash in de clientbundle.');
