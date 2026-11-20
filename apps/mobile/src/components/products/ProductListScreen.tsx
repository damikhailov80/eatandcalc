import {
  categoryLabels,
  formatInt,
  pluralRu,
  PRODUCT_CATEGORIES,
  RESTAURANTS,
  restaurantLabels,
  type ProductCategory,
  type ProductDto,
  type Restaurant,
} from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, type ListRenderItem } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { ProductRow, type ProductRowAction } from '@/components/products/ProductRow';
import { Button, Card, Chip, ChipRow, ListScreen, SearchField, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import {
  filterLabels,
  filterProducts,
  isKind,
  useProductFlags,
  type ProductFilter,
  type ProductKind,
} from '@/lib/products';
import { queryClient, queryKeys, refreshAll } from '@/lib/query';
import { colors, spacing } from '@/theme';

const FILTERS: readonly ProductFilter[] = ['mine', 'all', 'favorites', 'modified', 'hidden'];

/** What differs between «Продукты» and «Фастфуд». */
const TEXTS = {
  products: {
    title: 'Продукты',
    words: ['продукт', 'продукта', 'продуктов'],
    searchLabel: 'Поиск продуктов',
    everywhere: 'Найдено во всех продуктах',
    empty: 'Нет продуктов',
    allGroups: 'Все категории',
    emptyBy: {
      mine: 'Своих продуктов нет',
      favorites: 'Избранных нет',
      modified: 'Изменённых продуктов нет',
      hidden: 'Скрытых нет',
    },
  },
  fastfood: {
    title: 'Фастфуд',
    words: ['блюдо', 'блюда', 'блюд'],
    searchLabel: 'Поиск блюд',
    everywhere: 'Найдено во всех блюдах',
    empty: 'Нет блюд',
    allGroups: 'Все рестораны',
    emptyBy: {
      mine: 'Своих блюд нет',
      favorites: 'Избранных нет',
      modified: 'Изменённых блюд нет',
      hidden: 'Скрытых нет',
    },
  },
} as const satisfies Record<ProductKind, { emptyBy: Partial<Record<ProductFilter, string>> } & Record<string, unknown>>;

const keyExtractor = (p: ProductDto) => p.id;

const openProduct = (product: Pick<ProductDto, 'id'>) =>
  router.push({ pathname: '/product/[id]', params: { id: product.id } });

/**
 * The «Продукты» tab (groceries, with categories) or the «Фастфуд» tab (restaurant dishes, with chains):
 * search, list filters, reset / restore actions, ♥, «Добавить».
 */
export function ProductListScreen({ kind }: { kind: ProductKind }) {
  const texts = TEXTS[kind];
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const [query, setQuery] = useState('');
  const [chosenFilter, setFilter] = useState<ProductFilter | null>(null);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const reset = useMutation({
    mutationFn: api.resetProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.products }),
    onError: (e) => Alert.alert('Не получилось', familyErrorMessage(e)),
  });
  const { mutate: resetMutate } = reset;
  const resetAction = useMemo<ProductRowAction>(
    () => ({
      icon: 'restore',
      label: 'Вернуть стандартные',
      onPress: (p) =>
        Alert.alert(`Вернуть стандартные значения «${p.name}»?`, undefined, [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Вернуть', style: 'destructive', onPress: () => resetMutate(p.id) },
        ]),
    }),
    [resetMutate],
  );

  const { toggleFavorite, setHidden } = useProductFlags();
  const restoreAction = useMemo<ProductRowAction>(
    () => ({ icon: 'eye-outline', label: 'Вернуть', onPress: (p) => setHidden(p, false) }),
    [setHidden],
  );

  const list = products.data;
  const mineCount = useMemo(
    () => (list ? filterProducts(list, { kind, filter: 'mine', query: '' }).length : 0),
    [list, kind],
  );
  // "Свои" is the quick list; while it's empty start with the whole catalog.
  const filter = chosenFilter ?? (mineCount > 0 ? 'mine' : 'all');
  // Pin the starting filter once loaded, so the first ♥ doesn't switch the list under the finger.
  if (list && chosenFilter == null) setFilter(filter);

  const visible = useMemo(
    () => (list ? filterProducts(list, { kind, filter, category, restaurant, query }) : []),
    [list, kind, filter, category, restaurant, query],
  );
  const narrowed = filter !== 'all' || category != null || restaurant != null;
  // Nothing found in a narrow filter: offer the same search over everything.
  const foundElsewhere = useMemo(
    () =>
      list && query && visible.length === 0 && narrowed
        ? filterProducts(list, { kind, filter: 'all', query }).length
        : 0,
    [list, kind, query, visible.length, narrowed],
  );

  const lastIndex = visible.length - 1;
  const action = filter === 'modified' ? resetAction : filter === 'hidden' ? restoreAction : undefined;
  const renderItem = useCallback<ListRenderItem<ProductDto>>(
    ({ item, index }) => (
      <ProductRow
        product={item}
        first={index === 0}
        last={index === lastIndex}
        onPress={openProduct}
        onToggleFavorite={toggleFavorite}
        action={action}
      />
    ),
    [lastIndex, action, toggleFavorite],
  );

  if (products.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (products.isError) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => products.refetch()}
      />
    );
  }

  const total = products.data.filter((p) => !p.hidden && isKind(p, kind)).length;
  const trimmed = query.trim();
  // A new dish starts in the chosen chain («Другое» when none is chosen).
  const create = (name?: string) =>
    router.push({
      pathname: '/product/[id]',
      params: {
        id: 'new',
        ...(name ? { name } : {}),
        ...(kind === 'fastfood' ? { restaurant: restaurant ?? 'other' } : {}),
      },
    });

  const groups =
    kind === 'fastfood' ? (
      <ChipRow>
        <Chip label={texts.allGroups} selected={restaurant == null} onPress={() => setRestaurant(null)} />
        {RESTAURANTS.map((r) => (
          <Chip
            key={r}
            label={restaurantLabels[r]}
            selected={r === restaurant}
            onPress={() => setRestaurant(r === restaurant ? null : r)}
          />
        ))}
      </ChipRow>
    ) : (
      <ChipRow>
        <Chip label={texts.allGroups} selected={category == null} onPress={() => setCategory(null)} />
        {PRODUCT_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={categoryLabels[c]}
            selected={c === category}
            onPress={() => setCategory(c === category ? null : c)}
          />
        ))}
      </ChipRow>
    );

  const header = (
    <>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={`Поиск среди ${formatInt(total)} ${pluralRu(total, texts.words)}`}
        accessibilityLabel={texts.searchLabel}
      />
      <ChipRow>
        {FILTERS.map((f) => (
          <Chip key={f} label={filterLabels[f]} selected={f === filter} onPress={() => setFilter(f)} />
        ))}
      </ChipRow>
      {groups}
    </>
  );

  const emptyBy: Partial<Record<ProductFilter, string>> = texts.emptyBy;
  const empty = (
    <Card style={styles.empty}>
      <Text variant="h3">{trimmed ? 'Ничего не нашлось' : (emptyBy[filter] ?? texts.empty)}</Text>
      {foundElsewhere > 0 ? (
        <Button
          variant="soft"
          title={`${texts.everywhere}: ${formatInt(foundElsewhere)}`}
          onPress={() => {
            setFilter('all');
            setCategory(null);
            setRestaurant(null);
          }}
        />
      ) : null}
      {trimmed ? <Button variant="ghost" title={`Добавить «${trimmed}»`} onPress={() => create(trimmed)} /> : null}
    </Card>
  );

  return (
    <ListScreen
      title={texts.title}
      actions={<Button title="Добавить" onPress={() => create()} style={styles.add} />}
      header={header}
      onRefresh={refreshAll}
      data={visible}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListEmptyComponent={empty}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  empty: { gap: spacing.sm },
  add: { height: 44, paddingHorizontal: spacing.lg },
});
