/** Genereert een willekeurige SESSION_SECRET. Gebruik: npm run gen-secret */
import crypto from 'node:crypto';
console.log(crypto.randomBytes(48).toString('base64url'));
