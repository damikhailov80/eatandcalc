#!/usr/bin/env node
/**
 * Builds a production APK on EAS and publishes it for the landing page:
 *   android/eatandcalc.apk  — the APK (overwritten every release)
 *   android/latest.json     — { version, build, publishedAt, apkUrl }
 *
 * Usage (from repo root):
 *   npm run release:android                       — new EAS build, then publish
 *   npm run release:android -- --build <build-id> — publish an existing finished build
 * Needs: `eas login` done, BLOB_READ_WRITE_TOKEN in apps/web/.env.local.
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { put } from '@vercel/blob';

const mobileDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../mobile');

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set (apps/web/.env.local).');
  process.exit(1);
}

const buildFlag = process.argv.indexOf('--build');
const existingBuildId = buildFlag === -1 ? undefined : process.argv[buildFlag + 1];
if (buildFlag !== -1 && !existingBuildId) {
  console.error('Usage: npm run release:android -- --build <build-id>');
  process.exit(1);
}

const eas = (args) =>
  execFileSync('npx', ['eas-cli', ...args], {
    cwd: mobileDir,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });

let build;
if (existingBuildId) {
  console.log(`Using existing EAS build ${existingBuildId}…`);
  build = JSON.parse(eas(['build:view', existingBuildId, '--json']));
} else {
  console.log('Building on EAS (profile "production")…');
  const args = ['build', '--platform', 'android', '--profile', 'production'];
  [build] = JSON.parse(eas([...args, '--non-interactive', '--wait', '--json']));
}
const buildUrl = build?.artifacts?.buildUrl ?? build?.artifacts?.applicationArchiveUrl;
if (build?.status !== 'FINISHED' || !buildUrl) {
  console.error('Build did not finish or has no artifact:', build?.status);
  process.exit(1);
}

console.log('Downloading APK…');
const apk = await fetch(buildUrl);
if (!apk.ok) throw new Error(`Download failed: ${apk.status}`);
const apkBytes = Buffer.from(await apk.arrayBuffer());

const common = { access: 'public', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 };

console.log('Uploading to Vercel Blob…');
const uploaded = await put('android/eatandcalc.apk', apkBytes, {
  ...common,
  contentType: 'application/vnd.android.package-archive',
});

const manifest = {
  version: build.appVersion,
  build: String(build.appBuildVersion),
  publishedAt: new Date().toISOString(),
  apkUrl: uploaded.url,
};
await put('android/latest.json', JSON.stringify(manifest, null, 2), { ...common, contentType: 'application/json' });

console.log(`Published ${manifest.version} (${manifest.build}): ${manifest.apkUrl}`);
