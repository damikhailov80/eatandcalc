/** Russian number formatting: "1 435", "13,2". */
const int = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatInt = (n: number) => int.format(Math.round(n));
export const formatOne = (n: number) => one.format(n);
export const formatKcal = (n: number) => `${formatInt(n)} ккал`;
export const formatGrams = (n: number) => `${formatInt(n)} г`;

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
