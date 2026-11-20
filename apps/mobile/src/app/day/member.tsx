import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  formatDayTitle,
  formatInt,
  formatKcal,
  formatKg,
  remaining,
  todayISO,
  weightOn,
  type FamilyMemberDto,
  type Nutrients,
} from '@eatandcalc/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card, ChipRow, MemberAvatar, ProgressBar, Screen, StateMessage, Text } from '@/components/ui';
import { useFamilyMembers } from '@/lib/family';
import { dayEaten, eatenOf, memberMeals, useWeekMeals } from '@/lib/day';
import { colors, fonts, macroColors, radii, spacing } from '@/theme';

const MACROS = [
  { key: 'protein', name: 'Белки' },
  { key: 'fat', name: 'Жиры' },
  { key: 'carbs', name: 'Углеводы' },
] as const;

const ROWS = [
  { key: 'kcal', name: 'Калории' },
  { key: 'protein', name: 'Белки, г' },
  { key: 'fat', name: 'Жиры, г' },
  { key: 'carbs', name: 'Углеводы, г' },
] as const;

const share = (eaten: number, norm: number) => (norm > 0 ? eaten / norm : 0);
const signed = (n: number) => (Math.round(n) < 0 ? `−${formatInt(-n)}` : formatInt(n));
const bju = (n: Nutrients) => `Б ${formatInt(n.protein)} · Ж ${formatInt(n.fat)} · У ${formatInt(n.carbs)} г`;

/** One member's day (mockup `MemberStats`): kcal, Б / Ж / У against the norm, the norm table, what they ate per meal. */
export default function MemberDayScreen() {
  const params = useLocalSearchParams<{ id: string; date: string }>();
  const date = params.date;
  const [memberId, setMemberId] = useState(params.id);
  const meals = useWeekMeals(date);
  const members = useFamilyMembers(date);

  const list = meals.data;
  const eaten = useMemo(() => dayEaten(list ?? [], date), [list, date]);
  const byMeal = useMemo(() => memberMeals(list ?? [], date, memberId), [list, date, memberId]);
  const member = members.data?.find((m) => m.id === memberId);

  let body;
  if ((meals.isPending && !list) || members.isPending) {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (meals.isError || members.isError) {
    body = (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          if (meals.isError) meals.refetch();
          if (members.isError) members.refetch();
        }}
      />
    );
  } else if (!member) {
    body = <StateMessage icon="account-question-outline" title="Член семьи не найден" />;
  } else {
    body = (
      <>
        <Switcher members={members.data} selected={memberId} onSelect={setMemberId} />
        {date <= todayISO() ? <WeightRow member={member} date={date} /> : null}
        <Summary member={member} eaten={eatenOf(eaten, member.id)} />
        <NormTable member={member} eaten={eatenOf(eaten, member.id)} />
        {byMeal.length ? (
          <>
            <Text variant="h2" style={styles.section}>По приёмам пищи</Text>
            {byMeal.map((meal) => (
              <Card key={meal.key} style={styles.meal}>
                <View style={styles.mealHead}>
                  <Text variant="h3" style={styles.flex}>{meal.title}</Text>
                  <Text style={styles.mealKcal}>{formatKcal(meal.eaten.kcal)}</Text>
                </View>
                {meal.lines.map((line) => (
                  <View key={line.dish.id} style={styles.line}>
                    <Text style={styles.dishName} numberOfLines={1}>{line.dish.name}</Text>
                    <Text style={styles.lineNumbers} color={colors.textSecondary}>
                      {`${line.amount} · ${formatKcal(line.eaten.kcal)}`}
                    </Text>
                  </View>
                ))}
                <Text variant="caption">{bju(meal.eaten)}</Text>
              </Card>
            ))}
          </>
        ) : (
          <Card>
            <Text color={colors.textMuted}>Ничего не съедено</Text>
          </Card>
        )}
      </>
    );
  }

  return (
    <Screen title="Итоги дня" subtitle={formatDayTitle(date)} subtitleBelow onBack={() => router.back()}>
      {body}
    </Screen>
  );
}

function Switcher({
  members,
  selected,
  onSelect,
}: {
  members: readonly FamilyMemberDto[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (members.length < 2) return null;
  return (
    <ChipRow>
      {members.map((m) => {
        const on = m.id === selected;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(m.id)}
            style={({ pressed }) => [styles.person, on && styles.personOn, pressed && styles.pressed]}>
            <MemberAvatar name={m.name} color={m.color} size={28} />
            <Text style={styles.personName} color={on ? colors.primaryDark : colors.text}>{m.name}</Text>
          </Pressable>
        );
      })}
    </ChipRow>
  );
}

/** The member's weight on the day; a tap opens `member/weight` to record or edit it (not for future days). */
function WeightRow({ member, date }: { member: FamilyMemberDto; date: string }) {
  const kg = weightOn(member.weights, date);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={kg != null ? `Вес ${formatKg(kg)}` : 'Записать вес'}
      onPress={() => router.push({ pathname: '/member/weight', params: { member: member.id, date } })}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.weight}>
        <MaterialCommunityIcons name="scale-bathroom" size={24} color={colors.primary} />
        <Text variant="h3" style={styles.flex}>Вес</Text>
        {kg != null ? (
          <Text style={styles.weightValue}>{formatKg(kg)}</Text>
        ) : (
          <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
        )}
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

function Summary({ member, eaten }: { member: FamilyMemberDto; eaten: Nutrients }) {
  const norm = member.norms;
  const left = norm.kcal - eaten.kcal;
  const over = left < 0;
  const macroOver = MACROS.find((m) => norm[m.key] > 0 && eaten[m.key] > norm[m.key]);
  return (
    <>
      <Card style={styles.card}>
        <View style={styles.kcalHead}>
          <Text style={styles.kcalBig} color={over ? colors.over : colors.text}>{formatInt(eaten.kcal)}</Text>
          <Text style={styles.kcalOf} color={colors.textMuted}>{`из ${formatInt(norm.kcal)} ккал`}</Text>
        </View>
        <ProgressBar value={share(eaten.kcal, norm.kcal)} height={12} color={over ? colors.over : colors.primary} />
        <View style={styles.tiles}>
          <View style={[styles.tile, over && styles.tileOver]}>
            <Text variant="caption">{over ? 'Превышено' : 'Осталось'}</Text>
            <Text style={styles.tileValue} color={over ? colors.over : colors.text}>
              {formatKcal(Math.abs(left))}
            </Text>
          </View>
          {macroOver ? (
            <View style={[styles.tile, styles.tileOver]}>
              <Text variant="caption">Превышено</Text>
              <Text style={styles.tileValue} color={colors.over}>
                {`${macroOver.name} на ${formatInt(eaten[macroOver.key] - norm[macroOver.key])} г`}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
      <Card style={styles.card}>
        <Text variant="h3">Белки, жиры, углеводы</Text>
        {MACROS.map(({ key, name }) => {
          const value = eaten[key];
          const mnorm = norm[key];
          const mover = mnorm > 0 && value > mnorm;
          return (
            <View key={key} style={styles.macro}>
              <View style={styles.macroHead}>
                <Text style={styles.macroName} color={mover ? colors.over : macroColors[key]}>{name}</Text>
                <Text style={styles.macroValue}>
                  <Text style={styles.macroValue} color={mover ? colors.over : colors.text}>
                    {`${formatInt(value)} г`}
                  </Text>
                  <Text style={styles.macroValue} color={colors.textMuted}>{` / ${formatInt(mnorm)} г`}</Text>
                </Text>
              </View>
              <ProgressBar value={share(value, mnorm)} height={8} color={mover ? colors.over : macroColors[key]} />
              <Text variant="caption" color={mover ? colors.over : colors.textMuted}>
                {mover
                  ? `Превышено на ${formatInt(value - mnorm)} г`
                  : `Осталось ${formatInt(mnorm - value)} г · ${formatInt(share(value, mnorm) * 100)} %`}
              </Text>
            </View>
          );
        })}
      </Card>
    </>
  );
}

function NormTable({ member, eaten }: { member: FamilyMemberDto; eaten: Nutrients }) {
  const left = remaining(member.norms, eaten);
  return (
    <Card style={styles.table}>
      <View style={styles.tr}>
        {['Показатель', 'Норма', 'Съедено', 'Остаток'].map((h, i) => (
          <Text key={h} variant="caption" style={[styles.td, i === 0 ? styles.tdName : styles.tdNum]}>{h}</Text>
        ))}
      </View>
      {ROWS.map(({ key, name }) => (
        <View key={key} style={[styles.tr, styles.trBorder]}>
          <Text style={[styles.td, styles.tdName]}>{name}</Text>
          <Text style={[styles.td, styles.tdNum]}>{formatInt(member.norms[key])}</Text>
          <Text style={[styles.td, styles.tdNum]}>{formatInt(eaten[key])}</Text>
          <Text
            style={[styles.td, styles.tdNum, styles.tdLeft]}
            color={Math.round(left[key]) < 0 ? colors.over : colors.text}>
            {signed(left[key])}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 48, alignItems: 'center' },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  personOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  personName: { fontFamily: fonts.bodySemibold, fontSize: 14 },
  card: { gap: spacing.md },
  weight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
  weightValue: { fontFamily: fonts.headingHeavy, fontSize: 20, fontVariant: ['tabular-nums'] },
  kcalHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  kcalBig: { fontFamily: fonts.headingHeavy, fontSize: 40, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  kcalOf: { fontFamily: fonts.bodyMedium, fontSize: 15, fontVariant: ['tabular-nums'] },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, gap: 2, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.bg },
  tileOver: { backgroundColor: colors.overSoft },
  tileValue: { fontFamily: fonts.bodyBold, fontSize: 16, fontVariant: ['tabular-nums'] },
  macro: { gap: 6 },
  macroHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  macroName: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  macroValue: { fontFamily: fonts.bodySemibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  table: { paddingVertical: spacing.sm },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  trBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  td: { fontSize: 14, fontFamily: fonts.body, fontVariant: ['tabular-nums'] },
  tdName: { flex: 1.6 },
  tdNum: { flex: 1, textAlign: 'right' },
  tdLeft: { fontFamily: fonts.bodySemibold },
  section: { marginTop: spacing.sm },
  meal: { gap: spacing.xs },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  mealKcal: { fontFamily: fonts.bodyBold, fontSize: 14, fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  dishName: { flex: 1, fontSize: 14, fontFamily: fonts.body },
  lineNumbers: { fontSize: 13, fontFamily: fonts.bodyMedium, fontVariant: ['tabular-nums'] },
});
