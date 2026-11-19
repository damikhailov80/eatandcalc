import { getDevBuild } from './dev-build';
import { getLatestRelease } from './release';

export type AppDownload = { href: string; version: string; date: Date; filename: string };

/** `next dev` serves the local dev APK from this Mac; production serves the published release. */
export async function getAppDownload(): Promise<AppDownload | null> {
  const devBuild = await getDevBuild();
  if (devBuild) {
    return {
      href: '/download/dev',
      version: devBuild.version,
      date: new Date(devBuild.builtAt),
      filename: 'eatandcalc-dev.apk',
    };
  }
  const release = await getLatestRelease();
  if (!release) return null;
  // Cache-busting query so a new build is never served from an old CDN copy.
  const href = `${release.apkUrl}?v=${encodeURIComponent(release.build)}`;
  return { href, version: release.version, date: new Date(release.publishedAt), filename: 'eatandcalc.apk' };
}
