import { router } from 'expo-router';

import { familyErrorMessage } from '@/components/family/errors';
import { StateMessage, type StateMessageProps } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';

export type LoadErrorProps = {
  error: unknown;
  onRetry: () => void;
  /** Shown on a 4xx answer (e.g. 404): the record is gone. */
  notFound: { icon: StateMessageProps['icon']; title: string };
};

/** Failed load of one record: no answer or 5xx → «Нет связи» + retry; 4xx (e.g. 404) → «… не найден» + back. */
export function LoadError({ error, onRetry, notFound }: LoadErrorProps) {
  if (error != null && (!(error instanceof ApiRequestError) || error.status >= 500)) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={onRetry}
      />
    );
  }
  return (
    <StateMessage
      icon={notFound.icon}
      title={notFound.title}
      text={familyErrorMessage(error)}
      actionTitle="Назад"
      onAction={() => router.back()}
    />
  );
}
