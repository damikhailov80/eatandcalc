import type { FamilyMemberDto, Nutrients } from '@eatandcalc/shared';
import { formatInt } from '@eatandcalc/shared';
import { StyleSheet, View } from 'react-native';

import { Card, IconButton, MemberAvatar, ProgressBar, Text } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/theme';

const SEX_LABEL = { male: 'Мужской', female: 'Женский' } as const;

const MACROS = [
  { key: 'protein', name: 'Белки' },
  { key: 'fat', name: 'Жиры' },
  { key: 'carbs', name: 'Углеводы' },
] as const;

export type MemberCardProps = {
  member: FamilyMemberDto;
  /** Eaten today; zero until the daily planner exists (Stage 6). */
  eaten: Nutrients;
  onEdit: () => void;
};

/** Family tab card: avatar, sex and kcal norm, today's progress, macro chips. */
export function MemberCard({ member, eaten, onEdit }: MemberCardProps) {
  const { norms } = member;
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <MemberAvatar name={member.name} color={member.color} />
        <View style={styles.headText}>
          <Text style={styles.name}>{member.name}</Text>
          <Text variant="caption">
            {SEX_LABEL[member.sex]} · норма {formatInt(norms.kcal)} ккал
          </Text>
        </View>
        <IconButton icon="pencil-outline" label={`Изменить профиль — ${member.name}`} onPress={onEdit} />
      </View>

      <View style={styles.today}>
        <View style={styles.todayRow}>
          <Text style={styles.todayLabel} color={colors.textSecondary}>Сегодня</Text>
          <Text style={styles.todayValue}>{formatInt(eaten.kcal)}</Text>
          <Text style={styles.todayLabelText} color={colors.textMuted}>/ {formatInt(norms.kcal)} ккал</Text>
        </View>
        <ProgressBar value={norms.kcal > 0 ? eaten.kcal / norms.kcal : 0} />
        <View style={styles.macros}>
          {MACROS.map(({ key, name }) => {
            const over = eaten[key] > norms[key];
            return (
              <View key={key} style={[styles.macro, over && styles.macroOver]}>
                <Text style={styles.macroName} color={colors.textSecondary}>{name}</Text>
                <Text style={styles.macroValue} color={over ? colors.over : colors.text}>
                  {formatInt(eaten[key])} / {formatInt(norms[key])} г
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontFamily: fonts.bodyBold },
  today: { gap: spacing.sm },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  todayLabel: { flex: 1, fontSize: 13 },
  todayValue: { fontSize: 13, fontFamily: fonts.bodyBold },
  todayLabelText: { fontSize: 13 },
  macros: { flexDirection: 'row', gap: 6 },
  macro: { flex: 1, backgroundColor: colors.bg, borderRadius: radii.sm, paddingVertical: 6, paddingHorizontal: spacing.sm },
  macroOver: { backgroundColor: colors.overSoft },
  macroName: { fontSize: 11 },
  macroValue: { fontSize: 13, fontFamily: fonts.bodyBold },
});
