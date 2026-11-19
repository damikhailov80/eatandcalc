import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { Share, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { API_URL, GOOGLE_WEB_CLIENT_ID } from '@/lib/config';
import { clearDiagnostics, formatDiagTime, useDiagnostics } from '@/lib/diagnostics';
import { colors, spacing } from '@/theme';

const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

function buildInfo() {
  return [
    `Приложение: ${Constants.expoConfig?.name ?? '?'} ${Constants.expoConfig?.version ?? '?'}`,
    `Сборка: ${__DEV__ ? 'dev' : 'release'}, runtime ${Updates.runtimeVersion ?? '-'}, канал ${Updates.channel ?? '-'}`,
    `Обновление: ${Updates.isEmbeddedLaunch ? 'встроенное' : (Updates.updateId ?? '-')}${
      Updates.createdAt ? ` от ${formatDiagTime(Updates.createdAt.getTime())}` : ''
    }`,
    `API: ${API_URL}`,
    `Google webClientId: ${GOOGLE_WEB_CLIENT_ID ? `…${GOOGLE_WEB_CLIENT_ID.slice(-30)}` : 'ПУСТОЙ'}`,
  ];
}

/** Sign-in and API failure log (reachable signed out): what happened on this phone, with a share button. */
export default function DiagnosticsScreen() {
  const { entries, signOut } = useDiagnostics();
  const { data: session } = authClient.useSession();
  const info = [...buildInfo(), `Сессия: ${session ? session.user.email : 'нет'}`];
  const lines = [...entries].reverse().map((e) => `${formatDiagTime(e.t)} [${e.tag}] ${e.msg}`);

  const onShare = () =>
    Share.share({ message: ['Eat And Calc — журнал входа', ...info, '', ...lines].join('\n') });

  return (
    <Screen title="Журнал входа" onBack={back}>
      <Card style={styles.card}>
        {info.map((l) => (
          <Text key={l} variant="caption" color={colors.textSecondary} selectable>{l}</Text>
        ))}
      </Card>

      {signOut ? (
        <Card style={[styles.card, styles.warn]}>
          <Text variant="bodyStrong" color={colors.over}>Последний автоматический выход</Text>
          <Text variant="caption" color={colors.over} selectable>
            {formatDiagTime(signOut.t)} · {signOut.reason}
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button title="Поделиться" variant="soft" style={styles.flex} onPress={onShare} />
        <Button title="Очистить" variant="ghost" style={styles.flex} onPress={clearDiagnostics} />
      </View>

      <Card style={styles.card}>
        {lines.length === 0 ? (
          <Text variant="caption">Записей пока нет. Попробуйте войти и вернитесь сюда.</Text>
        ) : (
          lines.map((l, i) => (
            <Text key={i} variant="caption" color={colors.text} selectable>{l}</Text>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  warn: { backgroundColor: colors.overSoft },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
