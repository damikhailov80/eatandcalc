import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { colors, radii, touch } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: IconName;
  /** Accessibility label, required: the button has no text. */
  label: string;
  /** Warm filled square (card actions) or transparent (header back). */
  variant?: 'filled' | 'plain';
  color?: string;
  style?: ViewStyle;
};

/** 44×44 icon-only button. */
export function IconButton({ icon, label, variant = 'filled', color = colors.text, style, ...rest }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        variant === 'filled' && styles.filled,
        { opacity: pressed ? 0.6 : 1 },
        style,
      ]}
      {...rest}>
      <MaterialCommunityIcons name={icon} size={variant === 'filled' ? 18 : 24} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: touch, height: touch, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  filled: { backgroundColor: colors.bg },
});
