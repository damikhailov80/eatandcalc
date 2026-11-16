import { Placeholder, Screen } from '@/components/ui';

export default function DayScreen() {
  return (
    <Screen title="Сегодня" subtitle="Ежедневное питание">
      <Placeholder text="План питания семьи на день: приёмы пищи, блюда, распределение по членам семьи и итоги КБЖУ." />
    </Screen>
  );
}
