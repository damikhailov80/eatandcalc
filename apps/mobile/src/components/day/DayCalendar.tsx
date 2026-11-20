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
  /** Days to mark instead of days with meals (e.g. norm dates). */
  marked?: ReadonlySet<string>;
};

/** Month calendar (Mon-first, 6 weeks) to jump to any date; dots on days with meals (or on `marked`). */
export function DayCalendar({ visible, date, today, onChange, onClose, marked }: DayCalendarProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Закрыть">
        {visible ? (
          marked ? (
            <CalendarCard date={date} today={today} onChange={onChange} onClose={onClose} marked={marked} />
          ) : (
            <MealsCalendarCard date={date} today={today} onChange={onChange} onClose={onClose} />
          )
        ) : null}
      </Pressable>
    </Modal>
  );
}

type CardProps = Omit<DayCalendarProps, 'visible' | 'marked'>;

function MealsCalendarCard(props: CardProps) {
  const [month, setMonth] = useState(() => monthOf(props.date));
  const meals = useMonthGridMeals(month);
  const planned = new Set((meals.data ?? []).filter((m) => m.dishes.length).map((m) => m.date));
  return <CalendarCard {...props} month={month} onMonthChange={setMonth} marked={planned} />;
}

function CalendarCard({
  date,
  today,
  onChange,
  onClose,
  marked: planned,
  ...rest
}: CardProps & { marked: ReadonlySet<string>; month?: string; onMonthChange?: (month: string) => void }) {
  const [ownMonth, setOwnMonth] = useState(() => monthOf(date));
  const month = rest.month ?? ownMonth;
  const setMonth = rest.onMonthChange ?? setOwnMonth;

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
