import { normalizeInviteCode } from '@eatandcalc/shared';

type Ctx = { params: Promise<{ code: string }> };

/** Production landing; override with WEB_URL. */
const PROD_WEB_URL = 'https://eat-and-calc-web.vercel.app';

/** Landing origin: WEB_URL, else in `next dev` the same host on the landing's port 3001. */
function webUrl(request: Request): string {
  if (process.env.WEB_URL) return process.env.WEB_URL.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'development') {
    const host = (request.headers.get('host') ?? 'localhost').split(':')[0];
    return `http://${host}:3001`;
  }
  return PROD_WEB_URL;
}

/**
 * Legacy invite link (`<API>/invite/<code>`, shared by app versions before the landing hosted it):
 * redirects to the landing's invite page, which opens the app or offers the APK.
 */
export async function GET(request: Request, { params }: Ctx) {
  const code = normalizeInviteCode((await params).code).slice(0, 16);
  return Response.redirect(`${webUrl(request)}/invite/${code}`, 308);
}
