import { matchesSearch, type ProductCategory, type ProductDto, type ProductSource } from '@eatandcalc/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { api } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { queryClient, queryKeys } from '@/lib/query';

/** List filters (chips) of products and recipes. Hidden items show up only under `hidden`. `mine` = added by the family. */
export type ListFilter = 'mine' | 'all' | 'favorites' | 'modified' | 'hidden';
export type ProductFilter = ListFilter;

/** What the filters look at: products and recipes carry the same flags. */
export type ListFlags = { favorite: boolean; source: ProductSource; modified: boolean; hidden: boolean };

export const filterLabels: Record<ListFilter, string> = {
  mine: 'Свои',
  all: 'Все',
  favorites: 'Избранное',
  modified: 'Изменённые',
  hidden: 'Скрытые',
};

const predicates: Record<ListFilter, (p: ListFlags) => boolean> = {
  mine: (p) => p.source === 'own',
  all: () => true,
  favorites: (p) => p.favorite,
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
type FlagChange = { id: string; flag: Flag; value: boolean };
type Flagged = { id: string } & Pick<ListFlags, Flag>;

/** Puts the flag into the cached list and the cached item right away. */
function patchCache(key: readonly string[], { id, flag, value }: FlagChange) {
  queryClient.setQueryData<Flagged[]>(key, (list) => list?.map((p) => (p.id === id ? { ...p, [flag]: value } : p)));
  queryClient.setQueryData<Flagged>([...key, id], (p) => (p ? { ...p, [flag]: value } : p));
}

/**
 * ♥ and hiding of products or recipes with an optimistic cache update (rolled back on error).
 * The returned functions are stable, so memoized rows don't re-render.
 */
export function useListFlags(
  key: readonly string[],
  request: (id: string, flag: Flag, value: boolean) => Promise<unknown>,
) {
  const mutationKey = [...key, 'flag'];
  const { mutate } = useMutation({
    mutationKey,
    mutationFn: ({ id, flag, value }: FlagChange) => request(id, flag, value),
    meta: { haptic: false },
    onMutate: async (change) => {
      haptics.tap();
      await queryClient.cancelQueries({ queryKey: key });
      patchCache(key, change);
    },
    onError: (e, change) => {
      patchCache(key, { ...change, value: !change.value });
      Alert.alert('Не получилось', familyErrorMessage(e));
    },
    // Refetch after the last of quick successive taps, so an early refetch doesn't undo a later one.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) <= 1) queryClient.invalidateQueries({ queryKey: key });
    },
  });
  const toggleFavorite = useCallback(
    (p: Pick<Flagged, 'id' | 'favorite'>) => mutate({ id: p.id, flag: 'favorite', value: !p.favorite }),
    [mutate],
  );
  const setHidden = useCallback(
    (p: Pick<Flagged, 'id'>, hidden: boolean) => mutate({ id: p.id, flag: 'hidden', value: hidden }),
    [mutate],
  );
  return { toggleFavorite, setHidden };
}

const productFlag = (id: string, flag: Flag, value: boolean) =>
  flag === 'favorite' ? api.setProductFavorite(id, value) : api.setProductHidden(id, value);

export const useProductFlags = () => useListFlags(queryKeys.products, productFlag);
