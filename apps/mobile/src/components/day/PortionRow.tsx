import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dishConsumed, formatInt, formatOne, type FamilyMemberDto, type Nutrients } from '@eatandcalc/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { MemberAvatar, Stepper, Text } from '@/components/ui';
import { colors, fonts, spacing } from '@/theme';

export type PortionRowProps = {
  member: FamilyMemberDto;
  on: boolean;
  grams: number;
  /** KBJU per 100 g of the dish. */
  per100: Nutrients;
  /** What the member ate that day without this dish. */
  eatenElsewhere: Nutrients;
  onToggle: () => void;
  onGrams: (grams: number) => void;
};

/** One member in a dish split: on/off, grams, what it gives and how much of the day's norm is left. */
export function PortionRow({ member, on, grams, per100, eatenElsewhere, onToggle, onGrams }: PortionRowProps) {
  const got = dishConsumed(per100, on ? grams : 0);
  const left = member.norms.kcal - eatenElsewhere.kcal - got.kcal;
  return (
    <View style={[styles.root, !on && styles.off]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={member.name}
        onPress={onToggle}
        style={styles.who}>
        <View style={[styles.box, on && styles.boxOn]}>
          {on ? <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} /> : null}
        </View>
        <MemberAvatar name={member.name} color={member.color} size={36} />
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
          <Text style={styles.left} color={left < 0 ? colors.over : colors.textMuted}>
            {left < 0 ? `сверх нормы ${formatInt(-left)} ккал` : `до нормы ещё ${formatInt(left)} ккал`}
          </Text>
        </View>
      </Pressable>
      {on ? (
        <View style={styles.amount}>
          <Stepper value={grams} onChange={onGrams} step={10} max={5000} unit="г" label={`Граммы — ${member.name}`} inputWidth={48} />
          <Text style={styles.macros} color={colors.textSecondary}>
            {`${formatInt(got.kcal)} ккал · Б ${formatOne(got.protein)} · Ж ${formatOne(got.fat)} · У ${formatOne(got.carbs)}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  off: { opacity: 0.55 },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.dashed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { flex: 1, gap: 1 },
  name: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  left: { fontSize: 12, fontFamily: fonts.body },
  amount: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: 36 },
  macros: { flex: 1, fontSize: 12, fontFamily: fonts.body },
});
