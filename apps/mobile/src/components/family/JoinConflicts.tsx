import type { JoinConflict, ProductData } from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { productSummary } from '@/components/products/ProductForm';
import { Card, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

function Option({
  title,
  data,
  showName,
  selected,
  onPress,
}: {
  title: string;
  data: ProductData;
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
        {showName ? <Text variant="caption">{data.name}</Text> : null}
        <Text variant="caption">{productSummary(data)}</Text>
      </View>
    </Pressable>
  );
}

/** Products edited both by the joiner and the family: pick whose version stays (the joiner's by default). */
export function JoinConflicts({
  conflicts,
  keepFamily,
  onChange,
}: {
  conflicts: JoinConflict[];
  keepFamily: string[];
  onChange: (keepFamily: string[]) => void;
}) {
  return (
    <>
      <Text variant="h3">Чью версию оставить?</Text>
      {conflicts.map((c) => {
        const family = keepFamily.includes(c.id);
        const showName = c.mine.name !== c.family.name;
        return (
          <Card key={c.id} style={styles.card}>
            <Text variant="bodyStrong">{c.mine.name}</Text>
            <Option
              title="Моя"
              data={c.mine}
              showName={showName}
              selected={!family}
              onPress={() => onChange(keepFamily.filter((id) => id !== c.id))}
            />
            <Option
              title="Семьи"
              data={c.family}
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
