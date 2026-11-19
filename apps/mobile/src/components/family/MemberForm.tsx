import {
  energyCheck,
  formatInt,
  type FamilyMemberInput,
  type Nutrients,
} from '@eatandcalc/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, MemberAvatar, SegmentedControl, Stepper, Text, TextField } from '@/components/ui';
import { colors, fonts, macroColors, memberColors, radii, spacing } from '@/theme';

const SEX_OPTIONS = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
] as const;

const COLOR_NAMES: Record<string, string> = {
  '#2F5D9E': 'Синий',
  '#A3456F': 'Малиновый',
  '#2E7D4F': 'Зелёный',
  '#9A6416': 'Охра',
};

type NormRow = {
  key: keyof Nutrients;
  label: string;
  unit: string;
  step: number;
  /** kcal per gram for the "N ккал" sublabel; null for the kcal row itself. */
  kcalPerG: number | null;
};

const NORM_ROWS: NormRow[] = [
  { key: 'kcal', label: 'Калории', unit: 'ккал', step: 50, kcalPerG: null },
  { key: 'protein', label: 'Белки', unit: 'г', step: 5, kcalPerG: 4 },
  { key: 'fat', label: 'Жиры', unit: 'г', step: 5, kcalPerG: 9 },
  { key: 'carbs', label: 'Углеводы', unit: 'г', step: 5, kcalPerG: 4 },
];

const percent = (share: number) => `${Math.round(share * 100)}%`;

export type MemberFormProps = {
  value: FamilyMemberInput;
  onChange: (value: FamilyMemberInput) => void;
};

/** MemberEdit mockup body: avatar + name, sex and color, norm steppers, macro energy check. */
export function MemberForm({ value, onChange }: MemberFormProps) {
  const set = <K extends keyof FamilyMemberInput>(key: K, v: FamilyMemberInput[K]) =>
    onChange({ ...value, [key]: v });
  const setNorm = (key: keyof Nutrients, v: number) => set('norms', { ...value.norms, [key]: v });

  const check = energyCheck(value.norms);
  const diffAbs = formatInt(Math.abs(check.diff));
  const diffText = check.close
    ? `Нормы согласованы: разница с калориями ${diffAbs} ккал`
    : `БЖУ дают на ${diffAbs} ккал ${check.diff > 0 ? 'меньше' : 'больше'}, чем норма калорий`;

  return (
    <>
      <View style={styles.identity}>
        <MemberAvatar name={value.name} color={value.color} size={64} />
        <TextField
          label="Имя"
          value={value.name}
          onChangeText={(t) => set('name', t)}
          placeholder="Например, Анна"
          maxLength={40}
          autoCapitalize="words"
          style={styles.flex}
        />
      </View>

      <View style={styles.sexRow}>
        <SegmentedControl
          options={SEX_OPTIONS}
          value={value.sex}
          onChange={(v) => set('sex', v)}
          accessibilityLabel="Пол"
          style={styles.flex}
        />
        <View accessibilityRole="radiogroup" accessibilityLabel="Цвет профиля" style={styles.swatches}>
          {memberColors.map((c) => {
            const selected = c === value.color;
            return (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityLabel={COLOR_NAMES[c]}
                accessibilityState={{ checked: selected }}
                hitSlop={4}
                onPress={() => set('color', c)}
                style={[styles.swatch, { backgroundColor: c, borderColor: selected ? colors.text : colors.surface }]}
              />
            );
          })}
        </View>
      </View>

      <Card style={styles.normsCard}>
        <View style={styles.normsHead}>
          <Text variant="h3">Дневные нормы</Text>
          <Text variant="caption">Укажите значения от врача, диетолога или своего расчёта</Text>
        </View>
        {NORM_ROWS.map((row) => (
          <View key={row.key} style={styles.normRow}>
            <View style={[styles.dot, { backgroundColor: macroColors[row.key] }]} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{row.label}</Text>
              <Text variant="caption">
                {row.kcalPerG === null ? 'в день' : `${formatInt(value.norms[row.key] * row.kcalPerG)} ккал`}
              </Text>
            </View>
            <Stepper
              label={row.label}
              value={value.norms[row.key]}
              onChange={(v) => setNorm(row.key, v)}
              step={row.step}
              unit={row.unit}
              inputWidth={row.key === 'kcal' ? 52 : 38}
            />
          </View>
        ))}
      </Card>

      <Card style={styles.energy}>
        <View style={styles.energyHead}>
          <Text variant="bodyStrong" style={styles.flex}>Энергия из БЖУ</Text>
          <Text variant="bodyStrong">{formatInt(check.fromMacros)} ккал</Text>
        </View>
        <View style={styles.split}>
          <View style={{ flex: check.shares.protein, backgroundColor: macroColors.protein }} />
          <View style={{ flex: check.shares.fat, backgroundColor: macroColors.fat }} />
          <View style={{ flex: check.shares.carbs, backgroundColor: macroColors.carbs }} />
        </View>
        <View style={styles.legend}>
          <Text variant="caption" color={colors.textSecondary}>Белки {percent(check.shares.protein)}</Text>
          <Text variant="caption" color={colors.textSecondary}>Жиры {percent(check.shares.fat)}</Text>
          <Text variant="caption" color={colors.textSecondary}>Углеводы {percent(check.shares.carbs)}</Text>
        </View>
        <View style={[styles.note, { backgroundColor: check.close ? colors.primarySoft : colors.warnSoft }]}>
          <Text variant="caption" style={styles.noteText} color={check.close ? colors.primaryDark : colors.warn}>
            {diffText}
          </Text>
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  sexRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  swatches: { flexDirection: 'row', gap: spacing.xs },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  normsCard: { padding: 0, overflow: 'hidden' },
  normsHead: { paddingTop: 14, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 2 },
  normRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  dot: { width: 10, height: 10, borderRadius: 3 },
  energy: { gap: 10 },
  energyHead: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  split: { flexDirection: 'row', height: 10, borderRadius: radii.pill, overflow: 'hidden', gap: 2, backgroundColor: colors.track },
  legend: { flexDirection: 'row', gap: spacing.md },
  note: { borderRadius: radii.sm, paddingVertical: spacing.sm, paddingHorizontal: 10 },
  noteText: { fontFamily: fonts.bodySemibold },
});
