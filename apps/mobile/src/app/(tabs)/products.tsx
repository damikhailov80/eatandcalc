import {
  categoryLabels,
  formatInt,
  pluralRu,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ProductRow } from '@/components/products/ProductRow';
import { Button, Card, Chip, ChipRow, Screen, SearchField, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { filterLabels, filterProducts, type ProductFilter } from '@/lib/products';
import { queryKeys, refreshAll } from '@/lib/query';
import { colors, spacing } from '@/theme';

/** Filter chips shown so far (the rest arrive with editing, hiding and favorites). */
const FILTERS: readonly ProductFilter[] = ['mine', 'all'];

const productsWord = ['продукт', 'продукта', 'продуктов'] as const;

export default function ProductsScreen() {
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const [query, setQuery] = useState('');
  const [chosenFilter, setFilter] = useState<ProductFilter | null>(null);
  const [category, setCategory] = useState<ProductCategory | null>(null);

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

  return (
    <Screen title="Продукты" onRefresh={refreshAll}>
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

      {visible.length > 0 ? (
        <Card style={styles.list}>
          {visible.map((p, i) => (
            <ProductRow key={p.id} product={p} first={i === 0} />
          ))}
        </Card>
      ) : (
        <Card style={styles.empty}>
          <Text variant="h3">{query ? 'Ничего не нашлось' : emptyTitle(filter)}</Text>
          {!query && filter === 'mine' ? (
            <Text variant="caption">Здесь будут избранные и добавленные вами продукты.</Text>
          ) : null}
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
        </Card>
      )}
    </Screen>
  );
}

function emptyTitle(filter: ProductFilter) {
  return filter === 'mine' ? 'Пока пусто' : 'Нет продуктов';
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { padding: 0, overflow: 'hidden' },
  empty: { gap: spacing.sm },
});
