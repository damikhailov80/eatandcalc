import { formatInviteCode, normalizeInviteCode } from '@eatandcalc/shared';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { getAppDownload } from '../../../app-download';
import { DEV_BUILD_ENABLED } from '../../../dev-build';
import { cssVars } from '../../theme';

export const metadata: Metadata = { title: 'Приглашение в семью — Eat And Calc' };

type Props = { params: Promise<{ code: string }> };

/** Same as apps/mobile/app.config.ts: `next dev` invites open the dev build, production the release APK. */
const ANDROID_PACKAGE = DEV_BUILD_ENABLED ? 'com.eatandcalc.app.dev' : 'com.eatandcalc.app';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Android intent link to `eatandcalc://join/<code>` in our package. Unlike a bare custom scheme, when the app
 * is not installed Chrome goes to the fallback (this page's install step) instead of silently doing nothing.
 */
function openAppLink(code: string, fallbackUrl: string): string {
  return `intent://join/${code}#Intent;scheme=eatandcalc;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}

/**
 * Public invite link (`<web>/invite/<code>`), shared from the app. Messengers don't linkify `eatandcalc://`,
 * so the shared link is https and this page opens the app, or offers the APK if it isn't installed yet.
 * Doesn't touch the DB, so it reveals nothing about the family.
 */
export default async function InvitePage({ params }: Props) {
  const code = normalizeInviteCode((await params).code).slice(0, 16);
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? (DEV_BUILD_ENABLED ? 'http' : 'https');
  const installUrl = `${proto}://${host}/invite/${code}#install`;
  const app = await getAppDownload();

  return (
    <main className="page" style={cssVars}>
      <div className="wrap narrow">
        <div className="brand">
          <span className="logo" aria-hidden>🍎</span>
          Eat And Calc
        </div>

        <div>
          <h1>Приглашение в семью</h1>
          <p className="lead">Вас пригласили вести питание семьи вместе в приложении Eat And Calc для Android.</p>
        </div>

        <section className="card step">
          <h2>Приложение уже установлено</h2>
          <a className="button" href={openAppLink(code, installUrl)}>
            Открыть в приложении
          </a>
        </section>

        <section className="card step" id="install">
          <h2>Ещё нет приложения</h2>
          <p className="meta">
            {app ? `Версия ${app.version} · ${dateFormat.format(app.date)}` : 'Сборка ещё не опубликована'}
          </p>
          <a className="button" href={app?.href} aria-disabled={!app} download={app?.filename}>
            Скачать APK
          </a>
          <ol className="steps">
            <li>Откройте скачанный файл и разрешите установку из браузера.</li>
            <li>Войдите через аккаунт Google, которому открыт доступ.</li>
            <li>Вернитесь на эту страницу и нажмите «Открыть в приложении» — или введите код ниже.</li>
          </ol>
        </section>

        <section className="card code-card">
          <p className="meta">Код приглашения: «Семья» → «Присоединиться по коду»</p>
          <div className="code">{formatInviteCode(code)}</div>
          <p className="meta">Код действует 7 дней.</p>
        </section>
      </div>
    </main>
  );
}
