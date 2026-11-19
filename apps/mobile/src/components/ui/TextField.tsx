import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, fonts, radii } from '@/theme';
import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  style?: ViewStyle;
};

/** Labeled single-line input (48 high, white, bordered). */
export function TextField({ label, style, ...rest }: TextFieldProps) {
  return (
    <View style={[styles.root, style]}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textDisabled}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  input: {
    height: 48,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
    color: colors.text,
  },
});
