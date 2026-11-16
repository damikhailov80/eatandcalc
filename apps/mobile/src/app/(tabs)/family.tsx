import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Placeholder, Screen, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { queryClient, queryKeys } from '@/lib/query';
import { colors, memberColors, radii, spacing } from '@/theme';

export default function FamilyScreen() {
  const me = useQuery({ queryKey: queryKeys.me, queryFn: api.me });

  if (me.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (me.isError) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => me.refetch()}
      />
    );
  }

  const onSignOut = async () => {
    await signOut();
    queryClient.clear();
  };

  return (
    <Screen title="Семья" subtitle={me.data.household.name}>
      <Card style={styles.accounts}>
        <Text variant="h3">Аккаунты</Text>
        {me.data.members.map((m, i) => (
          <View key={m.id} style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: memberColors[i % memberColors.length] }]}>
              <Text variant="bodyStrong" color={colors.onPrimary}>
                {m.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowText}>
              <Text variant="bodyStrong">
                {m.name}
                {m.id === me.data.user.id ? ' (вы)' : ''}
              </Text>
              <Text variant="caption">{m.email}</Text>
            </View>
          </View>
        ))}
      </Card>
      <Placeholder text="Члены семьи и их дневные нормы калорий, белков, жиров и углеводов." />
      <Button title="Выйти" variant="danger" onPress={onSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  accounts: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
});
