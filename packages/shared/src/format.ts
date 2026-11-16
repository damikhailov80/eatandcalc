/** Russian number formatting: "1 435", "13,2". */
const int = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatInt = (n: number) => int.format(Math.round(n));
export const formatOne = (n: number) => one.format(n);
export const formatKcal = (n: number) => `${formatInt(n)} ккал`;
export const formatGrams = (n: number) => `${formatInt(n)} г`;
