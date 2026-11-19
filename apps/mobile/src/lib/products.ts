import { matchesSearch, type ProductCategory, type ProductDto, type ProductSource } from '@eatandcalc/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { api } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';

/** List filters (chips) of products and recipes. Hidden items show up only under `hidden`. */
export type ListFilter = 'mine' | 'all' | 'favorites' | 'own' | 'modified' | 'hidden';
export type ProductFilter = ListFilter;

/** What the filters look at: products and recipes carry the same flags. */
export type ListFlags = { favorite: boolean; source: ProductSource; modified: boolean; hidden: boolean };

export const filterLabels: Record<ListFilter, string> = {
  mine: 'Свои',
  all: 'Все',
  favorites: 'Избранное',
  own: 'Добавленные',
  modified: 'Изменённые',
  hidden: 'Скрытые',
};

const predicates: Record<ListFilter, (p: ListFlags) => boolean> = {
  mine: (p) => p.favorite || p.source === 'own',
  all: () => true,
  favorites: (p) => p.favorite,
  own: (p) => p.source === 'own',
  modified: (p) => p.modified,
  hidden: (p) => p.hidden,
};

/** The item belongs to the filter's list. */
export const matchesListFilter = (item: ListFlags, filter: ListFilter) =>
  (filter === 'hidden' || !item.hidden) && predicates[filter](item);

export function filterProducts(
  products: readonly ProductDto[],
  { filter, category, query }: { filter: ProductFilter; category: ProductCategory | null; query: string },
): ProductDto[] {
  return products.filter(
    (p) =>
      matchesListFilter(p, filter) &&
      (category == null || p.category === category) &&
      matchesSearch(p.name, query),
  );
}

type Flag = 'favorite' | 'hidden';
const FLAG_MUTATION = ['products', 'flag'];
type FlagChange = { id: string; flag: Flag; value: boolean };

/** Puts the flag into the cached list and the cached product right away. */
function patchCache({ id, flag, value }: FlagChange) {
  queryClient.setQueryData<ProductDto[]>(queryKeys.products, (list) =>
    list?.map((p) => (p.id === id ? { ...p, [flag]: value } : p)),
  );
  queryClient.setQueryData<ProductDto>([...queryKeys.products, id], (p) => (p ? { ...p, [flag]: value } : p));
}

/**
 * ♥ and hiding with an optimistic cache update (rolled back on error).
 * The returned functions are stable, so memoized rows don't re-render.
 */
export function useProductFlags() {
  const { mutate } = useMutation({
    mutationKey: FLAG_MUTATION,
    mutationFn: ({ id, flag, value }: FlagChange) =>
      flag === 'favorite' ? api.setProductFavorite(id, value) : api.setProductHidden(id, value),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products });
      patchCache(change);
    },
    onError: (e, change) => {
      patchCache({ ...change, value: !change.value });
      Alert.alert('Не получилось', familyErrorMessage(e));
    },
    // Refetch after the last of quick successive taps, so an early refetch doesn't undo a later one.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: FLAG_MUTATION }) <= 1) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products });
      }
    },
  });
  const toggleFavorite = useCallback(
    (p: Pick<ProductDto, 'id' | 'favorite'>) => mutate({ id: p.id, flag: 'favorite', value: !p.favorite }),
    [mutate],
  );
  const setHidden = useCallback(
    (p: Pick<ProductDto, 'id'>, hidden: boolean) => mutate({ id: p.id, flag: 'hidden', value: hidden }),
    [mutate],
  );
  return { toggleFavorite, setHidden };
}
