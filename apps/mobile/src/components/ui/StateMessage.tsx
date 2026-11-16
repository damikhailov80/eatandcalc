import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type StateMessageProps = {
  icon: IconName;
  title: string;
  text?: string;
  actionTitle?: string;
  onAction?: () => void;
};

/** Full-screen centered message: no connection, server error, empty state. */
export function StateMessage({ icon, title, text, actionTitle, onAction }: StateMessageProps) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.textMuted} />
        <Text variant="h2" style={styles.center}>{title}</Text>
        {text ? <Text variant="caption" style={styles.center}>{text}</Text> : null}
        {actionTitle && onAction ? (
          <Button title={actionTitle} variant="soft" onPress={onAction} style={styles.action} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  center: { textAlign: 'center' },
  action: { marginTop: spacing.md },
});
