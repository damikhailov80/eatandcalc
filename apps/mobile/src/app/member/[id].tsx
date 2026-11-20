import { todayISO, type FamilyMemberDto, type FamilyMemberInput } from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { MemberIdentityForm, NormsForm } from '@/components/family/MemberForm';
import { NormHistoryCard } from '@/components/family/NormHistoryCard';
import { LoadError } from '@/components/LoadError';
import { Button, Screen, StickyFooter } from '@/components/ui';
import { api } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';
import { colors, memberColors } from '@/theme';

const NEW = 'new';

type Identity = Pick<FamilyMemberInput, 'name' | 'sex' | 'color'>;

function blankMember(taken: readonly string[]): FamilyMemberInput {
  return {
    name: '',
    sex: 'female',
    color: memberColors.find((c) => !taken.includes(c)) ?? memberColors[0],
    norms: { kcal: 2000, protein: 100, fat: 70, carbs: 250 },
  };
}

const toIdentity = (m: FamilyMemberDto): Identity => ({
  name: m.name,
  sex: m.sex,
  color: (memberColors as readonly string[]).includes(m.color)
    ? (m.color as FamilyMemberInput['color'])
    : memberColors[0],
});

const onError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));

function done() {
  queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers });
  router.back();
}

/** A new member: name, sex, color and the first norm (dated today). */
function NewMember({ initial }: { initial: FamilyMemberInput }) {
  const [value, setValue] = useState(initial);
  const save = useMutation({
    mutationFn: (input: FamilyMemberInput) => api.createFamilyMember({ ...input, normsDate: todayISO() }),
    onSuccess: done,
    onError,
  });
  const canSave = value.name.trim().length > 0 && !save.isPending;
  return (
    <Screen
      title="Новый член семьи"
      onBack={() => router.back()}
      footer={
        <StickyFooter>
          <Button title="Сохранить" large disabled={!canSave} onPress={() => save.mutate(value)} />
        </StickyFooter>
      }>
      <MemberIdentityForm value={value} onChange={setValue} />
      <NormsForm value={value.norms} onChange={(norms) => setValue({ ...value, norms })} />
    </Screen>
  );
}

/** An existing member: name, sex, color; norms are dated records edited one by one (`member/norm`). */
function Editor({ member }: { member: FamilyMemberDto }) {
  const [value, setValue] = useState(() => toIdentity(member));
  const today = todayISO();

  const save = useMutation({ mutationFn: (input: Identity) => api.updateFamilyMember(member.id, input), onSuccess: done, onError });
  const remove = useMutation({ mutationFn: () => api.deleteFamilyMember(member.id), onSuccess: done, onError });

  const confirmDelete = () =>
    Alert.alert(`Удалить ${value.name || 'профиль'} из семьи?`, 'История питания сохранится.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const openNorm = (date?: string) =>
    router.push({ pathname: '/member/norm', params: { member: member.id, ...(date ? { date } : {}) } });

  const canSave = value.name.trim().length > 0 && !save.isPending && !remove.isPending;

  return (
    <Screen
      title="Профиль"
      onBack={() => router.back()}
      footer={
        <StickyFooter>
          <Button title="Сохранить" large disabled={!canSave} onPress={() => save.mutate(value)} />
        </StickyFooter>
      }>
      <MemberIdentityForm value={value} onChange={setValue} />
      <NormHistoryCard history={member.normHistory} today={today} onOpen={openNorm} onAdd={() => openNorm()} />
      <View style={styles.center}>
        <Button title="Удалить из семьи" variant="danger" disabled={remove.isPending} onPress={confirmDelete} />
      </View>
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
    return <NewMember initial={blankMember(taken)} />;
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
      <LoadError
        error={member.error}
        onRetry={() => member.refetch()}
        notFound={{ icon: 'account-question-outline', title: 'Профиль не найден' }}
      />
    );
  }
  return <Editor member={member.data} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  center: { alignItems: 'center' },
});
