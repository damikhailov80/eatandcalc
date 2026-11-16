// Builds the development APK on this Mac (no EAS) and installs it on USB-connected phones.
// Without USB, download it from the local landing page (npm run dev → http://<Mac LAN IP>:3001).
// Rebuild only after adding a native library or changing app.json; JS changes come from Metro.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ANDROID_DIR, DIST_APK, DIST_MANIFEST, MOBILE_DIR, androidEnv, ensureAndroidProject, run } from './android-env.mjs';

// Both family phones are arm64; building one ABI is much faster. Override: ANDROID_ARCHS=arm64-v8a,x86_64
const archs = process.env.ANDROID_ARCHS ?? 'arm64-v8a';

ensureAndroidProject();

console.log(`› Building debug APK (${archs})…`);
run('./gradlew', ['app:assembleDebug', `-PreactNativeArchitectures=${archs}`], { cwd: ANDROID_DIR });

mkdirSync(dirname(DIST_APK), { recursive: true });
copyFileSync(join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), DIST_APK);
const { expo } = JSON.parse(readFileSync(join(MOBILE_DIR, 'app.json'), 'utf8'));
writeFileSync(
  DIST_MANIFEST,
  `${JSON.stringify({ version: expo.version, builtAt: new Date().toISOString(), sizeBytes: statSync(DIST_APK).size }, null, 2)}\n`,
);
console.log(`› APK: ${DIST_APK}`);

const devices = execFileSync('adb', ['devices'], { env: androidEnv(), encoding: 'utf8' })
  .split('\n')
  .slice(1)
  .map((line) => line.split('\t'))
  .filter(([serial, state]) => serial && state === 'device')
  .map(([serial]) => serial);

if (devices.length === 0) {
  console.log('› No phone over USB: run `npm run dev` and download the APK from the landing page on the phone.');
}
for (const serial of devices) {
  console.log(`› Installing on ${serial}…`);
  run('adb', ['-s', serial, 'install', '-r', DIST_APK]);
}
console.log('› Done. Start everything with `npm run dev` and open "Eat And Calc (dev)" on the phone.');
