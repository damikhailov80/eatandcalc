import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme';

/** White rounded surface used for every content block. */
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    ...shadow.card,
  },
});
