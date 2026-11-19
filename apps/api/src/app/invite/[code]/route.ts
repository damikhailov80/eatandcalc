import { formatInviteCode, normalizeInviteCode } from '@eatandcalc/shared';
import { colors, radii } from '@eatandcalc/shared/tokens';

type Ctx = { params: Promise<{ code: string }> };

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Public landing of an invite link (`<API>/invite/<code>`): messengers don't linkify `eatandcalc://`,
 * so the shared link is https and this page opens the app. Shows the code for manual entry.
 * Doesn't touch the DB, so it reveals nothing about the family.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const code = normalizeInviteCode((await params).code).slice(0, 16);
  const deepLink = `eatandcalc://join/${code}`;
  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Приглашение в семью — Eat And Calc</title>
<style>
  body { margin: 0; background: ${colors.bg}; color: ${colors.text}; font-family: Inter, system-ui, sans-serif; }
  main { max-width: 420px; margin: 0 auto; padding: 48px 20px; display: flex; flex-direction: column; gap: 16px; }
  h1 { margin: 0; font-size: 26px; font-weight: 800; }
  p { margin: 0; color: ${colors.textSecondary}; font-size: 15px; line-height: 1.45; }
  .card { background: ${colors.surface}; border-radius: ${radii.card}px; padding: 20px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
  .code { font-size: 30px; font-weight: 800; letter-spacing: 2px; font-variant-numeric: tabular-nums; user-select: all; }
  .muted { color: ${colors.textMuted}; font-size: 13px; text-align: center; }
  a.button { display: flex; align-items: center; justify-content: center; height: 52px; border-radius: ${radii.lg}px; background: ${colors.primary}; color: ${colors.onPrimary}; text-decoration: none; font-size: 15px; font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>Приглашение в семью</h1>
  <p>Вас пригласили вести питание семьи вместе в приложении Eat And Calc.</p>
  <a class="button" href="${escape(deepLink)}">Открыть в приложении</a>
  <div class="card">
    <div class="muted">Если приложение не открылось, введите код на экране «Семья» → «Присоединиться по коду»</div>
    <div class="code">${escape(formatInviteCode(code))}</div>
    <div class="muted">Код действует 7 дней. Вход — только для аккаунтов Google, которым открыт доступ.</div>
  </div>
</main>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
