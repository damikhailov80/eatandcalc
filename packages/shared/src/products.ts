/**
 * Product helpers shared by the app and the API: Russian labels, search normalization.
 */
import type { ExtraUnit, ProductCategory, UnitKey } from './domain';

export const categoryLabels: Record<ProductCategory, string> = {
  meat: 'Мясо и птица',
  fish: 'Рыба',
  dairy: 'Молочные',
  eggs: 'Яйца',
  vegetables: 'Овощи',
  fruits: 'Фрукты и ягоды',
  grains: 'Крупы и макароны',
  bakery: 'Хлеб и мука',
  legumes: 'Бобовые',
  nuts: 'Орехи и семена',
  oils: 'Масла и соусы',
  sweets: 'Сладкое',
  drinks: 'Напитки',
  other: 'Бакалея',
};

/** Two-letter tile text for a category ("Мя", "Ры"). */
export const categoryAbbr: Record<ProductCategory, string> = {
  meat: 'Мя',
  fish: 'Ры',
  dairy: 'Мо',
  eggs: 'Яй',
  vegetables: 'Ов',
  fruits: 'Фр',
  grains: 'Кр',
  bakery: 'Хл',
  legumes: 'Бо',
  nuts: 'Ор',
  oils: 'Ма',
  sweets: 'Сл',
  drinks: 'На',
  other: 'Ба',
};

/** Short unit name for amounts: "2 ст. л.", "150 г". */
export const unitShort: Record<UnitKey, string> = {
  g: 'г',
  ml: 'мл',
  tsp: 'ч. л.',
  tbsp: 'ст. л.',
  pieceS: 'шт (мал.)',
  pieceM: 'шт (сред.)',
  pieceL: 'шт (бол.)',
};

/** Unit name in the product editor ("1 ст. ложка"). */
export const unitLong: Record<ExtraUnit, string> = {
  ml: '1 мл',
  tsp: '1 ч. ложка',
  tbsp: '1 ст. ложка',
  pieceS: '1 шт маленькая',
  pieceM: '1 шт средняя',
  pieceL: '1 шт большая',
};

/** Lowercase, `ё` → `е`, collapsed spaces: the form names and queries are compared in. */
export const normalizeSearch = (text: string) =>
  text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

/** Every word of the query is a prefix of some word in the name ("кур гр" → "Куриная грудка"), or a substring of it. */
export function matchesSearch(name: string, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const n = normalizeSearch(name);
  if (n.includes(q)) return true;
  const words = n.split(/[\s,()%-]+/);
  return q.split(' ').every((part) => words.some((w) => w.startsWith(part)));
}

const collator = new Intl.Collator('ru-RU', { sensitivity: 'base' });

export const compareNames = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);
