import {
  ApiErrors,
  formatInviteCode,
  type Account,
  type MeResponse,
} from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { Button, Card, MemberAvatar, QrCode, Text } from '@/components/ui';
import { api, apiErrorCode, inviteUrl } from '@/lib/api';
import { queryClient, queryKeys, resetHouseholdData } from '@/lib/query';
import { colors, fonts, memberColors, radii, spacing } from '@/theme';
import { familyErrorMessage } from './errors';

const ROLE_LABEL = { owner: 'Владелец', member: 'Участник' } as const;

const showError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));

function AccountRow({ account, index, isMe, onRemove }: {
  account: Account;
  index: number;
  isMe: boolean;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.row}>
      <MemberAvatar name={account.name} color={memberColors[index % memberColors.length]} size={36} />
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {account.name}
          {isMe ? ' (вы)' : ''}
        </Text>
        <Text variant="caption" numberOfLines={1}>{account.email}</Text>
      </View>
      <View style={[styles.badge, account.role === 'owner' && styles.badgeOwner]}>
        <Text
          style={styles.badgeText}
          color={account.role === 'owner' ? colors.primaryDark : colors.textSecondary}>
          {ROLE_LABEL[account.role]}
        </Text>
      </View>
      {onRemove ? (
        <Button title="Удалить" variant="danger" onPress={onRemove} style={styles.remove} />
      ) : null}
    </View>
  );
}

/** Owner only: create, share and revoke the invite link. */
function InviteBlock() {
  const invite = useQuery({ queryKey: queryKeys.invite, queryFn: api.invite });
  const setInvite = (data: Awaited<ReturnType<typeof api.invite>>) =>
    queryClient.setQueryData(queryKeys.invite, data);

  const create = useMutation({ mutationFn: api.createInvite, onSuccess: setInvite, onError: showError });
  const revoke = useMutation({
    mutationFn: api.revokeInvite,
    onSuccess: () => setInvite(null),
    onError: showError,
  });

  const share = (code: string) =>
    Share.share({
      message: `Присоединяйтесь к нашей семье в Eat And Calc: ${inviteUrl(code)}\nКод приглашения: ${formatInviteCode(code)}`,
    });

  const current = invite.data;
  const busy = create.isPending || revoke.isPending;

  if (!current) {
    return (
      <View style={styles.invite}>
        <Text variant="caption">
          Отправьте ссылку второму взрослому: он войдёт через Google и увидит те же продукты, рецепты и дневник.
        </Text>
        <Button
          title="Пригласить в семью"
          variant="soft"
          disabled={busy || invite.isPending}
          onPress={() => create.mutate()}
        />
      </View>
    );
  }

  return (
    <View style={styles.invite}>
      <View style={styles.codeBox}>
        <QrCode value={inviteUrl(current.code)} size={200} />
        <Text variant="caption" style={styles.codeLabel}>Код приглашения</Text>
        <Text selectable style={styles.code}>{formatInviteCode(current.code)}</Text>
      </View>
      <Button title="Поделиться ссылкой" onPress={() => share(current.code)} disabled={busy} />
      <View style={styles.inviteActions}>
        <Button title="Новый код" variant="ghost" disabled={busy} onPress={() => create.mutate()} style={styles.flex} />
        <Button title="Отозвать" variant="danger" disabled={busy} onPress={() => revoke.mutate()} style={styles.flex} />
      </View>
    </View>
  );
}

/**
 * Accounts of the household with roles; the owner invites and removes, a member can leave.
 * Collapsed by default: it is rarely needed day to day.
 */
export function AccountsCard({ me }: { me: MeResponse }) {
  const [open, setOpen] = useState(false);
  const isOwner = me.user.role === 'owner';
  const alone = me.accounts.length === 1;

  const onChanged = (data: MeResponse) => {
    queryClient.setQueryData(queryKeys.me, data);
    resetHouseholdData();
  };
  const remove = useMutation({ mutationFn: api.removeAccount, onSuccess: onChanged, onError: showError });
  // One leave at a time: a double tap could confirm twice, and the second request (already out, now the owner
  // of a fresh household) fails with OWNER_CANNOT_LEAVE.
  const leaving = useRef(false);
  const leave = useMutation({
    mutationFn: api.leave,
    onSuccess: onChanged,
    onError: (e) => {
      // OWNER_CANNOT_LEAVE here means an earlier request already moved the account out: just catch up.
      if (apiErrorCode(e) !== ApiErrors.ownerCannotLeave) showError(e);
      void resetHouseholdData();
    },
    onSettled: () => {
      leaving.current = false;
    },
  });
  const doLeave = () => {
    if (leaving.current) return;
    leaving.current = true;
    leave.mutate();
  };

  const confirmRemove = (account: Account) =>
    Alert.alert(
      `Удалить ${account.name} из семьи?`,
      'Копия продуктов останется у аккаунта. Вернуться можно по новому приглашению.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => remove.mutate(account.id) },
      ],
    );

  const confirmLeave = () =>
    Alert.alert('Выйти из семьи?', 'Данные останутся в семье, копия продуктов будет у вас.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: doLeave },
    ]);

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <Text variant="h3" style={styles.flex}>Аккаунты</Text>
        <Text variant="caption" style={styles.tabular}>{me.accounts.length}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <AccountsBody
          me={me}
          isOwner={isOwner}
          alone={alone}
          onRemove={confirmRemove}
          onLeave={confirmLeave}
          leaving={leave.isPending}
        />
      ) : null}
    </Card>
  );
}

function AccountsBody({ me, isOwner, alone, onRemove, onLeave, leaving }: {
  me: MeResponse;
  isOwner: boolean;
  alone: boolean;
  onRemove: (account: Account) => void;
  onLeave: () => void;
  leaving: boolean;
}) {
  // Same cache entry as InviteBlock. While we share our own invite, joining someone else's makes no sense.
  const invite = useQuery({ queryKey: queryKeys.invite, queryFn: api.invite, enabled: isOwner });
  const canJoin = alone && invite.isSuccess && !invite.data;

  return (
    <>
      {me.accounts.map((account, i) => (
        <AccountRow
          key={account.id}
          account={account}
          index={i}
          isMe={account.id === me.user.id}
          onRemove={isOwner && account.id !== me.user.id ? () => onRemove(account) : undefined}
        />
      ))}

      {isOwner ? <InviteBlock /> : null}

      {canJoin ? (
        <View style={styles.inviteActions}>
          <Button
            title="Сканировать QR-код"
            variant="soft"
            onPress={() => router.push({ pathname: '/join', params: { scan: '1' } })}
            style={styles.flex}
          />
          <Button title="Ввести код" variant="ghost" onPress={() => router.push('/join')} style={styles.flex} />
        </View>
      ) : null}
      {!isOwner ? (
        <Button title="Выйти из семьи" variant="danger" disabled={leaving} onPress={onLeave} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  pressed: { opacity: 0.6 },
  tabular: { fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  rowText: { flex: 1, gap: 2 },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, backgroundColor: colors.track },
  badgeOwner: { backgroundColor: colors.primarySoft },
  badgeText: { fontSize: 11, fontFamily: fonts.bodySemibold },
  remove: { paddingHorizontal: spacing.sm },
  invite: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  codeBox: { alignItems: 'center', gap: 2, backgroundColor: colors.bg, borderRadius: radii.lg, padding: spacing.lg },
  codeLabel: { marginTop: spacing.sm },
  code: { fontSize: 26, letterSpacing: 2, fontFamily: fonts.headingHeavy },
  inviteActions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
