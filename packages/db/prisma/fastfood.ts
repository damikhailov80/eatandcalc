/**
 * Shared fast-food catalog, seeded by `prisma/seed.ts` into the `product` table with `restaurant` set
 * (upsert by id, safe to re-run). Unlike `catalog.ts` (USDA), the values come from the chains' own tables:
 * - McDonald's Polska: nutrition PDF valid from 18.11.2026; per 100 g as published, portion weight =
 *   kJ per portion ÷ kJ per 100 g × 100.
 * - KFC Polska: nutrition PDF of 12.11.2026; per 100 g and the average portion weight as published.
 * - Burger King: Poland publishes no open table, so the official Lithuanian site (same chain, per portion
 *   with its weight) is used and converted to per 100 g.
 * - Pizza Hut Polska: the newest table on pizzahut.pl is of 05/2019; per 100 g and portion as published.
 *   A pizza is the whole medium one (eat a part as 0,25 шт and so on).
 * Values are rounded to 0.1. One portion = `units.pieceM` (shown as «шт» for fast food).
 *
 * Ids are permanent (`ff-<chain>-…`): families' edits, favorites and meals point at them.
 * Never change or reuse an id; fix a name or values in place, add new dishes at the end of their chain.
 */
import type { ProductCategory, Restaurant } from '../src/generated/prisma/enums';

const MCD = 'https://mcdonalds.pl/tabela-wartosci-odzywczych (PDF, 18.11.2026)';
const MCD_SUGAR = `${MCD} + 2 × 4 g sugar (USDA FDC 169655)`;
const KFC = 'https://kfc.pl/kcal-wartosci-odzywcze-alergeny-skladniki (PDF, 12.11.2026)';
const BK = 'https://burgerking.lt/en/menu/';
const PH = 'https://pizzahut.pl/en/nutritional-facts (PDF, 05/2019)';

export type FastFoodItem = {
  id: string;
  name: string;
  restaurant: Restaurant;
  /** Only for the tile color in old apps and the product category filter; fast food UI shows the chain. */
  category: ProductCategory;
  /** Per 100 g. */
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** Grams of one portion (one burger, one pack of fries, one drink). */
  portionG: number;
  /** Where the values come from. */
  source: string;
};

const f = (
  id: string,
  name: string,
  restaurant: Restaurant,
  category: ProductCategory,
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  portionG: number,
  source: string,
): FastFoodItem => ({ id, name, restaurant, category, kcal, protein, fat, carbs, portionG, source });

export const FASTFOOD: FastFoodItem[] = [
  // McDonald's
  f('ff-mcd-mcmuffin-farmerskiy', 'Макмаффин Фермерский (McMuffin Farmerski)', 'mcdonalds', 'other', 302, 14, 18, 21, 124.6, MCD),
  f('ff-mcd-zimniy-chay', 'Зимний чай с яблоками (без доп. сахара)', 'mcdonalds', 'drinks', 46, 0, 0, 11, 401.5, MCD),
  f('ff-mcd-latte-sredniy', 'Латте средний (без сахара)', 'mcdonalds', 'drinks', 49, 2.6, 2.6, 3.8, 296.6, MCD),
  f('ff-mcd-kofe-s-molokom-sredniy', 'Кофе с молоком средний (без сахара)', 'mcdonalds', 'drinks', 22, 1.3, 1.1, 1.7, 293.5, MCD),
  f('ff-mcd-kofe-s-molokom-sredniy-sakhar', 'Кофе с молоком средний с сахаром (2 пакетика)', 'mcdonalds', 'drinks', 31.7, 1.3, 1.1, 4.3, 301.5, MCD_SUGAR),
  f('ff-mcd-fri-malaya', 'Картофель фри маленький', 'mcdonalds', 'other', 287, 3.6, 14, 36, 80, MCD),
  f('ff-mcd-fri-srednyaya', 'Картофель фри средний', 'mcdonalds', 'other', 287, 3.6, 14, 36, 114, MCD),
  f('ff-mcd-fri-bolshaya', 'Картофель фри большой', 'mcdonalds', 'other', 287, 3.6, 14, 36, 150, MCD),
  f('ff-mcd-big-mac', 'Big Mac', 'mcdonalds', 'other', 231, 12, 12, 18, 235.5, MCD),
  f('ff-mcd-cheeseburger', 'Чизбургер', 'mcdonalds', 'other', 254, 13, 11, 25, 120.6, MCD),
  f('ff-mcd-hamburger', 'Гамбургер', 'mcdonalds', 'other', 243, 13, 8.9, 27, 106.4, MCD),
  f('ff-mcd-mcchicken', 'McChicken', 'mcdonalds', 'other', 229, 11, 9, 25, 189.2, MCD),
  f('ff-mcd-mcroyal', 'McRoyal', 'mcdonalds', 'other', 256, 15, 13, 18, 213.3, MCD),
  f('ff-mcd-wiesmac', 'WieśMac', 'mcdonalds', 'other', 261, 13, 16, 15, 232, MCD),
  f('ff-mcd-mcdouble', 'McDouble', 'mcdonalds', 'other', 252, 15, 13, 19, 161.3, MCD),
  f('ff-mcd-chikker', 'Chikker', 'mcdonalds', 'other', 272, 9.6, 12, 30, 149.8, MCD),
  f('ff-mcd-mcnuggets-6', 'McNuggets, 6 шт', 'mcdonalds', 'other', 241, 15, 11, 19, 108.6, MCD),
  f('ff-mcd-mcnuggets-9', 'McNuggets, 9 шт', 'mcdonalds', 'other', 241, 15, 11, 19, 162.9, MCD),
  f('ff-mcd-mcwrap-klassicheskiy', 'McWrap хрустящий классический', 'mcdonalds', 'other', 209, 9, 8.5, 23, 273.9, MCD),
  f('ff-mcd-mccrispy', 'McCrispy', 'mcdonalds', 'other', 237, 12, 10, 24, 232.4, MCD),
  f('ff-mcd-mcflurry-kitkat', 'McFlurry KitKat', 'mcdonalds', 'sweets', 183, 3.8, 6.2, 28, 162.8, MCD),
  f('ff-mcd-coca-cola-04', 'Coca-Cola 0,4 л', 'mcdonalds', 'drinks', 42, 0, 0, 11, 415.6, MCD),
  f('ff-mcd-shake-vanilnyy-025', 'Молочный коктейль ванильный 0,25 л', 'mcdonalds', 'drinks', 116, 3, 2.1, 21, 172.5, MCD),

  // KFC
  f('ff-kfc-grudka', 'Грудка Kentucky, 1 шт', 'kfc', 'other', 236, 27, 11, 7.3, 100, KFC),
  f('ff-kfc-bedro', 'Бедро Kentucky, 1 шт', 'kfc', 'other', 248, 21, 16, 5.8, 111, KFC),
  f('ff-kfc-krylo', 'Крыло Kentucky, 1 шт', 'kfc', 'other', 291, 24, 17, 11, 65, KFC),
  f('ff-kfc-hot-wings', 'Hot Wings, 1 шт', 'kfc', 'other', 320, 20, 21, 14, 36, KFC),
  f('ff-kfc-strips', 'Стрипсы Hot & Spicy, 1 шт', 'kfc', 'other', 288, 21, 19, 9.9, 37, KFC),
  f('ff-kfc-zinger', 'Zinger Burger', 'kfc', 'other', 262, 15, 13, 21, 170, KFC),
  f('ff-kfc-zinger-max', 'Zinger Max', 'kfc', 'other', 246, 17, 12, 17, 240, KFC),
  f('ff-kfc-grander', 'Grander Burger', 'kfc', 'other', 252, 12, 13, 20, 300, KFC),
  f('ff-kfc-longer', 'Longer', 'kfc', 'other', 244, 12, 6.4, 34, 127, KFC),
  f('ff-kfc-cheeseburger', 'Чизбургер', 'kfc', 'other', 247, 14, 8, 32, 125, KFC),
  f('ff-kfc-twister', 'Twister', 'kfc', 'other', 256, 10, 13, 25, 226, KFC),
  f('ff-kfc-fri', 'Картофель фри', 'kfc', 'other', 252, 3.6, 10, 37, 80, KFC),
  f('ff-kfc-fri-bolshaya', 'Картофель фри большой', 'kfc', 'other', 252, 3.6, 10, 37, 115, KFC),
  f('ff-kfc-kukuruza', 'Кукуруза с маслом', 'kfc', 'other', 134, 3.7, 2, 25, 125, KFC),
  f('ff-kfc-coleslaw', 'Салат Коул слоу', 'kfc', 'other', 105, 1.5, 7, 11, 140, KFC),

  // Burger King
  f('ff-bk-whopper', 'Whopper', 'burgerking', 'other', 237.2, 10.6, 13.4, 17.9, 286.2, `${BK}flame-grilled-burgers/whopper/`),
  f('ff-bk-whopper-cheese', 'Whopper с сыром', 'burgerking', 'other', 245.2, 11.2, 14.4, 16.8, 309.2, `${BK}flame-grilled-burgers/whopper-cheese/`),
  f('ff-bk-double-whopper', 'Double Whopper', 'burgerking', 'other', 253.9, 13.6, 15.7, 13.8, 370.2, `${BK}flame-grilled-burgers/double-whopper/`),
  f('ff-bk-double-cheeseburger', 'Двойной чизбургер', 'burgerking', 'other', 274, 16.4, 14, 19.3, 163.2, `${BK}flame-grilled-burgers/double-cheeseburger/`),
  f('ff-bk-big-king', 'Big King', 'burgerking', 'other', 257.6, 14.1, 15, 15.5, 182.1, `${BK}flame-grilled-burgers/big-king/`),
  f('ff-bk-bacon-king', 'Bacon King', 'burgerking', 'other', 324.5, 17.8, 21.3, 14.5, 335, `${BK}flame-grilled-burgers/bacon-king/`),
  f('ff-bk-cheeseburger', 'Чизбургер', 'burgerking', 'other', 262.9, 13.6, 10.9, 26.2, 118.9, `${BK}flame-grilled-burgers/cheeseburger/`),
  f('ff-bk-hamburger', 'Гамбургер', 'burgerking', 'other', 254, 13, 9.2, 28.6, 107.4, `${BK}flame-grilled-burgers/hamburger/`),
  f('ff-bk-long-chicken', 'Long Chicken', 'burgerking', 'other', 274.2, 11.8, 14.2, 24.7, 212, `${BK}long-burgers/long-chicken/`),
  f('ff-bk-crispy-chicken', 'Crispy Chicken', 'burgerking', 'other', 283.5, 9.3, 16.3, 23.4, 153, `${BK}chicken-burgers/crispy-chicken/`),
  f('ff-bk-tendercrisp', 'Chicken Tendercrisp', 'burgerking', 'other', 241.4, 11.6, 12.1, 20.3, 268.6, `${BK}chicken-burgers/chicken-tendercrisp/`),
  f('ff-bk-nuggets', 'Наггетсы', 'burgerking', 'other', 242.1, 12.1, 12.1, 21, 68, `${BK}sides-snacks-and-sauces/chicken-nuggets-dip/`),
  f('ff-bk-fri-srednyaya', 'Картофель фри средний', 'burgerking', 'other', 247, 3.2, 11.1, 32.5, 116, `${BK}sides-snacks-and-sauces/fries-medium/`),
  f('ff-bk-fri-bolshaya', 'Картофель фри большой', 'burgerking', 'other', 247, 3.2, 11.1, 32.5, 159, `${BK}sides-snacks-and-sauces/fries-large/`),
  f('ff-bk-lukovye-koltsa', 'Луковые кольца', 'burgerking', 'other', 260.4, 4.4, 12.6, 34.6, 90, `${BK}sides-snacks-and-sauces/onion-rings/`),

  // Pizza Hut
  f('ff-ph-pan-pepperoni', 'Пицца Пепперони Pan, средняя', 'pizzahut', 'other', 273, 12.4, 10.3, 31.3, 518, PH),
  f('ff-ph-pan-margherita', 'Пицца Маргарита Pan, средняя', 'pizzahut', 'other', 261, 12.7, 9.3, 30.2, 547, PH),
  f('ff-ph-pan-gavayskaya', 'Пицца Гавайская Pan, средняя', 'pizzahut', 'other', 230, 11.9, 7, 31.1, 592, PH),
  f('ff-ph-pan-supreme', 'Пицца Supreme Pan, средняя', 'pizzahut', 'other', 240, 11.9, 9.4, 25.9, 599, PH),
  f('ff-ph-pan-myasnaya', 'Пицца Мясная Pan, средняя', 'pizzahut', 'other', 253, 13.6, 10.7, 22.6, 604, PH),
  f('ff-ph-pan-capricciosa', 'Пицца Капричоза Pan, средняя', 'pizzahut', 'other', 240, 10.4, 8.5, 29.2, 669, PH),
  f('ff-ph-pan-fermerskaya', 'Пицца Фермерская Pan, средняя', 'pizzahut', 'other', 210, 11.5, 6.5, 24.8, 624, PH),
  f('ff-ph-pan-kuritsa', 'Пицца с курицей Pan, средняя', 'pizzahut', 'other', 260, 14, 9.4, 28.7, 597, PH),
  f('ff-ph-pan-vege', 'Пицца Vege Mania Pan, средняя', 'pizzahut', 'other', 213, 9, 6.8, 28.1, 625, PH),
  f('ff-ph-pan-americana', 'Пицца Американа Pan, средняя', 'pizzahut', 'other', 239, 9.6, 8.1, 31.3, 614, PH),
  f('ff-ph-sf-pepperoni', 'Пицца Пепперони San Francisco, средняя', 'pizzahut', 'other', 304, 13.6, 11, 36.5, 528, PH),
  f('ff-ph-sf-margherita', 'Пицца Маргарита San Francisco, средняя', 'pizzahut', 'other', 277, 14.7, 9.1, 33.1, 557, PH),
  f('ff-ph-chesnochnyy-khleb', 'Чесночный хлеб с сыром, 2 шт', 'pizzahut', 'other', 383, 11.9, 20.1, 36.9, 66, PH),
  f('ff-ph-krylyshki-6', 'Куриные крылышки, 6 шт', 'pizzahut', 'other', 198, 19.3, 12.2, 2.3, 278, PH),
  f('ff-ph-spaghetti-bolognese', 'Спагетти болоньезе', 'pizzahut', 'other', 141, 5.8, 4.2, 18.9, 364, PH),
];
