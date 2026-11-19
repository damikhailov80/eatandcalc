import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { API_URL, GOOGLE_WEB_CLIENT_ID } from '@/lib/config';
import {
  clearDiagnostics,
  formatDiagTime,
  markDiagnosticsSeen,
  useDiagnostics,
  type DiagEntry,
} from '@/lib/diagnostics';
import { colors, radii, spacing } from '@/theme';

const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

const ALL = 'все';
const PROBLEMS = 'ошибки';

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

const levelColor = (e: DiagEntry) =>
  e.level === 'error' ? colors.over : e.level === 'warn' ? colors.warn : colors.text;

const formatEntry = (e: DiagEntry) =>
  `${formatDiagTime(e.t)} [${e.tag}]${e.level && e.level !== 'info' ? ` ${e.level.toUpperCase()}` : ''} ${e.msg}`;

/** Debug log over the whole app (temporary tool, opened by the floating button): filter by tag, share as text. */
export default function DiagnosticsScreen() {
  const diagnostics = useDiagnostics();
  const { entries, signOut } = diagnostics;
  const { data: session } = authClient.useSession();
  const [filter, setFilter] = useState(ALL);

  // Everything visible here counts as seen (also lines that arrive while the screen is open).
  useEffect(() => {
    markDiagnosticsSeen();
  }, [entries.length]);

  const info = [...buildInfo(), `Сессия: ${session ? session.user.email : 'нет'}`];
  const tags = [ALL, PROBLEMS, ...Array.from(new Set(entries.map((e) => e.tag))).sort()];
  const visible = [...entries]
    .reverse()
    .filter((e) =>
      filter === ALL ? true : filter === PROBLEMS ? e.level === 'warn' || e.level === 'error' : e.tag === filter,
    );

  const onShare = () =>
    Share.share({ message: ['Eat And Calc — журнал', ...info, '', ...visible.map(formatEntry)].join('\n') });

  return (
    <Screen title="Журнал" onBack={back}>
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

      <View style={styles.tags}>
        {tags.map((tag) => {
          const active = tag === filter;
          return (
            <Pressable
              key={tag}
              accessibilityRole="button"
              onPress={() => setFilter(tag)}
              style={[styles.tag, active && styles.tagActive]}>
              <Text variant="label" color={active ? colors.onPrimary : colors.textSecondary}>{tag}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button title="Поделиться" variant="soft" style={styles.flex} onPress={onShare} />
        <Button title="Очистить" variant="ghost" style={styles.flex} onPress={clearDiagnostics} />
      </View>

      <Card style={styles.card}>
        {visible.length === 0 ? (
          <Text variant="caption">Записей нет.</Text>
        ) : (
          visible.map((e, i) => (
            <Text key={`${e.t}-${i}`} variant="caption" color={levelColor(e)} selectable>
              {formatEntry(e)}
            </Text>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  warn: { backgroundColor: colors.overSoft },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  tagActive: { backgroundColor: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
