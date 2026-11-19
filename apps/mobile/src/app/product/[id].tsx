import {
  formatInt,
  formatNumberInput,
  formatOne,
  UNIT_KEYS,
  unitShort,
  type ProductData,
  type ProductDto,
} from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { blankDraft, fromDraft, ProductForm, toDraft, type ProductDraft } from '@/components/products/ProductForm';
import { Button, Card, Screen, StateMessage, StickyFooter, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';
import { colors, fonts, radii, spacing } from '@/theme';

const NEW = 'new';

const productData = (p: ProductDto): ProductData => ({
  name: p.name,
  category: p.category,
  nutrients: p.nutrients,
  units: p.units,
});

/** "398 ккал · Б 0,0 · Ж 0,0 · У 99,7 · ст. л. 25 г, ч. л. 8 г". */
function summary(d: ProductData) {
  const n = d.nutrients;
  const units = UNIT_KEYS.filter((k) => d.units[k] != null)
    .map((k) => `${unitShort[k]} ${formatNumberInput(d.units[k]!, k === 'ml' ? 3 : 1)} г`)
    .join(', ');
  return [
    `${formatInt(n.kcal)} ккал · Б ${formatOne(n.protein)} · Ж ${formatOne(n.fat)} · У ${formatOne(n.carbs)}`,
    units,
  ]
    .filter(Boolean)
    .join('\n');
}

function Editor({ product, initial }: { product: ProductDto | null; initial: ProductDraft }) {
  const [value, setValue] = useState(initial);
  const data = fromDraft(value);

  const done = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.products });
    router.back();
  };
  const onError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));

  const save = useMutation({
    mutationFn: (input: ProductData) =>
      product ? api.updateProduct(product.id, input) : api.createProduct(input),
    onSuccess: done,
    onError,
  });
  const reset = useMutation({ mutationFn: () => api.resetProduct(product!.id), onSuccess: done, onError });

  const confirmReset = () =>
    Alert.alert('Вернуть стандартные значения?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Вернуть', style: 'destructive', onPress: () => reset.mutate() },
    ]);

  const busy = save.isPending || reset.isPending;
  const [showOriginal, setShowOriginal] = useState(false);
  const badge = product?.original ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Изменён. Показать стандартные значения"
      accessibilityState={{ expanded: showOriginal }}
      hitSlop={8}
      onPress={() => setShowOriginal((v) => !v)}
      style={({ pressed }) => [styles.badge, styles.badgeModified, pressed && styles.pressed]}>
      <MaterialCommunityIcons name="history" size={14} color={colors.warn} />
      <Text style={styles.badgeText} color={colors.warn}>изменён</Text>
    </Pressable>
  ) : product?.source === 'own' ? (
    <View style={[styles.badge, styles.badgeOwn]}>
      <Text style={styles.badgeText} color={colors.primaryDark}>свой</Text>
    </View>
  ) : null;

  return (
    <Screen
      title={product ? 'Продукт' : 'Новый продукт'}
      onBack={() => router.back()}
      actions={badge}
      footer={
        <StickyFooter>
          <Button title="Сохранить" large disabled={!data || busy} onPress={() => data && save.mutate(data)} />
        </StickyFooter>
      }>
      {showOriginal && product?.original ? (
        <Card style={styles.info}>
          <Text variant="caption">{summary(product.original)}</Text>
          <Button title="Вернуть стандартные" variant="soft" disabled={busy} onPress={confirmReset} />
        </Card>
      ) : null}

      <ProductForm
        value={value}
        onChange={setValue}
        reference={product?.source === 'catalog' ? (product.original ?? product).nutrients : undefined}
      />
    </Screen>
  );
}

export default function ProductEditScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const isNew = id === NEW;

  const product = useQuery({
    queryKey: [...queryKeys.products, id],
    queryFn: () => api.product(id),
    enabled: !isNew,
    initialData: () => queryClient.getQueryData<ProductDto[]>(queryKeys.products)?.find((p) => p.id === id),
  });

  if (isNew) return <Editor product={null} initial={blankDraft(name ?? '')} />;
  if (product.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (product.isError) {
    return (
      <StateMessage
        icon="food-off-outline"
        title="Продукт не найден"
        text={familyErrorMessage(product.error)}
        actionTitle="Назад"
        onAction={() => router.back()}
      />
    );
  }
  return <Editor key={product.data.id} product={product.data} initial={toDraft(productData(product.data))} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  info: { gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
  },
  badgeModified: { backgroundColor: colors.warnSoft },
  badgeOwn: { backgroundColor: colors.primarySoft },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 12 },
  pressed: { opacity: 0.7 },
});
