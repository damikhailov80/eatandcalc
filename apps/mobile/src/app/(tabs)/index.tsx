import { formatDayMonth, formatWeekday, fromISODate, todayISO, type MealDishDto } from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DateStrip } from '@/components/day/DateStrip';
import { MealCard } from '@/components/day/MealCard';
import { MemberRings } from '@/components/day/MemberRings';
import { IconButton, Screen, StateMessage } from '@/components/ui';
import { api } from '@/lib/api';
import { dayEaten, daySlots, useWeekMeals, type MealSlot } from '@/lib/day';
import { queryKeys, refreshAll } from '@/lib/query';
import { colors } from '@/theme';

export default function DayScreen() {
  const today = todayISO();
  const [date, setDate] = useState(today);
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
  const actions =
    date === today ? null : (
      <IconButton icon="calendar-today" label="Сегодня" onPress={() => setDate(today)} />
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
        <MemberRings members={members.data} eaten={eaten} />
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
      subtitle={subtitle}
      actions={actions}>
      <DateStrip date={date} today={today} planned={planned} onChange={setDate} />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 48, alignItems: 'center' },
});
