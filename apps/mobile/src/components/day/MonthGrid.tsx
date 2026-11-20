import { formatMonthYear, fromISODate, WEEKDAYS_SHORT } from '@eatandcalc/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { monthGridDays, monthOf } from '@/lib/day';
import { colors, fonts, radii, spacing } from '@/theme';

/** A dot under a day: filled, or a ring (e.g. "недобор"). */
export type DayMark = { color: string; ring?: boolean };

export type MonthGridProps = {
  /** First day of the shown month. */
  month: string;
  onMonthChange: (month: string) => void;
  today: string;
  /** Filled day; without it today gets a ring. */
  selected?: string;
  mark?: (day: string, selected: boolean) => DayMark | null;
  onPick: (day: string) => void;
};

/** Month header (‹ Ноябрь 2026 ›), weekday row and 6 Mon-first weeks; days of other months are dimmed. */
export function MonthGrid({ month, onMonthChange, today, selected, mark, onPick }: MonthGridProps) {
  const days = monthGridDays(month);
  const monthNum = fromISODate(month).getMonth();
  return (
    <View style={styles.grid}>
      <View style={styles.head}>
        <IconButton
          icon="chevron-left"
          label="Предыдущий месяц"
          variant="plain"
          onPress={() => onMonthChange(monthOf(month, -1))}
        />
        <Text variant="h3" style={styles.month}>{formatMonthYear(fromISODate(month))}</Text>
        <IconButton
          icon="chevron-right"
          label="Следующий месяц"
          variant="plain"
          onPress={() => onMonthChange(monthOf(month, 1))}
        />
      </View>
      <View style={styles.row}>
        {WEEKDAYS_SHORT.map((wd) => (
          <Text key={wd} style={styles.wd} color={colors.textMuted}>{wd}</Text>
        ))}
      </View>
      {[0, 1, 2, 3, 4, 5].map((w) => (
        <View key={w} style={styles.row}>
          {days.slice(w * 7, w * 7 + 7).map((day) => {
            const isSelected = day === selected;
            const isToday = day === today;
            const outside = fromISODate(day).getMonth() !== monthNum;
            const color = isSelected
              ? colors.onPrimary
              : isToday
                ? colors.primary
                : outside
                  ? colors.textDisabled
                  : colors.text;
            const m = mark?.(day, isSelected) ?? null;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onPick(day)}
                style={[
                  styles.day,
                  isSelected && styles.selected,
                  isToday && selected === undefined && styles.todayRing,
                ]}>
                <Text style={[styles.num, isToday && styles.today]} color={color}>
                  {fromISODate(day).getDate()}
                </Text>
                <View
                  style={[
                    styles.dot,
                    m && (m.ring ? { borderWidth: 1.5, borderColor: m.color } : { backgroundColor: m.color }),
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  month: { flex: 1, textAlign: 'center' },
  row: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', fontSize: 12, fontFamily: fonts.bodyMedium, paddingVertical: 4 },
  day: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radii.md },
  selected: { backgroundColor: colors.primary },
  todayRing: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  num: { fontSize: 16, fontFamily: fonts.bodySemibold, fontVariant: ['tabular-nums'] },
  today: { fontFamily: fonts.bodyBold },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
