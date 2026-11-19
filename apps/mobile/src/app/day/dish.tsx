import {
  cookedWeight,
  cookingTotals,
  formatDayMonth,
  formatDayTitle,
  formatGrams,
  formatInt,
  formatOne,
  fromISODate,
  todayISO,
  type ConsumptionDto,
  type FamilyMemberDto,
  type Nutrients,
} from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { PortionRow } from '@/components/day/PortionRow';
import { familyErrorMessage } from '@/components/family/errors';
import { Button, Card, IconButton, Screen, StateMessage, StickyFooter, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { dayEaten, eatenOf, findDish, MEAL_TITLES, useWeekMeals, type MealType } from '@/lib/day';
import { queryClient, queryKeys } from '@/lib/query';
import { colors, fonts, macroColors, radii, spacing } from '@/theme';

type Params = {
  date: string;
  /** Existing dish. */
  id?: string;
  /** New dish: the meal (empty = a new one of `type`) and the cooking session served. */
  type?: MealType;
  meal?: string;
  session?: string;
};

/** What the screen shows about the dish: the stored copy, or the session as it is now (new dish). */
type DishInfo = {
  name: string;
  per100: Nutrients;
  sourceDate: string | null;
  weightG: number | null;
  rawWeight: boolean;
};

/** Per member: switched on, grams. */
type Split = Record<string, { on: boolean; grams: number }>;

function initialSplit(members: readonly FamilyMemberDto[], consumptions: readonly ConsumptionDto[] | null): Split {
  const split: Split = {};
  for (const m of members) {
    const c = consumptions?.find((x) => x.memberId === m.id);
    split[m.id] = { on: consumptions ? !!c : true, grams: c?.grams ?? 0 };
  }
  return split;
}

/** Split a dish between family members (`Distribute`): a new dish of a meal, or who ate how much of an existing one. */
export default function DishScreen() {
  const { date, id, type = 'lunch', meal = '', session: sessionId } = useLocalSearchParams<Params>();
  const meals = useWeekMeals(date);
  const members = useQuery({ queryKey: queryKeys.familyMembers, queryFn: api.familyMembers });
  const sessions = useQuery({ queryKey: queryKeys.cooking, queryFn: api.cookingList, enabled: !id });

  const found = id && meals.data ? findDish(meals.data, id) : null;
  const session = sessionId ? sessions.data?.find((s) => s.id === sessionId) : undefined;

  const info = useMemo<DishInfo | null>(() => {
    if (found) {
      const d = found.dish;
      return { name: d.name, per100: d.nutrients, sourceDate: d.sourceDate, weightG: d.weightG, rawWeight: d.rawWeight };
    }
    if (session) {
      const t = cookingTotals(session.items, cookedWeight(session.grossWeightG, session.potWeightG));
      return { name: session.name, per100: t.per100, sourceDate: session.date, weightG: t.weightG, rawWeight: !t.weighed };
    }
    return null;
  }, [found, session]);

  const eatenElsewhere = useMemo(() => dayEaten(meals.data ?? [], date, id), [meals.data, date, id]);

  const [split, setSplit] = useState<Split | null>(null);
  const ready = info && members.data && (!id || found);
  if (ready && !split) setSplit(initialSplit(members.data, found ? found.dish.consumptions : null));

  const consumptions = useMemo<ConsumptionDto[]>(() => {
    if (!split) return [];
    const own = Object.entries(split).flatMap(([memberId, s]) =>
      s.on && s.grams > 0 ? [{ memberId, grams: s.grams }] : [],
    );
    // Members no longer on the list (archived) keep what they ate.
    const known = new Set(Object.keys(split));
    const kept = found ? found.dish.consumptions.filter((c) => !known.has(c.memberId)) : [];
    return [...own, ...kept];
  }, [split, found]);

  const done = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.meals });
    queryClient.invalidateQueries({ queryKey: queryKeys.cooking });
    router.back();
  };
  const onError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));
  const save = useMutation({
    mutationFn: () =>
      id
        ? api.updateDish(id, consumptions)
        : api.addDish({ date, mealId: meal || null, type, source: { sessionId: sessionId ?? '' }, consumptions }),
    onSuccess: done,
    onError,
  });
  const remove = useMutation({ mutationFn: () => api.deleteDish(id ?? ''), onSuccess: done, onError });
  const busy = save.isPending || remove.isPending;

  const confirmRemove = () =>
    Alert.alert(`Убрать «${info?.name ?? 'блюдо'}» из приёма пищи?`, undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Убрать', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const mealType = found?.meal.type ?? type;
  const subtitle = `${MEAL_TITLES[mealType]} · ${formatDayTitle(date, todayISO())}`;

  const loading = meals.isPending || members.isPending || (!id && sessions.isPending);
  const failed = meals.isError || members.isError || sessions.isError;
  let body;
  if (loading) {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (failed) {
    body = (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          if (meals.isError) meals.refetch();
          if (members.isError) members.refetch();
          if (sessions.isError) sessions.refetch();
        }}
      />
    );
  } else if (!info || !split || !members.data) {
    body = <StateMessage icon="silverware-variant" title="Блюдо не найдено" text="Возможно, его уже убрали." />;
  } else {
    const total = consumptions.reduce((g, c) => g + c.grams, 0);
    body = (
      <>
        <Card style={styles.summary}>
          <Text variant="h3">{info.name}</Text>
          <View style={styles.metaRow}>
            <Text variant="caption">
              {info.sourceDate
                ? `Готовка ${formatDayMonth(fromISODate(info.sourceDate))}${info.weightG ? ` · ${formatGrams(info.weightG)}` : ''}`
                : 'Продукт'}
            </Text>
            {info.rawWeight ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText} color={colors.warn}>сырой вес</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.stats}>
            <Stat label="ккал" value={formatInt(info.per100.kcal)} color={macroColors.kcal} />
            <Stat label="белки" value={formatOne(info.per100.protein)} color={macroColors.protein} />
            <Stat label="жиры" value={formatOne(info.per100.fat)} color={macroColors.fat} />
            <Stat label="углев." value={formatOne(info.per100.carbs)} color={macroColors.carbs} />
          </View>
          <Text variant="caption">{info.sourceDate ? 'На 100 г готового блюда' : 'На 100 г'}</Text>
        </Card>

        <Card style={styles.split}>
          <View style={styles.splitHead}>
            <Text variant="h3" style={styles.splitTitle}>Кто сколько съест</Text>
            <Text style={styles.sum}>{formatGrams(total)}</Text>
          </View>
          {members.data.length ? (
            members.data.map((m) => {
              const s = split[m.id] ?? { on: false, grams: 0 };
              return (
                <PortionRow
                  key={m.id}
                  member={m}
                  on={s.on}
                  grams={s.grams}
                  per100={info.per100}
                  eatenElsewhere={eatenOf(eatenElsewhere, m.id)}
                  onToggle={() => setSplit({ ...split, [m.id]: { ...s, on: !s.on } })}
                  onGrams={(grams) => setSplit({ ...split, [m.id]: { on: true, grams } })}
                />
              );
            })
          ) : (
            <Text variant="caption">Добавьте членов семьи на вкладке «Семья».</Text>
          )}
        </Card>
      </>
    );
  }

  const saveTitle = id ? 'Сохранить' : `Сохранить в ${MEAL_TITLES[mealType].toLowerCase()}`;
  return (
    <Screen
      title={id ? 'Блюдо' : 'Новое блюдо'}
      onBack={() => router.back()}
      actions={
        id && found ? (
          <IconButton
            icon="trash-can-outline"
            variant="plain"
            color={colors.textMuted}
            label="Убрать из приёма пищи"
            disabled={busy}
            onPress={confirmRemove}
          />
        ) : undefined
      }
      footer={
        <StickyFooter>
          <Button
            title={saveTitle}
            large
            disabled={busy || !info || consumptions.length === 0}
            onPress={() => save.mutate()}
          />
        </StickyFooter>
      }>
      <Text variant="label" color={colors.textMuted} style={styles.subtitle}>{subtitle}</Text>
      {body}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} color={color}>{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 48, alignItems: 'center' },
  subtitle: { marginTop: -spacing.sm },
  summary: { gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  badge: { borderRadius: radii.pill, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.warnSoft },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 11 },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 18 },
  split: { paddingBottom: spacing.sm },
  splitHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, paddingBottom: spacing.sm },
  splitTitle: { flex: 1 },
  sum: { fontFamily: fonts.bodySemibold, fontSize: 13 },
});
