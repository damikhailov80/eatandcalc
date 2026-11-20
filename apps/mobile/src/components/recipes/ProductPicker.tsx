import type { ProductDto } from '@eatandcalc/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, KeyboardAvoidingView, StyleSheet, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductRow } from '@/components/products/ProductRow';
import { Card, Chip, ChipRow, IconButton, SearchField, Text } from '@/components/ui';
import { filterLabels, filterProducts, type ProductFilter } from '@/lib/products';
import { colors, fonts, spacing } from '@/theme';

const FILTERS: readonly ProductFilter[] = ['mine', 'all'];

const keyExtractor = (p: ProductDto) => p.id;

export type ProductPickerProps = {
  products: readonly ProductDto[];
  onPick: (product: ProductDto) => void;
  onClose: () => void;
};

/** Full-screen product list with search (in place of the recipe editor): a tap adds the product. */
export function ProductPicker({ products, onPick, onClose }: ProductPickerProps) {
  const [query, setQuery] = useState('');
  const mineCount = useMemo(
    () => filterProducts(products, { kind: 'products', filter: 'mine', query: '' }).length,
    [products],
  );
  const [filter, setFilter] = useState<ProductFilter>(mineCount > 0 ? 'mine' : 'all');
  // A search looks through everything: a product missing from "Свои" is the usual case.
  const effective = query.trim() ? 'all' : filter;
  const visible = useMemo(
    () => filterProducts(products, { kind: 'products', filter: effective, query }),
    [products, effective, query],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const lastIndex = visible.length - 1;
  const renderItem = useCallback<ListRenderItem<ProductDto>>(
    ({ item, index }) => <ProductRow product={item} first={index === 0} last={index === lastIndex} onPress={onPick} />,
    [lastIndex, onPick],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={styles.root} behavior="height">
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Назад" variant="plain" onPress={onClose} />
          <Text variant="h2" style={styles.title}>Добавить продукт</Text>
        </View>
        <FlatList
          data={visible}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              <SearchField value={query} onChangeText={setQuery} placeholder="Поиск продукта" />
              {query.trim() ? null : (
                <ChipRow>
                  {FILTERS.map((f) => (
                    <Chip key={f} label={filterLabels[f]} selected={f === filter} onPress={() => setFilter(f)} />
                  ))}
                </ChipRow>
              )}
            </>
          }
          ListHeaderComponentStyle={styles.listHeader}
          ListEmptyComponent={
            <Card>
              <Text variant="h3">Ничего не нашлось</Text>
            </Card>
          }
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={14}
          maxToRenderPerBatch={20}
          windowSize={7}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  title: { flex: 1, fontSize: 20, fontFamily: fonts.headingHeavy },
  content: { padding: spacing.xl },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
});
