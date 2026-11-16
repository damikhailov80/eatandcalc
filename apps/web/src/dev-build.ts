import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

/**
 * Local-only: the dev APK built by `npm run android:dev` (apps/mobile/dist).
 * Never available in production builds of the landing page.
 */
export const DEV_BUILD_ENABLED = process.env.NODE_ENV === 'development';

const DIST_DIR = join(process.cwd(), '..', 'mobile', 'dist');
export const DEV_APK_PATH = join(DIST_DIR, 'eatandcalc-dev.apk');

export type DevBuild = { version: string; builtAt: string; sizeBytes: number };

export async function getDevBuild(): Promise<DevBuild | null> {
  if (!DEV_BUILD_ENABLED) return null;
  try {
    return JSON.parse(await readFile(join(DIST_DIR, 'dev.json'), 'utf8')) as DevBuild;
  } catch {
    return null;
  }
}

/** Mac's Wi-Fi address: phones reach the landing (:3001) and Metro (:8081) through it. */
export function lanIp(): string | null {
  const all = Object.entries(networkInterfaces()).flatMap(([name, list]) =>
    (list ?? []).filter((a) => a.family === 'IPv4' && !a.internal).map((a) => ({ name, address: a.address })),
  );
  return (all.find((a) => a.name === 'en0') ?? all[0])?.address ?? null;
}
