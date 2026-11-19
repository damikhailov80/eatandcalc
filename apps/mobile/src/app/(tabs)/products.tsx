import {
  categoryLabels,
  formatInt,
  pluralRu,
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type ProductDto,
} from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, type ListRenderItem } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { ProductRow, type ProductRowAction } from '@/components/products/ProductRow';
import { Button, Card, Chip, ChipRow, ListScreen, SearchField, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { filterLabels, filterProducts, type ProductFilter } from '@/lib/products';
import { queryClient, queryKeys, refreshAll } from '@/lib/query';
import { colors, spacing } from '@/theme';

/** Filter chips shown so far (Избранное and Скрытые arrive with favorites and hiding). */
const FILTERS: readonly ProductFilter[] = ['mine', 'all', 'own', 'modified'];

const productsWord = ['продукт', 'продукта', 'продуктов'] as const;

const openProduct = (product: Pick<ProductDto, 'id'>, name?: string) =>
  router.push({ pathname: '/product/[id]', params: name ? { id: product.id, name } : { id: product.id } });

const emptyText: Partial<Record<ProductFilter, string>> = {
  mine: 'Здесь будут избранные и добавленные',
  own: 'Добавленных продуктов нет',
  modified: 'Изменённых продуктов нет',
};

const keyExtractor = (p: ProductDto) => p.id;

export default function ProductsScreen() {
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const [query, setQuery] = useState('');
  const [chosenFilter, setFilter] = useState<ProductFilter | null>(null);
  const [category, setCategory] = useState<ProductCategory | null>(null);

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

  const list = products.data;
  const mineCount = useMemo(
    () => (list ? filterProducts(list, { filter: 'mine', category: null, query: '' }).length : 0),
    [list],
  );
  // "Свои" is the quick list; while it's empty start with the whole catalog.
  const filter = chosenFilter ?? (mineCount > 0 ? 'mine' : 'all');

  const visible = useMemo(
    () => (list ? filterProducts(list, { filter, category, query }) : []),
    [list, filter, category, query],
  );
  // Nothing found in a narrow filter: offer the same search over everything.
  const foundElsewhere = useMemo(
    () =>
      list && query && visible.length === 0 && (filter !== 'all' || category != null)
        ? filterProducts(list, { filter: 'all', category: null, query }).length
        : 0,
    [list, query, visible.length, filter, category],
  );

  const lastIndex = visible.length - 1;
  const action = filter === 'modified' ? resetAction : undefined;
  const renderItem = useCallback<ListRenderItem<ProductDto>>(
    ({ item, index }) => (
      <ProductRow product={item} first={index === 0} last={index === lastIndex} onPress={openProduct} action={action} />
    ),
    [lastIndex, action],
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

  const total = products.data.filter((p) => !p.hidden).length;
  const trimmed = query.trim();

  const header = (
    <>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={`Поиск среди ${formatInt(total)} ${pluralRu(total, productsWord)}`}
        accessibilityLabel="Поиск продуктов"
      />
      <ChipRow>
        {FILTERS.map((f) => (
          <Chip key={f} label={filterLabels[f]} selected={f === filter} onPress={() => setFilter(f)} />
        ))}
      </ChipRow>
      <ChipRow>
        <Chip label="Все категории" selected={category == null} onPress={() => setCategory(null)} />
        {PRODUCT_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={categoryLabels[c]}
            selected={c === category}
            onPress={() => setCategory(c === category ? null : c)}
          />
        ))}
      </ChipRow>
    </>
  );

  const empty = (
    <Card style={styles.empty}>
      <Text variant="h3">{trimmed ? 'Ничего не нашлось' : (emptyText[filter] ?? 'Нет продуктов')}</Text>
      {foundElsewhere > 0 ? (
        <Button
          variant="soft"
          title={`Найдено во всех продуктах: ${formatInt(foundElsewhere)}`}
          onPress={() => {
            setFilter('all');
            setCategory(null);
          }}
        />
      ) : null}
      {trimmed ? (
        <Button variant="ghost" title={`Добавить «${trimmed}»`} onPress={() => openProduct({ id: 'new' }, trimmed)} />
      ) : null}
    </Card>
  );

  return (
    <ListScreen
      title="Продукты"
      actions={<Button title="Добавить" onPress={() => openProduct({ id: 'new' })} style={styles.add} />}
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
