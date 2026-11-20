import { formatDayMonth, formatWeekday, fromISODate, todayISO, type MealDishDto } from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DateStrip } from '@/components/day/DateStrip';
import { DayCalendar } from '@/components/day/DayCalendar';
import { MealCard } from '@/components/day/MealCard';
import { DayTotals } from '@/components/day/DayTotals';
import { IconButton, Screen, StateMessage } from '@/components/ui';
import { api } from '@/lib/api';
import { dayEaten, daySlots, useWeekMeals, type MealSlot } from '@/lib/day';
import { queryKeys, refreshAll } from '@/lib/query';
import { colors, spacing } from '@/theme';

export default function DayScreen() {
  const today = todayISO();
  // History opens a day here (`at` makes a repeated pick of the same day count).
  const params = useLocalSearchParams<{ date?: string; at?: string }>();
  const pick = params.date ? `${params.date}|${params.at ?? ''}` : '';
  const [date, setDate] = useState(params.date ?? today);
  const [seenPick, setSeenPick] = useState(pick);
  if (pick !== seenPick) {
    setSeenPick(pick);
    if (params.date) setDate(params.date);
  }
  const [calendar, setCalendar] = useState(false);
  const meals = useWeekMeals(date);
  const members = useQuery({ queryKey: queryKeys.familyMembers, queryFn: api.familyMembers });

  const list = meals.data;
  const slots = useMemo(() => daySlots(list ?? [], date), [list, date]);
  const eaten = useMemo(() => dayEaten(list ?? [], date), [list, date]);
  const planned = useMemo(() => new Set((list ?? []).map((m) => m.date)), [list]);
  const membersById = useMemo(() => new Map((members.data ?? []).map((m) => [m.id, m])), [members.data]);

  const onAddDish = (slot: MealSlot) =>
    router.push({ pathname: '/day/add', params: { date, type: slot.type, meal: slot.meal?.id ?? '' } });
  const onDishPress = (dish: MealDishDto) => router.push({ pathname: '/day/dish', params: { date, id: dish.id } });

  const weekday = formatWeekday(fromISODate(date));
  const subtitle = date === today ? `${weekday} · сегодня` : weekday;
  const actions = (
    <View style={styles.actions}>
      {date === today ? null : <IconButton icon="calendar-today" label="Сегодня" onPress={() => setDate(today)} />}
      <IconButton icon="chart-box-outline" label="История питания" onPress={() => router.push('/history')} />
    </View>
  );

  let body;
  if ((meals.isPending && !list) || members.isPending) {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (meals.isError || members.isError) {
    body = (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          if (meals.isError) meals.refetch();
          if (members.isError) members.refetch();
        }}
      />
    );
  } else {
    body = (
      <>
        <DayTotals members={members.data} eaten={eaten} date={date} />
        {slots.map((slot) => (
          <MealCard key={slot.key} slot={slot} members={membersById} onAddDish={onAddDish} onDishPress={onDishPress} />
        ))}
      </>
    );
  }

  return (
    <Screen
      onRefresh={refreshAll}
      title={formatDayMonth(fromISODate(date))}
      titleLabel="Выбрать дату"
      onTitlePress={() => setCalendar(true)}
      subtitle={subtitle}
      actions={actions}>
      <DateStrip date={date} today={today} planned={planned} onChange={setDate} />
      {body}
      <DayCalendar visible={calendar} date={date} today={today} onChange={setDate} onClose={() => setCalendar(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 48, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
