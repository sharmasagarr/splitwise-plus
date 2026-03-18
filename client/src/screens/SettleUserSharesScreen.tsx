import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppText from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import { useGetUserUnsettledShares, useSettleSpecificShares } from '../services';
import { RootStackParamList } from '../navigations/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'SettleUserShares'>;

type ShareItem = {
  id: string;
  shareAmount: number;
  paidAmount: number;
  expense?: {
    note?: string;
    createdAt?: string;
    group?: { name?: string };
  };
};

const paymentModes = ['upi', 'cash'];

const toMoney = (value: number) => `₹${value.toFixed(2)}`;

export default function SettleUserShares({ route, navigation }: Props) {
  const { toUserId, toUserName, totalAmount } = route.params;

  const [selectedShareIds, setSelectedShareIds] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState('upi');
  const [amount, setAmount] = useState('');

  const { data, loading, refetch } = useGetUserUnsettledShares(toUserId);

  const shares: ShareItem[] = useMemo(
    () => data?.getUserUnsettledShares ?? [],
    [data?.getUserUnsettledShares],
  );

  const outstandingById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const share of shares) {
      const shareAmount = Number(share.shareAmount) || 0;
      const paidAmount = Number(share.paidAmount) || 0;
      map[share.id] = Math.max(shareAmount - paidAmount, 0);
    }
    return map;
  }, [shares]);

  const selectedOutstanding = useMemo(() => {
    return selectedShareIds.reduce((sum, id) => sum + (outstandingById[id] || 0), 0);
  }, [selectedShareIds, outstandingById]);

  const allSelected = shares.length > 0 && selectedShareIds.length === shares.length;

  const [settleSpecificShares, { loading: settling }] = useSettleSpecificShares({
    onCompleted: () => {
      Alert.alert('Success', 'Settlement recorded!');
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const applySelection = (nextIds: string[]) => {
    setSelectedShareIds(nextIds);
    const nextTotal = nextIds.reduce((sum, id) => sum + (outstandingById[id] || 0), 0);
    setAmount(nextTotal > 0 ? String(Number(nextTotal.toFixed(2))) : '');
  };

  const toggleShare = (shareId: string) => {
    const exists = selectedShareIds.includes(shareId);
    const nextIds = exists
      ? selectedShareIds.filter(id => id !== shareId)
      : [...selectedShareIds, shareId];
    applySelection(nextIds);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      applySelection([]);
      return;
    }
    applySelection(shares.map(s => s.id));
  };

  const handleSettle = () => {
    if (selectedShareIds.length === 0) {
      Alert.alert('Error', 'Please select at least one expense share');
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Amount must be greater than zero');
      return;
    }

    if (numericAmount > selectedOutstanding) {
      Alert.alert('Error', 'Amount cannot exceed selected outstanding total');
      return;
    }

    settleSpecificShares({
      variables: {
        shareIds: selectedShareIds,
        amount: numericAmount,
        paymentMode,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <AppText style={styles.summaryTitle}>Paying {toUserName}</AppText>
          <AppText style={styles.summaryAmount}>Total owed: {toMoney(totalAmount)}</AppText>
          <AppText style={styles.summarySub}>Selected: {toMoney(selectedOutstanding)}</AppText>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#667eea" />
            <AppText style={styles.loaderText}>Loading unsettled shares...</AppText>
          </View>
        ) : shares.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText style={styles.emptyTitle}>No unsettled shares</AppText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <AppText style={styles.retryBtnText}>Refresh</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
              <AppText style={styles.selectAllText}>
                {allSelected ? 'Clear Selection' : 'Select All'}
              </AppText>
            </TouchableOpacity>

            <FlatList
              data={shares}
              keyExtractor={item => item.id}
              style={styles.shareList}
              renderItem={({ item }) => {
                const isSelected = selectedShareIds.includes(item.id);
                const outstanding = outstandingById[item.id] || 0;
                return (
                  <TouchableOpacity
                    style={[styles.shareRow, isSelected && styles.shareRowSelected]}
                    onPress={() => toggleShare(item.id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected ? <AppText style={styles.checkboxTick}>✓</AppText> : null}
                    </View>
                    <View style={styles.shareInfo}>
                      <AppText style={styles.shareTitle}>{item.expense?.note || 'Expense'}</AppText>
                      <AppText style={styles.shareMeta}>
                        {item.expense?.group?.name || 'Personal'}
                      </AppText>
                    </View>
                    <AppText style={styles.shareAmount}>{toMoney(outstanding)}</AppText>
                  </TouchableOpacity>
                );
              }}
            />

            <AppText style={styles.label}>Amount to pay</AppText>
            <AppTextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />

            <AppText style={styles.label}>Payment mode</AppText>
            <View style={styles.paymentModes}>
              {paymentModes.map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeBtn, paymentMode === mode && styles.modeBtnSelected]}
                  onPress={() => setPaymentMode(mode)}
                >
                  <AppText
                    style={[styles.modeBtnText, paymentMode === mode && styles.modeBtnTextSelected]}
                  >
                    {mode.toUpperCase()}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.settleBtn, settling && styles.settleBtnDisabled]}
              onPress={handleSettle}
              disabled={settling}
            >
              <AppText style={styles.settleBtnText}>
                {settling ? 'Settling...' : 'Settle Selected Shares'}
              </AppText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 20 },
  summaryCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 16, color: '#b91c1c', fontWeight: '700' },
  summaryAmount: { fontSize: 14, color: '#dc2626', marginTop: 4 },
  summarySub: { fontSize: 13, color: '#7f1d1d', marginTop: 2 },
  loaderContainer: { alignItems: 'center', marginTop: 40 },
  loaderText: { marginTop: 8, color: '#64748b' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { color: '#334155', fontSize: 16, fontWeight: '600' },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryBtnText: { color: '#334155', fontWeight: '600' },
  selectAllBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectAllText: { color: '#4f46e5', fontWeight: '600' },
  shareList: { maxHeight: 300 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  shareRowSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#4f46e5',
  },
  checkboxTick: { color: '#fff', fontWeight: '700' },
  shareInfo: { flex: 1 },
  shareTitle: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  shareMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  shareAmount: { color: '#dc2626', fontWeight: '700' },
  label: {
    marginTop: 14,
    marginBottom: 8,
    color: '#475569',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  paymentModes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modeBtnSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  modeBtnText: { color: '#475569', fontWeight: '600' },
  modeBtnTextSelected: { color: '#fff' },
  settleBtn: {
    marginTop: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  settleBtnDisabled: { opacity: 0.7 },
  settleBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
