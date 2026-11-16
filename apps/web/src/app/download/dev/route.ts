import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { DEV_APK_PATH, DEV_BUILD_ENABLED } from '../../../dev-build';

export const dynamic = 'force-dynamic';

/** Serves the local dev APK to phones on the same Wi-Fi. 404 outside `next dev`. */
export async function GET() {
  if (!DEV_BUILD_ENABLED) return new Response('Not found', { status: 404 });
  const info = await stat(DEV_APK_PATH).catch(() => null);
  if (!info) return new Response('Dev APK is not built: run `npm run android:dev`', { status: 404 });

  return new Response(Readable.toWeb(createReadStream(DEV_APK_PATH)) as ReadableStream, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': String(info.size),
      'Content-Disposition': 'attachment; filename="eatandcalc-dev.apk"',
      'Cache-Control': 'no-store',
    },
  });
}
