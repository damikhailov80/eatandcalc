import { formatMonthYear, fromISODate, shiftISODate, toISODate, WEEKDAYS_SHORT } from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { weekStart } from '@/lib/day';
import { queryKeys } from '@/lib/query';
import { colors, fonts, radii, spacing } from '@/theme';

export type DayCalendarProps = {
  visible: boolean;
  date: string;
  today: string;
  onChange: (date: string) => void;
  onClose: () => void;
};

/** First day of the month `iso` falls in, shifted by `months`. */
const monthOf = (iso: string, months = 0) => {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + months, 1));
};

/** Month calendar (Mon-first, 6 weeks) to jump to any date; dots on days with meals. */
export function DayCalendar({ visible, date, today, onChange, onClose }: DayCalendarProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Закрыть">
        {visible ? <CalendarCard date={date} today={today} onChange={onChange} onClose={onClose} /> : null}
      </Pressable>
    </Modal>
  );
}

function CalendarCard({ date, today, onChange, onClose }: Omit<DayCalendarProps, 'visible'>) {
  const [month, setMonth] = useState(() => monthOf(date));
  const first = weekStart(month);
  const days = Array.from({ length: 42 }, (_, i) => shiftISODate(first, i));
  const meals = useQuery({
    queryKey: queryKeys.mealsGrid(first),
    queryFn: () => api.meals(first, days[days.length - 1]!),
  });
  const planned = new Set((meals.data ?? []).filter((m) => m.dishes.length).map((m) => m.date));
  const monthNum = fromISODate(month).getMonth();

  const pick = (day: string) => {
    onChange(day);
    onClose();
  };

  return (
    // Swallows taps so they don't reach the scrim.
    <Pressable style={styles.card} onPress={() => undefined}>
      <View style={styles.head}>
        <IconButton
          icon="chevron-left"
          label="Предыдущий месяц"
          variant="plain"
          onPress={() => setMonth(monthOf(month, -1))}
        />
        <Text variant="h3" style={styles.month}>{formatMonthYear(fromISODate(month))}</Text>
        <IconButton
          icon="chevron-right"
          label="Следующий месяц"
          variant="plain"
          onPress={() => setMonth(monthOf(month, 1))}
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
            const selected = day === date;
            const outside = fromISODate(day).getMonth() !== monthNum;
            const color = selected
              ? colors.onPrimary
              : day === today
                ? colors.primary
                : outside
                  ? colors.textDisabled
                  : colors.text;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => pick(day)}
                style={[styles.day, selected && styles.selected]}>
                <Text style={[styles.num, day === today && styles.today]} color={color}>
                  {fromISODate(day).getDate()}
                </Text>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: planned.has(day)
                        ? selected
                          ? colors.onPrimary
                          : colors.primaryMuted
                        : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
      {date !== today ? (
        <Button title="Сегодня" variant="soft" onPress={() => pick(today)} style={styles.todayButton} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  month: { flex: 1, textAlign: 'center' },
  row: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', fontSize: 12, fontFamily: fonts.bodyMedium, paddingVertical: 4 },
  day: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radii.md },
  selected: { backgroundColor: colors.primary },
  num: { fontSize: 16, fontFamily: fonts.bodySemibold, fontVariant: ['tabular-nums'] },
  today: { fontFamily: fonts.bodyBold },
  dot: { width: 5, height: 5, borderRadius: 3 },
  todayButton: { marginTop: spacing.sm },
});
