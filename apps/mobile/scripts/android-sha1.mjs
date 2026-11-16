// Prints the SHA-1 of the dev build's signing key, for the Google Cloud "Android" OAuth client.
import { execFileSync } from 'node:child_process';
import { SAVED_KEYSTORE, androidEnv, ensureAndroidProject } from './android-env.mjs';

ensureAndroidProject();

const output = execFileSync(
  'keytool',
  ['-list', '-v', '-keystore', SAVED_KEYSTORE, '-alias', 'androiddebugkey', '-storepass', 'android', '-keypass', 'android'],
  { env: androidEnv(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
);
const sha1 = output.match(/SHA1:\s*([0-9A-F:]+)/)?.[1];
if (!sha1) {
  console.error(output);
  process.exit(1);
}

console.log(`
Google Cloud → Clients → Create client → Android
  Package name:              com.eatandcalc.app
  SHA-1 certificate:         ${sha1}
`);
