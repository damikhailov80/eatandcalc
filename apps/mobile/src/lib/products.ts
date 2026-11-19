import { matchesSearch, type ProductCategory, type ProductDto } from '@eatandcalc/shared';

/** Product list filters (chips). Hidden products show up only under `hidden`. */
export type ProductFilter = 'mine' | 'all' | 'favorites' | 'own' | 'modified' | 'hidden';

export const filterLabels: Record<ProductFilter, string> = {
  mine: 'Свои',
  all: 'Все',
  favorites: 'Избранное',
  own: 'Добавленные',
  modified: 'Изменённые',
  hidden: 'Скрытые',
};

const predicates: Record<ProductFilter, (p: ProductDto) => boolean> = {
  mine: (p) => p.favorite || p.source === 'own',
  all: () => true,
  favorites: (p) => p.favorite,
  own: (p) => p.source === 'own',
  modified: (p) => p.modified,
  hidden: (p) => p.hidden,
};

export function filterProducts(
  products: readonly ProductDto[],
  { filter, category, query }: { filter: ProductFilter; category: ProductCategory | null; query: string },
): ProductDto[] {
  return products.filter(
    (p) =>
      (filter === 'hidden' || !p.hidden) &&
      predicates[filter](p) &&
      (category == null || p.category === category) &&
      matchesSearch(p.name, query),
  );
}
