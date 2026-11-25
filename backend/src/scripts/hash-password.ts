/**
 * Maakt een bcrypt-hash van een wachtwoord voor OWNER_PASSWORD_HASH of SHARE_PASSWORD_HASH.
 * Gebruik: npm run hash-password   (het wachtwoord wordt gevraagd, niet als argument)
 */
import readline from 'node:readline';
import { hashPassword } from '../auth/password.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Wachtwoord (minimaal 12 tekens): ', async (pw) => {
  rl.close();
  if (pw.length < 12) {
    console.error('Te kort: gebruik minimaal 12 tekens.');
    process.exit(1);
  }
  const hash = await hashPassword(pw);
  console.log('\nZet deze waarde in backend/.env achter OWNER_PASSWORD_HASH= of SHARE_PASSWORD_HASH= (inclusief de enkele aanhalingstekens):\n');
  console.log(`'${hash}'`);
});
