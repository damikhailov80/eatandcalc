import { todayISO } from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AccountsCard } from '@/components/family/AccountsCard';
import { MemberCard } from '@/components/family/MemberCard';
import { Button, Screen, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { useFamilyMembers } from '@/lib/family';
import { signOut } from '@/lib/auth';
import { dayEaten, eatenOf, useWeekMeals } from '@/lib/day';
import { queryClient, queryKeys, refreshAll } from '@/lib/query';
import { colors, fonts, radii, spacing } from '@/theme';

export default function FamilyScreen() {
  const me = useQuery({ queryKey: queryKeys.me, queryFn: api.me });
  const today = todayISO();
  const members = useFamilyMembers(today);
  const meals = useWeekMeals(today);
  const eaten = useMemo(() => dayEaten(meals.data ?? [], today), [meals.data, today]);

  if (me.isPending || members.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (me.isError || members.isError) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          me.refetch();
          members.refetch();
        }}
      />
    );
  }

  const onSignOut = async () => {
    await signOut();
    queryClient.clear();
  };

  const subtitle = members.data.length ? undefined : 'Добавьте, чьё питание считаем';

  return (
    <Screen title="Семья" subtitle={subtitle} subtitleBelow onRefresh={refreshAll}>
      {members.data.map((m) => (
        <MemberCard
          key={m.id}
          member={m}
          eaten={eatenOf(eaten, m.id)}
          onEdit={() => router.push({ pathname: '/member/[id]', params: { id: m.id } })}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/member/[id]', params: { id: 'new' } })}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
        <Text style={styles.addText}>Добавить члена семьи</Text>
      </Pressable>

      <AccountsCard me={me.data} />
      <Button title="Выйти из аккаунта" variant="danger" onPress={onSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  add: {
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.dashed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  addText: { fontSize: 14, fontFamily: fonts.bodySemibold },
});
