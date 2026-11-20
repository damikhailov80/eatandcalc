import { withNormsOn, type FamilyMemberDto } from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from './api';
import { queryKeys } from './query';

/** The family members with `norms` = the norm in effect on `date` (the cache holds the full norm history). */
export function useFamilyMembers(date: string) {
  const select = useCallback((list: FamilyMemberDto[]) => withNormsOn(list, date), [date]);
  return useQuery({ queryKey: queryKeys.familyMembers, queryFn: api.familyMembers, select });
}
