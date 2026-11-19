import { Placeholder, Screen } from '@/components/ui';
import { refreshAll } from '@/lib/query';

export default function DayScreen() {
  return (
    <Screen onRefresh={refreshAll} title="Сегодня" subtitle="Ежедневное питание">
      <Placeholder text="План питания семьи на день: приёмы пищи, блюда, распределение по членам семьи и итоги КБЖУ." />
    </Screen>
  );
}
