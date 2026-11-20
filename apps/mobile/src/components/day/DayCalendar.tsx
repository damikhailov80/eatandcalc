import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/ui';
import { monthOf, useMonthGridMeals } from '@/lib/day';
import { colors, radii, spacing } from '@/theme';
import { MonthGrid } from './MonthGrid';

export type DayCalendarProps = {
  visible: boolean;
  date: string;
  today: string;
  onChange: (date: string) => void;
  onClose: () => void;
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
  const meals = useMonthGridMeals(month);
  const planned = new Set((meals.data ?? []).filter((m) => m.dishes.length).map((m) => m.date));

  const pick = (day: string) => {
    onChange(day);
    onClose();
  };

  return (
    // Swallows taps so they don't reach the scrim.
    <Pressable style={styles.card} onPress={() => undefined}>
      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        today={today}
        selected={date}
        mark={(day, selected) =>
          planned.has(day) ? { color: selected ? colors.onPrimary : colors.primaryMuted } : null
        }
        onPick={pick}
      />
      {date !== today ? (
        <Button title="Сегодня" variant="soft" onPress={() => pick(today)} style={styles.todayButton} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md },
  todayButton: { marginTop: spacing.sm },
});
