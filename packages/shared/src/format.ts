/** Russian number formatting: "1 435", "13,2". */
const int = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatInt = (n: number) => int.format(Math.round(n));
export const formatOne = (n: number) => one.format(n);
export const formatKcal = (n: number) => `${formatInt(n)} ккал`;
export const formatGrams = (n: number) => `${formatInt(n)} г`;
export const formatKg = (n: number) => `${formatOne(n)} кг`;
/** Signed weight change: "+0,4 кг", "−1,8 кг", "0,0 кг". */
export const formatKgChange = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${formatKg(Math.abs(r))}`;
};

/** Russian plural: pluralRu(3, ['человек', 'человека', 'человек']) → "человека". */
export function pluralRu(n: number, [one, few, many]: readonly [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

/** "19 ноября". */
export const formatDayMonth = (date: Date) => dayMonth.format(date);

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** "15 ноя". */
export const formatDayMonthShort = (date: Date) => `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;

/** Monday-first short weekday: "Пн".."Вс". */
export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });

/** "Воскресенье". */
export function formatWeekday(date: Date) {
  const day = weekday.format(date);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
}
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const;

/** "Ноя" (month chart labels). */
export const formatMonthShort = (date: Date) => MONTHS[date.getMonth()].slice(0, 3);

/** "Ноябрь 2026". */
export const formatMonthYear = (date: Date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date → `YYYY-MM-DD`. */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** `YYYY-MM-DD` → local midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export const todayISO = () => toISODate(new Date());

/** The date `days` later (negative = earlier). */
export function shiftISODate(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "Сегодня, 19 ноября", "Вчера, 18 ноября", "Вторник, 17 ноября". */
export function formatDayTitle(iso: string, today = todayISO()): string {
  const date = fromISODate(iso);
  const day = iso === today ? 'Сегодня' : iso === shiftISODate(today, -1) ? 'Вчера' : weekday.format(date);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${formatDayMonth(date)}`;
}

/** "ABCDEFGH" → "ABCD-EFGH". */
export const formatInviteCode = (code: string) =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

const inputNumber = [0, 1, 2, 3].map(
  (digits) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, useGrouping: false }),
);

/** Number for an editable field: no thousands separator, comma decimals ("1435", "13,5"; up to 3 decimals). */
export const formatNumberInput = (n: number, maxFractionDigits = 1) =>
  inputNumber[Math.min(3, Math.max(0, maxFractionDigits))]!.format(n);

/** Parses a typed number; accepts both "," and "." as the decimal separator. Null when not a number. */
export function parseNumberInput(text: string): number | null {
  const normalized = text.replace(/\s/g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(normalized) || !/\d/.test(normalized)) return null;
  return Number(normalized);
}
