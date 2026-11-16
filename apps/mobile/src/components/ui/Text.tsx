import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fonts } from '@/theme';

export type TextVariant = 'title' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'label' | 'caption';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: string;
};

/** Typography primitive. All numbers render with tabular figures so columns line up. */
export function Text({ variant = 'body', color, style, ...rest }: TextProps) {
  return <RNText style={[styles.base, styles[variant], color ? { color } : null, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: { color: colors.text, fontVariant: ['tabular-nums'] },
  title: { fontFamily: fonts.headingHeavy, fontSize: 28, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.heading, fontSize: 18 },
  h3: { fontFamily: fonts.heading, fontSize: 16 },
  body: { fontFamily: fonts.body, fontSize: 15 },
  bodyStrong: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textSecondary },
  caption: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
