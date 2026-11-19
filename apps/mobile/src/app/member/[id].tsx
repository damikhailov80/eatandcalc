import type { FamilyMemberDto, FamilyMemberInput } from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { MemberForm } from '@/components/family/MemberForm';
import { Button, Screen, StateMessage, StickyFooter } from '@/components/ui';
import { api } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';
import { colors, memberColors } from '@/theme';

const NEW = 'new';

function blankMember(taken: readonly string[]): FamilyMemberInput {
  return {
    name: '',
    sex: 'female',
    color: memberColors.find((c) => !taken.includes(c)) ?? memberColors[0],
    norms: { kcal: 2000, protein: 100, fat: 70, carbs: 250 },
  };
}

const toInput = (m: FamilyMemberDto): FamilyMemberInput => ({
  name: m.name,
  sex: m.sex,
  color: (memberColors as readonly string[]).includes(m.color)
    ? (m.color as FamilyMemberInput['color'])
    : memberColors[0],
  norms: m.norms,
});

function Editor({ id, initial }: { id: string | null; initial: FamilyMemberInput }) {
  const [value, setValue] = useState(initial);
  const done = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers });
    router.back();
  };
  const onError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));

  const save = useMutation({
    mutationFn: (input: FamilyMemberInput) =>
      id ? api.updateFamilyMember(id, input) : api.createFamilyMember(input),
    onSuccess: done,
    onError,
  });
  const remove = useMutation({ mutationFn: () => api.deleteFamilyMember(id!), onSuccess: done, onError });

  const confirmDelete = () =>
    Alert.alert(`Удалить ${value.name || 'профиль'} из семьи?`, 'История питания сохранится.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const canSave = value.name.trim().length > 0 && !save.isPending && !remove.isPending;

  return (
    <Screen
      title={id ? 'Профиль' : 'Новый член семьи'}
      onBack={() => router.back()}
      footer={
        <StickyFooter>
          <Button title="Сохранить" large disabled={!canSave} onPress={() => save.mutate(value)} />
        </StickyFooter>
      }>
      <MemberForm value={value} onChange={setValue} />
      {id ? (
        <View style={styles.center}>
          <Button title="Удалить из семьи" variant="danger" disabled={remove.isPending} onPress={confirmDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

export default function MemberEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === NEW;

  const member = useQuery({
    queryKey: [...queryKeys.familyMembers, id],
    queryFn: () => api.familyMember(id),
    enabled: !isNew,
    initialData: () =>
      queryClient.getQueryData<FamilyMemberDto[]>(queryKeys.familyMembers)?.find((m) => m.id === id),
  });

  if (isNew) {
    const taken = queryClient.getQueryData<FamilyMemberDto[]>(queryKeys.familyMembers)?.map((m) => m.color) ?? [];
    return <Editor id={null} initial={blankMember(taken)} />;
  }
  if (member.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (member.isError) {
    return (
      <StateMessage
        icon="account-question-outline"
        title="Профиль не найден"
        text={familyErrorMessage(member.error)}
        actionTitle="Назад"
        onAction={() => router.back()}
      />
    );
  }
  return <Editor id={id} initial={toInput(member.data)} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  center: { alignItems: 'center' },
});
