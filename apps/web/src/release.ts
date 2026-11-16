import { head } from '@vercel/blob';

/** Written by scripts/release-android.mjs after every production build. */
export type AndroidRelease = {
  version: string;
  build: string;
  publishedAt: string;
  apkUrl: string;
};

export const RELEASE_MANIFEST_PATH = 'android/latest.json';

export async function getLatestRelease(): Promise<AndroidRelease | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(RELEASE_MANIFEST_PATH);
    const response = await fetch(meta.url, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as AndroidRelease;
  } catch {
    return null;
  }
}
