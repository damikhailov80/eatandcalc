import {
  formatDayTitle,
  formatNumberInput,
  lastWeightOn,
  parseNumberInput,
  shiftISODate,
  todayISO,
  weightOn,
  type FamilyMemberDto,
} from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { DayCalendar } from '@/components/day/DayCalendar';
import { familyErrorMessage } from '@/components/family/errors';
import { LoadError } from '@/components/LoadError';
import { Button, Card, IconButton, MemberAvatar, NumberField, Screen, StickyFooter, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';
import { colors, fonts, spacing } from '@/theme';

type Params = { member: string; date?: string };

const MIN_KG = 1;
const MAX_KG = 400;

const onError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));

function done() {
  queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers });
  router.back();
}

/** The member's weight on a day (one per day): opened for the day tab's date, prefilled with the last known weight. */
function WeightEditor({ member, initialDate }: { member: FamilyMemberDto; initialDate: string }) {
  const today = todayISO();
  const from = weightOn(member.weights, initialDate) != null ? initialDate : null;
  const [date, setDate] = useState(initialDate);
  const [text, setText] = useState(() => {
    const kg = lastWeightOn(member.weights, initialDate) ?? member.weights.at(-1)?.kg;
    return kg != null ? formatNumberInput(kg, 1) : '';
  });
  const [calendar, setCalendar] = useState(false);
  const dates = useMemo(() => new Set(member.weights.map((r) => r.date)), [member.weights]);

  const kg = parseNumberInput(text);
  const valid = kg != null && kg >= MIN_KG && kg <= MAX_KG;

  const save = useMutation({
    mutationFn: () => api.putMemberWeight(member.id, { date, kg: Math.round(kg! * 10) / 10, ...(from ? { from } : {}) }),
    onSuccess: done,
    onError,
  });
  const remove = useMutation({ mutationFn: () => api.deleteMemberWeight(member.id, from!), onSuccess: done, onError });
  const busy = save.isPending || remove.isPending;

  const onSave = () => {
    if (date !== from && dates.has(date)) {
      Alert.alert('На эту дату уже есть вес', 'Заменить его?', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Заменить', style: 'destructive', onPress: () => save.mutate() },
      ]);
      return;
    }
    save.mutate();
  };

  const confirmDelete = () =>
    Alert.alert('Удалить вес?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  return (
    <Screen
      title={from ? 'Вес' : 'Новый вес'}
      onBack={() => router.back()}
      actions={
        from ? (
          <IconButton
            icon="trash-can-outline"
            variant="plain"
            color={colors.textMuted}
            label="Удалить"
            disabled={busy}
            onPress={confirmDelete}
          />
        ) : undefined
      }
      footer={
        <StickyFooter>
          <Button title="Сохранить" large disabled={busy || !valid} onPress={onSave} />
        </StickyFooter>
      }>
      <View style={styles.dateRow}>
        <IconButton
          icon="chevron-left"
          variant="plain"
          label="День раньше"
          onPress={() => setDate(shiftISODate(date, -1))}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Выбрать дату"
          onPress={() => setCalendar(true)}
          style={styles.date}>
          <Text variant="bodyStrong" style={styles.dateText}>{formatDayTitle(date, today)}</Text>
        </Pressable>
        <IconButton
          icon="chevron-right"
          variant="plain"
          label="День позже"
          disabled={date >= today}
          color={date >= today ? colors.textDisabled : colors.text}
          onPress={() => setDate(shiftISODate(date, 1))}
        />
      </View>
      <Card style={styles.card}>
        <MemberAvatar name={member.name} color={member.color} size={40} />
        <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
        <NumberField
          value={text}
          onChangeText={setText}
          label="Вес"
          unit="кг"
          autoFocus
          invalid={text !== '' && !valid}
          style={styles.field}
        />
      </Card>
      <DayCalendar
        visible={calendar}
        date={date}
        today={today}
        marked={dates}
        onChange={(d) => setDate(d > today ? today : d)}
        onClose={() => setCalendar(false)}
      />
    </Screen>
  );
}

export default function MemberWeightScreen() {
  const { member: id, date } = useLocalSearchParams<Params>();
  const member = useQuery({
    queryKey: [...queryKeys.familyMembers, id],
    queryFn: () => api.familyMember(id),
    initialData: () =>
      queryClient.getQueryData<FamilyMemberDto[]>(queryKeys.familyMembers)?.find((m) => m.id === id),
  });

  if (member.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (member.isError) {
    return (
      <LoadError
        error={member.error}
        onRetry={() => member.refetch()}
        notFound={{ icon: 'account-question-outline', title: 'Профиль не найден' }}
      />
    );
  }
  const today = todayISO();
  return <WeightEditor member={member.data} initialDate={date && date < today ? date : today} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { flex: 1, minHeight: 44, justifyContent: 'center' },
  dateText: { textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 16 },
  field: { width: 120 },
});
