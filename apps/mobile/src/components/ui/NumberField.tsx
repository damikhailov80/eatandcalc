import { StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import { colors, fonts, radii } from '@/theme';
import { Text } from './Text';

export type NumberFieldProps = {
  /** Raw text (",", "." and blank are fine mid-input); parse with `parseNumberInput`. */
  value: string;
  onChangeText: (text: string) => void;
  /** Accessibility name ("Белки"). */
  label: string;
  /** Suffix inside the field ("г", "ккал"). */
  unit?: string;
  placeholder?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
};

/** Compact numeric input with a unit suffix: decimal pad, accepts "," and ".". */
export function NumberField({ value, onChangeText, label, unit, placeholder, invalid, autoFocus, style }: NumberFieldProps) {
  return (
    <View style={[styles.root, invalid && styles.invalid, style]}>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        selectTextOnFocus
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        onChangeText={(t) => {
          if (/^[\d.,]*$/.test(t)) onChangeText(t);
        }}
        style={styles.input}
      />
      {unit ? <Text style={styles.unit} color={colors.textMuted}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 44,
    minWidth: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  invalid: { borderColor: colors.over },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    textAlign: 'right',
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontFamily: fonts.body, fontSize: 14 },
});
