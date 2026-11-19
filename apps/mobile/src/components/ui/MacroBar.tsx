import { energyCheck, type Nutrients } from '@eatandcalc/shared';
import { StyleSheet, View } from 'react-native';

import { colors, macroColors, radii } from '@/theme';

/** Split bar of protein / fat / carbs by their share of energy (4/9/4 kcal per gram). */
export function MacroBar({ nutrients, height = 6 }: { nutrients: Nutrients; height?: number }) {
  const { fromMacros, shares } = energyCheck(nutrients);
  if (fromMacros <= 0) return <View style={[styles.track, { height }]} />;
  return (
    <View style={[styles.bar, { height }]}>
      <View style={{ flex: shares.protein, backgroundColor: macroColors.protein }} />
      <View style={{ flex: shares.fat, backgroundColor: macroColors.fat }} />
      <View style={{ flex: shares.carbs, backgroundColor: macroColors.carbs }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 2, borderRadius: radii.pill, overflow: 'hidden' },
  track: { borderRadius: radii.pill, backgroundColor: colors.track },
});
