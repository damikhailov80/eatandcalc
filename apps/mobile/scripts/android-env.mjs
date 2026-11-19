// Shared helpers for the local Android scripts (android-dev, android-sha1).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MOBILE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ANDROID_DIR = join(MOBILE_DIR, 'android');
export const DIST_APK = join(MOBILE_DIR, 'dist-dev', 'eatandcalc-dev.apk');
/** Build info next to the APK; the local landing page (apps/web) reads it. */
export const DIST_MANIFEST = join(MOBILE_DIR, 'dist-dev', 'dev.json');

/** Where Gradle expects the debug key; overwritten with the saved keystore before each build. */
const BUILD_KEYSTORE = join(ANDROID_DIR, 'app', 'debug.keystore');
/** Gitignored copy that survives deleting android/. Its SHA-1 is registered in Google Cloud. */
export const SAVED_KEYSTORE = join(MOBILE_DIR, 'credentials', 'debug.keystore');

const STUDIO_JDK = '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
const DEFAULT_SDK = join(homedir(), 'Library', 'Android', 'sdk');

/** process.env plus JAVA_HOME / ANDROID_HOME from Android Studio when not set. */
export function androidEnv() {
  const env = { ...process.env };
  if (!env.JAVA_HOME && existsSync(STUDIO_JDK)) env.JAVA_HOME = STUDIO_JDK;
  if (!env.ANDROID_HOME && existsSync(DEFAULT_SDK)) env.ANDROID_HOME = DEFAULT_SDK;
  if (!env.JAVA_HOME) fail('JDK not found: install Android Studio or set JAVA_HOME.');
  if (!env.ANDROID_HOME) fail('Android SDK not found: install it in Android Studio or set ANDROID_HOME.');
  env.PATH = [join(env.JAVA_HOME, 'bin'), join(env.ANDROID_HOME, 'platform-tools'), env.PATH].join(':');
  return env;
}

export function run(cmd, args, options = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', cwd: MOBILE_DIR, env: androidEnv(), ...options });
}

/**
 * Generates or refreshes android/ from app.json / app.config.ts (name, icons, plugins) for the
 * development variant, and signs debug builds with our own saved keystore.
 */
export function ensureAndroidProject() {
  console.log('› Syncing android/ with the Expo config (expo prebuild)…');
  run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], {
    env: { ...androidEnv(), APP_VARIANT: 'development' },
  });
  if (!existsSync(SAVED_KEYSTORE)) createKeystore();
  copyFileSync(SAVED_KEYSTORE, BUILD_KEYSTORE);
}

/**
 * The template's debug.keystore is the same public key in every React Native project, so we make
 * our own. Same alias/passwords as the template, so the generated Gradle config works unchanged.
 */
function createKeystore() {
  mkdirSync(dirname(SAVED_KEYSTORE), { recursive: true });
  execFileSync(
    'keytool',
    [
      '-genkeypair', '-v', '-storetype', 'PKCS12', '-keystore', SAVED_KEYSTORE,
      '-alias', 'androiddebugkey', '-storepass', 'android', '-keypass', 'android',
      '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=eatandcalc dev',
    ],
    { env: androidEnv(), stdio: 'ignore' },
  );
  console.log(`› Created ${SAVED_KEYSTORE}. Keep it: its SHA-1 is registered in Google Cloud.`);
}

/** The Mac's LAN IPv4 (what phones on the same Wi-Fi use). */

export function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}
