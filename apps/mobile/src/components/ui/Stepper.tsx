import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatNumberInput, parseNumberInput } from '@eatandcalc/shared';

import { colors, fonts, radii, touch } from '@/theme';
import { Text } from './Text';

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  /** "ккал", "г". */
  unit?: string;
  /** Accessibility name ("Калории"). */
  label: string;
  /** Input width; wider for four-digit values. */
  inputWidth?: number;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** − value unit + with a typed value in between (decimal pad, "," or "."). */
export function Stepper({ value, onChange, step, min = 0, max = 9999, unit, label, inputWidth = 40 }: StepperProps) {
  // While typing, keep the raw text ("12," is valid mid-input); outside of editing show the value.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (v: number) => onChange(clamp(v, min, max));
  const bump = (delta: number) => {
    setDraft(null);
    commit(Math.round((value + delta) / step) * step);
  };

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: меньше`}
        onPress={() => bump(-step)}
        style={styles.button}>
        <MaterialCommunityIcons name="minus" size={18} color={colors.text} />
      </Pressable>
      <View style={styles.valueRow}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          selectTextOnFocus
          value={draft ?? formatNumberInput(value)}
          onChangeText={(text) => {
            setDraft(text);
            const parsed = parseNumberInput(text);
            if (parsed !== null) commit(parsed);
          }}
          onBlur={() => setDraft(null)}
          style={[styles.input, { width: inputWidth }]}
        />
        {unit ? <Text variant="caption">{unit}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: больше`}
        onPress={() => bump(step)}
        style={styles.button}>
        <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', height: touch, borderRadius: radii.md, backgroundColor: colors.bg },
  button: { width: 38, height: touch, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  input: {
    padding: 0,
    textAlign: 'right',
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
