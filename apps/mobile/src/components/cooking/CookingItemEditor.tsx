import { NutrientsSchema, type CookingItemDto } from '@eatandcalc/shared';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import {
  NutrientsCard,
  nutrientsText,
  parseNutrientsDraft,
  sameNutrients,
  type NutrientsDraft,
} from '@/components/products/ProductForm';
import { Button, Screen, StickyFooter, TextField } from '@/components/ui';
import type { ProductsById } from '@/lib/recipes';

export type CookingItemEditorProps = {
  item: CookingItemDto;
  products: ProductsById;
  /** The row with its new name and KBJU (amount, unit and units stay). */
  onDone: (item: CookingItemDto) => void;
  onClose: () => void;
};

/**
 * Name and KBJU per 100 g of one row of this pot only: no product is created or changed, the recipe stays as it is.
 * «Как в продукте» brings back the product as the family sees it now.
 */
export function CookingItemEditor({ item, products, onDone, onClose }: CookingItemEditorProps) {
  const [name, setName] = useState(item.name);
  const [nutrients, setNutrients] = useState<NutrientsDraft>(() => nutrientsText(item.nutrients));
  const product = item.productId ? products.get(item.productId) : undefined;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const parsed = parseNutrientsDraft(nutrients);
  const valid = parsed != null && NutrientsSchema.safeParse(parsed).success;
  const trimmed = name.trim();
  const ready = valid && trimmed.length > 0;
  const asProduct = product != null && trimmed === product.name && parsed != null && sameNutrients(parsed, product.nutrients);

  return (
    <Screen
      title="Ингредиент"
      onBack={onClose}
      footer={
        <StickyFooter>
          <Button
            title="Готово"
            large
            disabled={!ready}
            onPress={() => parsed && ready && onDone({ ...item, name: trimmed, nutrients: parsed })}
          />
        </StickyFooter>
      }>
      <TextField
        label="Название"
        value={name}
        onChangeText={setName}
        placeholder="Например, Сыр плавленый Дружба"
        maxLength={80}
        autoCapitalize="sentences"
      />
      <NutrientsCard value={nutrients} onChange={setNutrients} />
      {product && !asProduct ? (
        <View style={styles.reset}>
          <Button
            title="Как в продукте"
            variant="soft"
            onPress={() => {
              setName(product.name);
              setNutrients(nutrientsText(product.nutrients));
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reset: { alignItems: 'flex-start' },
});
