import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppText from '../components/AppText';
import Icon from '../components/Icon';
import { useGetSharesOwedToMe, useSendPaymentReminder } from '../services';
import { RootStackParamList } from '../navigations/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'OwedUserShares'>;

type ShareItem = {
  id: string;
  shareAmount: number;
  paidAmount: number;
  user?: {
    id?: string;
    name?: string;
    username?: string;
    imageUrl?: string | null;
  };
  expense?: {
    id?: string;
    note?: string;
    createdAt?: string;
    group?: {
      id?: string;
      name?: string | null;
    } | null;
  };
};

type ShareGroup = {
  id: string;
  name: string;
  items: Array<ShareItem & { outstanding: number }>;
  total: number;
};

const formatMoney = (value: number) => `₹${Number(value || 0).toFixed(2)}`;

const formatDate = (value?: string) => {
  if (!value) return 'Unknown date';
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function OwedUserSharesScreen({ route }: Props) {
  const { fromUserId, fromUserName, totalAmount } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, refetch } = useGetSharesOwedToMe(fromUserId);
  const [sendPaymentReminder, { loading: sendingReminder }] = useSendPaymentReminder({
    onCompleted: () => {
      Alert.alert('Reminder sent', `Payment reminder sent to ${fromUserName}.`);
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const shares: ShareItem[] = useMemo(
    () => data?.getSharesOwedToMe ?? [],
    [data?.getSharesOwedToMe],
  );

  const groupedShares = useMemo<ShareGroup[]>(() => {
    const map = new Map<string, ShareGroup>();

    for (const share of shares) {
      const shareAmount = Number(share.shareAmount) || 0;
      const paidAmount = Number(share.paidAmount) || 0;
      const outstanding = Math.max(shareAmount - paidAmount, 0);

      if (outstanding <= 0) continue;

      const groupId = share.expense?.group?.id || 'personal';
      const groupName = share.expense?.group?.name || 'Personal';
      const existing = map.get(groupId);

      if (existing) {
        existing.total += outstanding;
        existing.items.push({ ...share, outstanding });
        continue;
      }

      map.set(groupId, {
        id: groupId,
        name: groupName,
        total: outstanding,
        items: [{ ...share, outstanding }],
      });
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [shares]);

  const pendingExpenseCount = useMemo(
    () => groupedShares.reduce((sum, group) => sum + group.items.length, 0),
    [groupedShares],
  );

  const totalOutstanding = useMemo(
    () => groupedShares.reduce((sum, group) => sum + group.total, 0),
    [groupedShares],
  );

  const debtor = shares[0]?.user;
  const debtorName = debtor?.name || fromUserName;
  const debtorUsername = debtor?.username || '';
  const debtorImageUrl = debtor?.imageUrl || '';
  const debtorInitial = (debtorName || '?').charAt(0).toUpperCase();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch().catch(() => {});
    setRefreshing(false);
  }, [refetch]);

  const handleSendReminder = () => {
    sendPaymentReminder({
      variables: {
        toUserId: fromUserId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <AppText style={styles.summaryEyebrow}>Awaiting payment</AppText>
            <View style={styles.summaryHint}>
              <Icon name="MoneyWallet" width={14} height={14} color="#15803d" />
              <AppText style={styles.summaryHintText}>Reminder ready</AppText>
            </View>
          </View>

          <View style={styles.personRow}>
            {debtorImageUrl ? (
              <Image source={{ uri: debtorImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <AppText style={styles.avatarFallbackText}>{debtorInitial}</AppText>
              </View>
            )}
            <View style={styles.personInfo}>
              <AppText style={styles.personName}>{debtorName}</AppText>
              <AppText style={styles.personUsername}>
                @{debtorUsername || 'user'}
              </AppText>
            </View>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatCard}>
              <AppText style={styles.summaryStatLabel}>Total owed</AppText>
              <AppText style={styles.summaryStatValue}>
                {formatMoney(totalOutstanding || totalAmount)}
              </AppText>
            </View>
            <View style={styles.summaryStatCard}>
              <AppText style={styles.summaryStatLabel}>Pending items</AppText>
              <AppText style={styles.summaryStatValue}>{pendingExpenseCount}</AppText>
            </View>
          </View>
        </View>

        {loading && shares.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <AppText style={styles.loaderText}>Loading owed transactions...</AppText>
          </View>
        ) : groupedShares.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyTitle}>Nothing pending</AppText>
            <AppText style={styles.emptySubtitle}>
              There are no unsettled shares for this member right now.
            </AppText>
          </View>
        ) : (
          <>
            <AppText style={styles.sectionLabel}>Outstanding by group</AppText>

            {groupedShares.map(group => (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View>
                    <AppText style={styles.groupName}>{group.name}</AppText>
                    <AppText style={styles.groupMeta}>
                      {group.items.length} pending{' '}
                      {group.items.length === 1 ? 'transaction' : 'transactions'}
                    </AppText>
                  </View>
                  <AppText style={styles.groupTotal}>{formatMoney(group.total)}</AppText>
                </View>

                {group.items.map(item => (
                  <View key={item.id} style={styles.transactionRow}>
                    <View style={styles.transactionInfo}>
                      <AppText style={styles.transactionTitle}>
                        {item.expense?.note || 'Expense'}
                      </AppText>
                      <AppText style={styles.transactionDate}>
                        {formatDate(item.expense?.createdAt)}
                      </AppText>
                    </View>
                    <AppText style={styles.transactionAmount}>
                      {formatMoney(item.outstanding)}
                    </AppText>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.reminderBtn,
            (groupedShares.length === 0 || sendingReminder) && styles.reminderBtnDisabled,
          ]}
          onPress={handleSendReminder}
          disabled={groupedShares.length === 0 || sendingReminder}
          activeOpacity={0.88}
        >
          <AppText style={styles.reminderBtnText}>
            {sendingReminder ? 'Sending reminder...' : 'Send Payment Reminder'}
          </AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  summaryCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 18,
    padding: 18,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryEyebrow: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '700',
  },
  summaryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryHintText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '700',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dcfce7',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#166534',
    fontSize: 18,
    fontWeight: '700',
  },
  personInfo: {
    marginLeft: 12,
    flex: 1,
  },
  personName: {
    fontSize: 18,
    color: '#14532d',
    fontWeight: '700',
  },
  personUsername: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  summaryStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  summaryStatLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  summaryStatValue: {
    marginTop: 6,
    fontSize: 16,
    color: '#166534',
    fontWeight: '700',
  },
  loaderWrap: {
    alignItems: 'center',
    marginTop: 36,
  },
  loaderText: {
    marginTop: 8,
    color: '#64748b',
  },
  emptyCard: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eff6ff',
  },
  groupName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  groupMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  groupTotal: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '700',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  transactionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  transactionTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  reminderBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  reminderBtnDisabled: {
    opacity: 0.6,
  },
  reminderBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
