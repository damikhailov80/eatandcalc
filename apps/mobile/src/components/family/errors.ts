import { ApiErrors } from '@eatandcalc/shared';

import { apiErrorCode } from '@/lib/api';

const messages: Record<string, string> = {
  [ApiErrors.inviteInvalid]: 'Код не найден или отозван. Попросите новую ссылку.',
  [ApiErrors.alreadyMember]: 'Вы уже в этой семье.',
  [ApiErrors.householdNotEmpty]: 'В вашей семье есть другие аккаунты. Сначала удалите их или выйдите из семьи.',
  [ApiErrors.ownerCannotLeave]: 'Владелец не может выйти из своей семьи.',
  [ApiErrors.ownerOnly]: 'Это может сделать только владелец семьи.',
  [ApiErrors.cannotRemoveSelf]: 'Нельзя удалить свой аккаунт.',
  [ApiErrors.notFound]: 'Не найдено. Возможно, уже удалено.',
  [ApiErrors.validation]: 'Проверьте введённые данные.',
};

/** Russian message for a failed family/household request. */
export const familyErrorMessage = (e: unknown) =>
  messages[apiErrorCode(e) ?? ''] ?? 'Не удалось выполнить. Проверьте интернет и попробуйте ещё раз.';
