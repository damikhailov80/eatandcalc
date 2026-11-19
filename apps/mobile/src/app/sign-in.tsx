import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import { signInWithGoogle } from '@/lib/auth';
import { useDiagnostics } from '@/lib/diagnostics';
import { colors, radii, spacing } from '@/theme';

export default function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signOut } = useDiagnostics();

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle();
    // On success the root layout's guard switches to the tabs.
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <MaterialCommunityIcons name="food-apple-outline" size={40} color={colors.primaryDark} />
        </View>
        <Text variant="title" style={styles.center}>Eat And Calc</Text>
        <Text variant="body" color={colors.textSecondary} style={styles.center}>
          Питание всей семьи: что приготовили, кто сколько съел и сколько осталось до нормы.
        </Text>
      </View>

      <View style={styles.bottom}>
        {signOut && !error ? (
          <Card style={styles.error}>
            <Text variant="bodyStrong" color={colors.over}>Сервер завершил сессию</Text>
            <Text variant="caption" color={colors.over}>{signOut.reason}</Text>
          </Card>
        ) : null}
        {error ? (
          <Card style={styles.error}>
            <Text variant="bodyStrong" color={colors.over}>{error}</Text>
          </Card>
        ) : null}
        {busy ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : (
          <Button title="Войти через Google" large onPress={onSignIn} />
        )}
        <Text variant="caption" style={styles.center}>
          Доступ только для аккаунтов семьи.
        </Text>
        <Button title="Журнал входа" variant="ghost" onPress={() => router.push('/diagnostics')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xxl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radii.card,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  center: { textAlign: 'center' },
  bottom: { gap: spacing.md, paddingBottom: spacing.xxl },
  error: { backgroundColor: colors.overSoft },
  spinner: { height: 52 },
});
