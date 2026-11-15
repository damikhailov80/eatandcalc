import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { colors, fonts, radii, spacing, touch } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'soft' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: Variant;
  /** Full-width 52px bottom action ("Сохранить"). */
  large?: boolean;
  style?: ViewStyle;
};

const palette: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  soft: { bg: colors.primarySoft, fg: colors.primaryDark },
  ghost: { bg: 'transparent', fg: colors.text },
  danger: { bg: 'transparent', fg: colors.danger },
};

export function Button({ title, variant = 'primary', large, style, disabled, ...rest }: ButtonProps) {
  const p = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        { backgroundColor: p.bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}
      {...rest}>
      <Text style={[styles.label, { color: p.fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { minHeight: 52, borderRadius: radii.lg },
  label: { fontFamily: fonts.bodySemibold, fontSize: 15 },
});
