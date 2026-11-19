import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  dishConsumed,
  formatDayMonthShort,
  formatGrams,
  formatInt,
  formatKcal,
  fromISODate,
  type FamilyMemberDto,
  type MealDishDto,
} from '@eatandcalc/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, MemberAvatar, Text } from '@/components/ui';
import type { MealSlot } from '@/lib/day';
import { colors, fonts, radii, spacing } from '@/theme';

export type MealCardProps = {
  slot: MealSlot;
  members: ReadonlyMap<string, FamilyMemberDto>;
  onAddDish: (slot: MealSlot) => void;
  onDishPress: (dish: MealDishDto) => void;
};

/** "Готовка 15 ноя · 102 ккал / 100 г" or "Продукт · 52 ккал / 100 г". */
export function dishMeta(dish: MealDishDto) {
  const per100 = `${formatInt(dish.nutrients.kcal)} ккал / 100 г`;
  if (dish.sourceDate) return `Готовка ${formatDayMonthShort(fromISODate(dish.sourceDate))} · ${per100}`;
  return `Продукт · ${per100}`;
}

type MemberLine = { dish: MealDishDto; grams: number; kcal: number };
type MemberGroup = { memberId: string; member: FamilyMemberDto | undefined; kcal: number; lines: MemberLine[] };

/** Who ate what in the meal: members in the family's order (unknown / archived ones last), each with their dishes. */
function byMember(dishes: readonly MealDishDto[], members: ReadonlyMap<string, FamilyMemberDto>): MemberGroup[] {
  const groups = new Map<string, MemberGroup>();
  for (const dish of dishes)
    for (const c of dish.consumptions) {
      const g = groups.get(c.memberId) ?? { memberId: c.memberId, member: members.get(c.memberId), kcal: 0, lines: [] };
      const kcal = dishConsumed(dish.nutrients, c.grams).kcal;
      g.lines.push({ dish, grams: c.grams, kcal });
      g.kcal += kcal;
      groups.set(c.memberId, g);
    }
  const order = [...members.keys()];
  const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
  return [...groups.values()].sort((a, b) => rank(a.memberId) - rank(b.memberId));
}

/** A meal of the day: per member their dishes (weight, kcal) and the member's kcal for the meal; "+ Блюдо". */
export function MealCard({ slot, members, onAddDish, onDishPress }: MealCardProps) {
  const groups = byMember(slot.meal?.dishes ?? [], members);
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text variant="h3" style={styles.title}>{slot.title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Добавить блюдо — ${slot.title}`}
          onPress={() => onAddDish(slot)}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}>
          <MaterialCommunityIcons name="plus" size={16} color={colors.primaryDark} />
          <Text style={styles.addText} color={colors.primaryDark}>Блюдо</Text>
        </Pressable>
      </View>
      {groups.map((g) => (
        <View key={g.memberId} style={styles.group}>
          <View style={styles.memberHead}>
            <MemberAvatar name={g.member?.name ?? '?'} color={g.member?.color ?? colors.under} size={24} />
            <Text style={styles.memberName} numberOfLines={1}>{g.member?.name ?? 'Удалён'}</Text>
            <Text style={styles.memberKcal}>{formatKcal(g.kcal)}</Text>
          </View>
          {g.lines.map((line) => (
            <Pressable
              key={line.dish.id}
              accessibilityRole="button"
              accessibilityHint={dishMeta(line.dish)}
              onPress={() => onDishPress(line.dish)}
              style={({ pressed }) => [styles.line, pressed && styles.linePressed]}>
              <Text style={styles.dishName} numberOfLines={1}>{line.dish.name}</Text>
              <Text style={styles.lineNumbers} color={colors.textSecondary}>
                {`${formatGrams(line.grams)} · ${formatKcal(line.kcal)}`}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  addPressed: { opacity: 0.6 },
  addText: { fontFamily: fonts.bodySemibold, fontSize: 13 },
  group: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  memberName: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 15 },
  memberKcal: { fontFamily: fonts.bodyBold, fontSize: 14 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingLeft: 32,
    borderRadius: radii.md,
  },
  linePressed: { backgroundColor: colors.bg },
  dishName: { flex: 1, fontSize: 14, fontFamily: fonts.body },
  lineNumbers: { fontSize: 13, fontFamily: fonts.bodyMedium },
});
