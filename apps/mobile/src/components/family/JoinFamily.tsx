import { formatInviteCode, INVITE_CODE_LENGTH, normalizeInviteCode, type MeResponse } from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient, signInWithGoogle } from '@/lib/auth';
import { queryClient, queryKeys, resetHouseholdData } from '@/lib/query';
import { colors, radii, spacing } from '@/theme';
import { familyErrorMessage } from './errors';

const goHome = () => router.replace('/family');
const back = () => (router.canGoBack() ? router.back() : goHome());

/** Signed out: Google sign-in first, then the join step renders (this route sits outside the auth guard). */
function SignInStep() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle();
    if (!result.ok) setError(result.message);
    setBusy(false);
  };
  return (
    <Card style={styles.card}>
      <Text variant="bodyStrong">Сначала войдите через Google</Text>
      <Text variant="caption">Доступ только для аккаунтов, которым открыт вход в приложение.</Text>
      {error ? <Text variant="caption" color={colors.over}>{error}</Text> : null}
      {busy ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : (
        <Button title="Войти через Google" large onPress={onSignIn} />
      )}
    </Card>
  );
}

function JoinStep({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(formatInviteCode(normalizeInviteCode(initialCode)));
  const me = useQuery({ queryKey: queryKeys.me, queryFn: api.me });
  const join = useMutation({
    mutationFn: () => api.join(normalizeInviteCode(code)),
    onSuccess: (data: MeResponse) => {
      queryClient.setQueryData(queryKeys.me, data);
      resetHouseholdData();
      goHome();
    },
  });

  const valid = normalizeInviteCode(code).length === INVITE_CODE_LENGTH;
  const othersInFamily = (me.data?.accounts.length ?? 1) > 1;

  return (
    <>
      <Card style={styles.card}>
        <TextField
          label="Код приглашения"
          value={code}
          onChangeText={(t) => setCode(formatInviteCode(normalizeInviteCode(t).slice(0, INVITE_CODE_LENGTH)))}
          placeholder="ABCD-EFGH"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={INVITE_CODE_LENGTH + 1}
        />
        {me.data ? (
          <Text variant="caption">
            Вы войдёте как {me.data.user.email}.
          </Text>
        ) : null}
      </Card>

      <View style={[styles.warning, othersInFamily && styles.error]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={18}
          color={othersInFamily ? colors.over : colors.warn}
        />
        <Text variant="caption" style={styles.flex} color={othersInFamily ? colors.over : colors.warn}>
          {othersInFamily
            ? 'В вашей текущей семье есть другие аккаунты. Сначала выйдите из неё или удалите их.'
            : 'Профили и данные вашей текущей семьи будут удалены — вы будете видеть данные новой семьи.'}
        </Text>
      </View>

      {join.isError ? (
        <Text variant="bodyStrong" color={colors.over}>{familyErrorMessage(join.error)}</Text>
      ) : null}

      <Button
        title={join.isPending ? 'Присоединяемся…' : 'Присоединиться к семье'}
        large
        disabled={!valid || join.isPending || othersInFamily}
        onPress={() => join.mutate()}
      />
    </>
  );
}

/** Join a household by invite: from a deep link (`eatandcalc://join/<code>`) or a typed code. */
export function JoinFamily({ code = '' }: { code?: string }) {
  const { data: session, isPending } = authClient.useSession();
  return (
    <Screen title="Присоединиться к семье" onBack={back}>
      <Text variant="body" color={colors.textSecondary}>
        Вы будете вести питание вместе: общие продукты, рецепты, готовки и дневник.
      </Text>
      {isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : session ? (
        <JoinStep initialCode={code} />
      ) : (
        <SignInStep />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  spinner: { height: 52 },
  flex: { flex: 1 },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.warnSoft,
  },
  error: { backgroundColor: colors.overSoft },
});
