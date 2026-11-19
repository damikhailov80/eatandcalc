import { formatGrams, formatKcal, type JoinConflict, type JoinRecipeConflict, type JoinRecipeVersion } from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { productSummary } from '@/components/products/ProductForm';
import { Card, Text } from '@/components/ui';
import type { JoinKeep } from '@/lib/api';
import { formatAmount } from '@/lib/recipes';
import { colors, radii, spacing } from '@/theme';

/** "Капуста 300 г, яйцо 1 шт (сред.) · 620 ккал, 750 г" */
const recipeSummary = (v: JoinRecipeVersion) =>
  `${v.items.map((i) => `${i.name} ${formatAmount(i)}`).join(', ')} · ${formatKcal(v.kcal)}, ${formatGrams(v.grams)}`;

/** One side of a conflict, shown for the pick. */
type Version = { name: string; summary: string };

function Option({
  title,
  version,
  showName,
  selected,
  onPress,
}: {
  title: string;
  version: Version;
  showName: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}>
      <MaterialCommunityIcons
        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={22}
        color={selected ? colors.primary : colors.textDisabled}
      />
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {showName ? <Text variant="caption">{version.name}</Text> : null}
        <Text variant="caption">{version.summary}</Text>
      </View>
    </Pressable>
  );
}

type Item = { id: string; mine: Version; family: Version };

function ConflictList({
  title,
  items,
  keepFamily,
  onChange,
}: {
  title: string;
  items: Item[];
  keepFamily: string[];
  onChange: (keepFamily: string[]) => void;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <Text variant="h3">{title}</Text>
      {items.map((c) => {
        const family = keepFamily.includes(c.id);
        const showName = c.mine.name !== c.family.name;
        return (
          <Card key={c.id} style={styles.card}>
            <Text variant="bodyStrong">{c.mine.name}</Text>
            <Option
              title="Моя"
              version={c.mine}
              showName={showName}
              selected={!family}
              onPress={() => onChange(keepFamily.filter((id) => id !== c.id))}
            />
            <Option
              title="Семьи"
              version={c.family}
              showName={showName}
              selected={family}
              onPress={() => onChange(family ? keepFamily : [...keepFamily, c.id])}
            />
          </Card>
        );
      })}
    </>
  );
}

/**
 * Products and recipes edited both by the joiner and the family: pick whose version stays
 * (the joiner's by default).
 */
export function JoinConflicts({
  products,
  recipes,
  keep,
  onChange,
}: {
  products: JoinConflict[];
  recipes: JoinRecipeConflict[];
  keep: JoinKeep;
  onChange: (keep: JoinKeep) => void;
}) {
  const productItems = products.map((c) => ({
    id: c.id,
    mine: { name: c.mine.name, summary: productSummary(c.mine) },
    family: { name: c.family.name, summary: productSummary(c.family) },
  }));
  const recipeItems = recipes.map((c) => ({
    id: c.id,
    mine: { name: c.mine.name, summary: recipeSummary(c.mine) },
    family: { name: c.family.name, summary: recipeSummary(c.family) },
  }));
  return (
    <>
      <Text variant="h2">Чью версию оставить?</Text>
      <ConflictList
        title="Продукты"
        items={productItems}
        keepFamily={keep.products}
        onChange={(ids) => onChange({ ...keep, products: ids })}
      />
      <ConflictList
        title="Рецепты"
        items={recipeItems}
        keepFamily={keep.recipes}
        onChange={(ids) => onChange({ ...keep, recipes: ids })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
});
