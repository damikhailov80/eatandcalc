import { colors } from '@eatandcalc/shared/tokens';
import QRCode from 'qrcode';

import { DEV_BUILD_ENABLED, getDevBuild, lanIp } from '../dev-build';
import { getLatestRelease } from '../release';
import { cssVars } from './theme';

export const revalidate = 60;

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

const qr = (text: string) => QRCode.toString(text, { type: 'svg', margin: 0, color: { dark: colors.text, light: colors.surface } });


type AppDownload = { href: string; version: string; date: Date; filename: string };

/** Address of this page as a phone sees it: the Mac's Wi-Fi IP locally, the Vercel domain in production. */
function siteUrl(): string | null {
  if (DEV_BUILD_ENABLED) {
    const ip = lanIp();
    return ip ? `http://${ip}:3001` : null;
  }
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : null;
}

/** `next dev` serves the local dev APK from this Mac; production serves the published release. */
async function getAppDownload(): Promise<AppDownload | null> {
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

export default async function HomePage() {
  const app = await getAppDownload();
  // QR = this page's address, so a phone opens the landing without typing the URL.
  const url = siteUrl();
  const qrSvg = url ? await qr(url) : null;

  return (
    <main className="page" style={cssVars}>
      <div className="wrap">
        <div className="brand">
          <span className="logo" aria-hidden>🍎</span>
          Eat And Calc
        </div>

        <section className="hero">
          <div>
            <h1>Питание всей семьи — без таблиц и подсчётов в уме</h1>
            <p className="lead">
              Что приготовили, кто сколько съел и сколько осталось до дневной нормы. Только состав и цифры, никаких
              рецептов-инструкций.
            </p>
          </div>
          {qrSvg ? (
            <div className="qr-block">
              <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div className="qr-caption">Открыть на телефоне</div>
            </div>
          ) : null}
        </section>

        <section className="card download">
          <div>
            <h2>Приложение для Android</h2>
            <p className="meta">
              {app ? `Версия ${app.version} · ${dateFormat.format(app.date)}` : 'Сборка ещё не опубликована'}
            </p>
            <a className="button" href={app?.href} aria-disabled={!app} download={app?.filename}>
              Скачать APK
            </a>
            {DEV_BUILD_ENABLED ? (
              // Newer Android blocks LAN access per app until allowed; without it Chrome and the dev app can't reach the Mac.
              <p className="hint">
                Если страница или приложение не подключаются к компьютеру: Настройки → Приложения → Chrome (и «Eat And
                Calc (dev)») → Разрешения → «Устройства поблизости» → Разрешить.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
