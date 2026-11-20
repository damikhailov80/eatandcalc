import {
  formatDayTitle,
  memberNormOn,
  shiftISODate,
  todayISO,
  type FamilyMemberDto,
  type Nutrients,
} from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { DayCalendar } from '@/components/day/DayCalendar';
import { familyErrorMessage } from '@/components/family/errors';
import { NormsForm } from '@/components/family/MemberForm';
import { LoadError } from '@/components/LoadError';
import { Button, IconButton, Screen, StickyFooter, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';
import { colors } from '@/theme';

type Params = { member: string; date?: string };

const onError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));

function done() {
  queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers });
  router.back();
}

/** One dated norm record: its date (one per day) and values; a new one starts today with today's norm. */
function NormEditor({ member, from }: { member: FamilyMemberDto; from: string | null }) {
  const today = todayISO();
  const existing = from ? member.normHistory.find((r) => r.date === from) : undefined;
  const [date, setDate] = useState(from ?? today);
  const [norms, setNorms] = useState<Nutrients>(() => existing?.norms ?? memberNormOn(member, today));
  const [calendar, setCalendar] = useState(false);
  const dates = useMemo(() => new Set(member.normHistory.map((r) => r.date)), [member.normHistory]);

  const save = useMutation({
    mutationFn: () => api.putMemberNorm(member.id, { date, norms, ...(from ? { from } : {}) }),
    onSuccess: done,
    onError,
  });
  const remove = useMutation({ mutationFn: () => api.deleteMemberNorm(member.id, from!), onSuccess: done, onError });
  const busy = save.isPending || remove.isPending;

  const onSave = () => {
    if (date !== from && dates.has(date)) {
      Alert.alert('На эту дату уже есть норма', 'Заменить её?', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Заменить', style: 'destructive', onPress: () => save.mutate() },
      ]);
      return;
    }
    save.mutate();
  };

  const confirmDelete = () =>
    Alert.alert('Удалить норму?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const canDelete = !!existing && member.normHistory.length > 1;

  return (
    <Screen
      title={existing ? 'Норма' : 'Новая норма'}
      onBack={() => router.back()}
      actions={
        canDelete ? (
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
          <Button title="Сохранить" large disabled={busy} onPress={onSave} />
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
          <Text variant="bodyStrong" style={styles.dateText}>{`с ${formatDayTitle(date, today)}`}</Text>
        </Pressable>
        <IconButton
          icon="chevron-right"
          variant="plain"
          label="День позже"
          onPress={() => setDate(shiftISODate(date, 1))}
        />
      </View>
      <NormsForm value={norms} onChange={setNorms} />
      <DayCalendar
        visible={calendar}
        date={date}
        today={today}
        marked={dates}
        onChange={setDate}
        onClose={() => setCalendar(false)}
      />
    </Screen>
  );
}

export default function MemberNormScreen() {
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
  return <NormEditor member={member.data} from={date || null} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { flex: 1, minHeight: 44, justifyContent: 'center' },
  dateText: { textAlign: 'center' },
});
