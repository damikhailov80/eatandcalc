import { fromISODate, shiftISODate, WEEKDAYS_SHORT } from '@eatandcalc/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { weekDays, weekStart } from '@/lib/day';
import { colors, fonts, radii } from '@/theme';

export type DateStripProps = {
  date: string;
  today: string;
  /** Days of the shown week that have meals. */
  planned: ReadonlySet<string>;
  onChange: (date: string) => void;
};

/** Mon–Sun of the selected date's week with ‹ › to the previous / next week. */
export function DateStrip({ date, today, planned, onChange }: DateStripProps) {
  const days = weekDays(weekStart(date));
  return (
    <View style={styles.root}>
      <IconButton
        icon="chevron-left"
        label="Предыдущая неделя"
        variant="plain"
        onPress={() => onChange(shiftISODate(date, -7))}
        style={styles.arrow}
      />
      {days.map((day, i) => {
        const selected = day === date;
        const fg = selected ? colors.onPrimary : colors.text;
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(day)}
            style={[styles.day, selected && styles.selected]}>
            <Text style={styles.wd} color={selected ? colors.onPrimary : colors.textMuted}>
              {WEEKDAYS_SHORT[i]}
            </Text>
            <Text style={[styles.num, day === today && !selected && styles.today]} color={fg}>
              {fromISODate(day).getDate()}
            </Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: planned.has(day) ? (selected ? colors.onPrimary : colors.primaryMuted) : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
      <IconButton
        icon="chevron-right"
        label="Следующая неделя"
        variant="plain"
        onPress={() => onChange(shiftISODate(date, 7))}
        style={styles.arrow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 28 },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6, borderRadius: radii.md },
  selected: { backgroundColor: colors.primary },
  wd: { fontSize: 11, fontFamily: fonts.bodyMedium },
  num: { fontSize: 16, fontFamily: fonts.bodyBold },
  today: { color: colors.primary },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
