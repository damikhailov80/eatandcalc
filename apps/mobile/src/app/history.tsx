import {
  dayStatus,
  eatenByDay,
  energyShares,
  formatDayMonthShort,
  formatDayTitle,
  formatInt,
  formatKcal,
  formatMonthShort,
  formatMonthYear,
  fromISODate,
  normOf,
  periodSummary,
  todayISO,
  type DayStatus,
  type Nutrients,
} from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { MonthGrid, type DayMark } from '@/components/day/MonthGrid';
import { BarChart } from '@/components/stats/BarChart';
import { Button, Card, Chip, ChipRow, ProgressBar, Screen, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { monthDays, monthOf, useMonthGridMeals } from '@/lib/day';
import { queryKeys } from '@/lib/query';
import { colors, fonts, macroColors, radii, spacing } from '@/theme';

const FAMILY = 'family';
const MONTHS_BACK = 5;

const STATUS_COLOR: Record<DayStatus, string> = { ok: colors.primary, over: colors.over, under: colors.under };
const FLAG_COLOR: Record<DayStatus, string> = {
  ok: colors.primaryDark,
  over: colors.over,
  under: colors.textSecondary,
};
const STATUS_MARK: Record<DayStatus, DayMark> = {
  ok: { color: colors.primary },
  over: { color: colors.over },
  under: { color: colors.under, ring: true },
};

const MACROS = [
  { key: 'protein', name: 'Белки', short: 'Б' },
  { key: 'fat', name: 'Жиры', short: 'Ж' },
  { key: 'carbs', name: 'Углеводы', short: 'У' },
] as const;

const bju = (n: Nutrients) => `Б ${formatInt(n.protein)} · Ж ${formatInt(n.fat)} · У ${formatInt(n.carbs)} г`;
const share = (value: number, norm: number) => (norm > 0 ? value / norm : 0);
const kcalDiff = (eaten: number, norm: number) => {
  const d = Math.round(eaten - norm);
  return d < 0 ? `−${formatInt(-d)} ккал` : `+${formatInt(d)} ккал`;
};

/** Nutrition history (mockup `History`): family / member filter, month calendar with day status, charts, past days. */
export default function HistoryScreen() {
  const today = todayISO();
  const [month, setMonth] = useState(() => monthOf(today));
  const [filter, setFilter] = useState(FAMILY);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const members = useQuery({ queryKey: queryKeys.familyMembers, queryFn: api.familyMembers });
  const meals = useMonthGridMeals(month);
  const rangeFrom = monthOf(today, -MONTHS_BACK);
  const range = useQuery({
    queryKey: queryKeys.mealsRange(rangeFrom, today),
    queryFn: () => api.meals(rangeFrom, today),
  });

  const chosen = useMemo(() => {
    const all = members.data ?? [];
    const one = all.find((m) => m.id === filter);
    return one ? [one] : all;
  }, [members.data, filter]);
  const ids = useMemo(() => new Set(chosen.map((m) => m.id)), [chosen]);
  const norm = useMemo(() => normOf(chosen), [chosen]);

  const eaten = useMemo(() => eatenByDay(meals.data ?? [], ids), [meals.data, ids]);
  const days = useMemo(() => monthDays(month), [month]);
  const inMonth = (d: string) => d.startsWith(month.slice(0, 7)) && d < today;
  const summary = periodSummary(eaten, norm, inMonth);
  const status = (d: string) => {
    const n = eaten.get(d);
    return n && d < today ? dayStatus(n.kcal, norm.kcal) : null;
  };
  const past = days
    .filter((d) => d < today && eaten.has(d))
    .reverse()
    .map((d) => ({ date: d, eaten: eaten.get(d)!, status: status(d)! }));

  const monthly = useMemo(() => {
    const byDay = eatenByDay(range.data ?? [], ids);
    return Array.from({ length: MONTHS_BACK + 1 }, (_, i) => {
      const m = monthOf(today, i - MONTHS_BACK);
      const s = periodSummary(byDay, norm, (d) => d.startsWith(m.slice(0, 7)) && d < today);
      return { month: m, average: s.average.kcal, days: s.days };
    });
  }, [range.data, ids, norm, today]);

  const openDay = (date: string) => router.navigate({ pathname: '/', params: { date, at: String(Date.now()) } });

  let body;
  if (members.isPending || (meals.isPending && !meals.data)) {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (members.isError || meals.isError) {
    body = (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          if (members.isError) members.refetch();
          if (meals.isError) meals.refetch();
        }}
      />
    );
  } else if (!members.data.length) {
    body = (
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/family')}>
        <Card>
          <Text variant="h3">Добавьте членов семьи</Text>
        </Card>
      </Pressable>
    );
  } else {
    const dayBar = selectedDay ? eaten.get(selectedDay) : undefined;
    const monthBar = monthly.find((m) => m.month === selectedMonth);
    body = (
      <>
        {members.data.length > 1 ? (
          <ChipRow>
            <Chip label="Семья" selected={filter === FAMILY} onPress={() => setFilter(FAMILY)} />
            {members.data.map((m) => (
              <Chip key={m.id} label={m.name} selected={filter === m.id} onPress={() => setFilter(m.id)} />
            ))}
          </ChipRow>
        ) : null}

        <Card style={styles.calendar}>
          <MonthGrid
            month={month}
            onMonthChange={(m) => {
              setMonth(m);
              setSelectedDay(null);
            }}
            today={today}
            mark={(d) => {
              const s = status(d);
              return s ? STATUS_MARK[s] : null;
            }}
            onPick={openDay}
          />
          <View style={styles.legend}>
            <Legend mark={STATUS_MARK.ok} label="В норме" />
            <Legend mark={STATUS_MARK.over} label="Превышение" />
            <Legend mark={STATUS_MARK.under} label="Недобор" />
          </View>
        </Card>

        {summary.days ? (
          <>
            <View style={styles.tiles}>
              <Card style={styles.tile}>
                <Text variant="caption">Среднее за день</Text>
                <Text style={styles.tileValue}>{formatKcal(summary.average.kcal)}</Text>
                <Text variant="caption">{`норма ${formatInt(norm.kcal)}`}</Text>
              </Card>
              <Card style={styles.tile}>
                <Text variant="caption">Дней в норме</Text>
                <Text style={styles.tileValue}>{`${summary.ok} из ${summary.days}`}</Text>
                <Text variant="caption">{`↑ ${summary.over} · ↓ ${summary.under}`}</Text>
              </Card>
            </View>

            <Card style={styles.card}>
              <View style={styles.chartHead}>
                <Text variant="h3" style={styles.flex}>Калории по дням</Text>
                <Text style={styles.chartValue} color={colors.textSecondary}>
                  {selectedDay
                    ? `${formatDayMonthShort(fromISODate(selectedDay))} · ${dayBar ? formatKcal(dayBar.kcal) : '—'}`
                    : `норма ${formatInt(norm.kcal)}`}
                </Text>
              </View>
              <BarChart
                bars={days.map((d) => {
                  const n = eaten.get(d);
                  const s = status(d);
                  const num = fromISODate(d).getDate();
                  return {
                    key: d,
                    value: n?.kcal ?? 0,
                    color: s ? STATUS_COLOR[s] : n ? colors.primaryMuted : colors.track,
                    label: num === 1 || num % 10 === 0 ? String(num) : undefined,
                  };
                })}
                norm={norm.kcal}
                selected={selectedDay}
                onSelect={setSelectedDay}
              />
            </Card>

            <Card style={styles.card}>
              <Text variant="h3">Б / Ж / У в среднем за день</Text>
              {MACROS.map(({ key, name }) => {
                const value = summary.average[key];
                const over = norm[key] > 0 && value > norm[key];
                return (
                  <View key={key} style={styles.macro}>
                    <View style={styles.macroHead}>
                      <Text style={styles.macroName} color={over ? colors.over : macroColors[key]}>{name}</Text>
                      <Text style={styles.macroValue}>
                        <Text style={styles.macroValue} color={over ? colors.over : colors.text}>
                          {`${formatInt(value)} г`}
                        </Text>
                        <Text style={styles.macroValue} color={colors.textMuted}>
                          {` / ${formatInt(norm[key])} г`}
                        </Text>
                      </Text>
                    </View>
                    <ProgressBar
                      value={share(value, norm[key])}
                      height={8}
                      color={over ? colors.over : macroColors[key]}
                    />
                  </View>
                );
              })}
            </Card>

            <Card style={styles.card}>
              <Text variant="h3">Доля энергии</Text>
              <EnergyRow label="Съедено" n={summary.average} />
              <EnergyRow label="Норма" n={norm} />
            </Card>
          </>
        ) : (
          <Card>
            <Text color={colors.textMuted}>Нет записей за месяц</Text>
          </Card>
        )}

        <Card style={styles.card}>
          <View style={styles.chartHead}>
            <Text variant="h3" style={styles.flex}>По месяцам</Text>
            <Text style={styles.chartValue} color={colors.textSecondary}>
              {monthBar
                ? `${formatMonthYear(fromISODate(monthBar.month))} · ${
                    monthBar.days ? formatKcal(monthBar.average) : '—'
                  }`
                : 'в среднем за день'}
            </Text>
          </View>
          {range.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : range.isError ? (
            <View style={styles.rangeError}>
              <Text color={colors.textMuted} style={styles.flex}>Нет связи с сервером</Text>
              <Button title="Повторить" variant="soft" onPress={() => range.refetch()} />
            </View>
          ) : (
            <BarChart
              bars={monthly.map((m) => ({
                key: m.month,
                value: m.average,
                color: m.days ? STATUS_COLOR[dayStatus(m.average, norm.kcal)] : colors.track,
                label: formatMonthShort(fromISODate(m.month)),
              }))}
              norm={norm.kcal}
              height={110}
              selected={selectedMonth}
              onSelect={setSelectedMonth}
            />
          )}
        </Card>

        {past.length ? (
          <>
            <Text variant="h2" style={styles.section}>Прошлые дни</Text>
            {past.map((d) => (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                onPress={() => openDay(d.date)}
                style={({ pressed }) => pressed && styles.pressed}>
                <Card style={styles.day}>
                  <View style={styles.dayHead}>
                    <Text style={styles.dayTitle}>{formatDayTitle(d.date, today)}</Text>
                    <Text style={styles.dayKcal}>
                      <Text style={styles.dayKcal} color={d.status === 'over' ? colors.over : colors.text}>
                        {formatInt(d.eaten.kcal)}
                      </Text>
                      <Text style={styles.dayKcal} color={colors.textMuted}>{` / ${formatInt(norm.kcal)}`}</Text>
                    </Text>
                  </View>
                  <ProgressBar value={share(d.eaten.kcal, norm.kcal)} height={6} color={STATUS_COLOR[d.status]} />
                  <View style={styles.dayHead}>
                    <Text variant="caption" style={styles.flex}>{bju(d.eaten)}</Text>
                    <Text
                      style={styles.flag}
                      color={FLAG_COLOR[d.status]}>
                      {d.status === 'ok' ? 'В норме' : kcalDiff(d.eaten.kcal, norm.kcal)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        ) : null}
      </>
    );
  }

  return (
    <Screen title="История питания" onBack={() => router.back()}>
      {body}
    </Screen>
  );
}

function Legend({ mark, label }: { mark: DayMark; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          mark.ring ? { borderWidth: 1.5, borderColor: mark.color } : { backgroundColor: mark.color },
        ]}
      />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

function EnergyRow({ label, n }: { label: string; n: Nutrients }) {
  const s = energyShares(n);
  return (
    <View style={styles.energy}>
      <View style={styles.energyHead}>
        <Text style={styles.energyLabel}>{label}</Text>
        <Text variant="caption">
          {MACROS.map(({ key, short }) => `${short} ${formatInt(s[key] * 100)} %`).join(' · ')}
        </Text>
      </View>
      <View style={styles.stack}>
        {MACROS.map(({ key }) =>
          s[key] > 0 ? <View key={key} style={{ flex: s[key], backgroundColor: macroColors[key] }} /> : null,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rangeError: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loading: { paddingVertical: 48, alignItems: 'center' },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  calendar: { padding: spacing.md, gap: spacing.sm },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, gap: 2, padding: spacing.md },
  tileValue: { fontFamily: fonts.headingHeavy, fontSize: 20, fontVariant: ['tabular-nums'] },
  card: { gap: spacing.md },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chartValue: { fontFamily: fonts.bodyMedium, fontSize: 13, fontVariant: ['tabular-nums'] },
  macro: { gap: 6 },
  macroHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  macroName: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  macroValue: { fontFamily: fonts.bodySemibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  energy: { gap: 6 },
  energyHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  energyLabel: { fontFamily: fonts.bodySemibold, fontSize: 14 },
  stack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.track,
  },
  section: { marginTop: spacing.sm },
  day: { gap: spacing.sm, padding: spacing.md },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayTitle: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 15 },
  dayKcal: { fontFamily: fonts.bodySemibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  flag: { fontFamily: fonts.bodySemibold, fontSize: 13 },
});
