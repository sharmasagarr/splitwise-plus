import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppText from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import Icon from '../components/Icon';
import { useGetUserUnsettledShares, useSettleSpecificShares } from '../services';
import { RootStackParamList } from '../navigations/RootStack';
import {
  openUpiPayment,
  confirmUpiPayment,
} from '../utils/upiHelper';

type Props = NativeStackScreenProps<RootStackParamList, 'SettleUserShares'>;

type ShareItem = {
  id: string;
  shareAmount: number;
  paidAmount: number;
  expense?: {
    note?: string;
    createdAt?: string;
    createdBy?: {
      id?: string;
      name?: string;
      username?: string;
      imageUrl?: string | null;
      upiId?: string | null;
    };
    group?: { name?: string };
  };
};

const paymentModes = ['upi', 'cash'];

const toMoney = (value: number) => `₹${value.toFixed(2)}`;

export default function SettleUserShares({ route, navigation }: Props) {
  const { toUserId, toUserName, totalAmount } = route.params;

  const [selectedShareIds, setSelectedShareIds] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState('upi');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [upiModalVisible, setUpiModalVisible] = useState(false);
  const [upiIdInput, setUpiIdInput] = useState('');
  const [pendingUpiSettlement, setPendingUpiSettlement] = useState<{
    shareIds: string[];
    amount: number;
  } | null>(null);

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
  const savedPayeeUpiId = (shares[0]?.expense?.createdBy?.upiId || '').trim();
  const payeeName = shares[0]?.expense?.createdBy?.name || toUserName;
  const payeeUsername = shares[0]?.expense?.createdBy?.username || '';
  const payeeImageUrl = shares[0]?.expense?.createdBy?.imageUrl || '';
  const payeeUpiId = (shares[0]?.expense?.createdBy?.upiId || '').trim();
  const payeeInitial = (payeeName || '?').charAt(0).toUpperCase();

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
    if (nextIds.length === 0) {
      setPaymentModalVisible(false);
    }
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

  const runUpiSettlement = async () => {
    const upiId = upiIdInput.trim();

    if (!pendingUpiSettlement) {
      Alert.alert('Error', 'No pending settlement found');
      return;
    }

    const opened = await openUpiPayment(
      upiId,
      toUserName,
      pendingUpiSettlement.amount,
      `Splitwise+ settlement to ${toUserName}`,
    );
    if (!opened) return;

    setUpiModalVisible(false);

    setTimeout(async () => {
      const confirmed = await confirmUpiPayment();
      if (!confirmed) return;

      settleSpecificShares({
        variables: {
          shareIds: pendingUpiSettlement.shareIds,
          amount: pendingUpiSettlement.amount,
          paymentMode: 'upi',
        },
      });
      setPendingUpiSettlement(null);
    }, 1000);
  };

  const handleSettle = async () => {
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

    const selectedMode = paymentMode.trim().toLowerCase();
    setPaymentModalVisible(false);

    if (selectedMode === 'upi' && alreadyPaid) {
      settleSpecificShares({
        variables: {
          shareIds: [...selectedShareIds],
          amount: numericAmount,
          paymentMode: 'upi',
        },
      });
      return;
    }

    if (selectedMode === 'upi') {
      if (savedPayeeUpiId) {
        setPendingUpiSettlement({
          shareIds: [...selectedShareIds],
          amount: numericAmount,
        });

        const opened = await openUpiPayment(
          savedPayeeUpiId,
          toUserName,
          numericAmount,
          `Splitwise+ settlement to ${toUserName}`,
        );
        if (!opened) return;

        setTimeout(async () => {
          const confirmed = await confirmUpiPayment();
          if (!confirmed) return;

          settleSpecificShares({
            variables: {
              shareIds: [...selectedShareIds],
              amount: numericAmount,
              paymentMode: 'upi',
            },
          });
          setPendingUpiSettlement(null);
        }, 1000);
        return;
      }

      setPendingUpiSettlement({
        shareIds: [...selectedShareIds],
        amount: numericAmount,
      });
      setUpiIdInput('');
      setUpiModalVisible(true);
      return;
    }

    settleSpecificShares({
      variables: {
        shareIds: selectedShareIds,
        amount: numericAmount,
        paymentMode: selectedMode,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <AppText style={styles.summaryTitle}>Paying</AppText>
            <View style={styles.summaryHeaderUpiRow}>
              <Icon name="Wallet" width={13} height={13} color="#9f1239" />
              <AppText style={styles.summaryHeaderUpiText}>
                {payeeUpiId || 'UPI ID not added'}
              </AppText>
            </View>
          </View>
          <View style={styles.payeeRow}>
            {payeeImageUrl ? (
              <Image source={{ uri: payeeImageUrl }} style={styles.payeeAvatar} />
            ) : (
              <View style={styles.payeeAvatarFallback}>
                <AppText style={styles.payeeAvatarFallbackText}>{payeeInitial}</AppText>
              </View>
            )}
            <View style={styles.payeeTextWrap}>
              <AppText style={styles.payeeName}>{payeeName}</AppText>
              <AppText style={styles.payeeUsername}>@{payeeUsername || 'user'}</AppText>
            </View>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatBox}>
              <AppText style={styles.summaryStatLabel}>Owed</AppText>
              <AppText style={styles.summaryStatValue}>{toMoney(totalAmount)}</AppText>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatBox}>
              <AppText style={styles.summaryStatLabel}>Selected</AppText>
              <AppText style={styles.summaryStatValue}>{toMoney(selectedOutstanding)}</AppText>
            </View>
          </View>
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
          <View style={styles.selectionArea}>
            <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
              <AppText style={styles.selectAllText}>
                {allSelected ? 'Clear Selection' : 'Select All'}
              </AppText>
            </TouchableOpacity>

            <FlatList
              data={shares}
              keyExtractor={item => item.id}
              style={styles.shareList}
              contentContainerStyle={[
                selectedShareIds.length > 0
                  ? styles.shareListContentWithProceed
                  : styles.shareListContent,
              ]}
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

            {selectedShareIds.length > 0 ? (
              <TouchableOpacity
                style={styles.proceedBtn}
                onPress={() => setPaymentModalVisible(true)}
              >
                <AppText style={styles.proceedBtnText}>Proceed</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => setPaymentModalVisible(false)}
          />
          <View style={styles.bottomSheetCard}>
            <View style={styles.bottomSheetHandle} />
            <AppText style={styles.modalTitle}>Complete Settlement</AppText>
            <AppText style={styles.modalSubtitle}>
              Choose amount and payment mode.
            </AppText>

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

            <View style={styles.alreadyPaidRow}>
              <TouchableOpacity
                style={styles.alreadyPaidToggle}
                onPress={() => setAlreadyPaid(prev => !prev)}
              >
                <View
                  style={[
                    styles.alreadyPaidCheckbox,
                    alreadyPaid && styles.alreadyPaidCheckboxSelected,
                  ]}
                >
                  {alreadyPaid ? (
                    <AppText style={styles.alreadyPaidCheckboxTick}>✓</AppText>
                  ) : null}
                </View>
                <AppText style={styles.alreadyPaidText}>Already paid</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.infoBtn}
                onPress={() =>
                  Alert.alert(
                    'Already Paid',
                    'Enable this if you have already paid outside the app. For UPI mode, settlement will be recorded directly without opening payment apps.',
                  )
                }
              >
                <AppText style={styles.infoBtnText}>i</AppText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.settleBtn, settling && styles.settleBtnDisabled]}
              onPress={handleSettle}
              disabled={settling}
            >
              <AppText style={styles.settleBtnText}>
                {settling ? 'Settling...' : 'Settle Shares'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={upiModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUpiModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>Enter Payee UPI ID</AppText>
            <AppText style={styles.modalSubtitle}>
              Enter the receiver UPI ID to continue.
            </AppText>
            <AppTextInput
              style={styles.modalInput}
              value={upiIdInput}
              onChangeText={setUpiIdInput}
              placeholder="name@upi"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setUpiModalVisible(false)}
              >
                <AppText style={styles.modalBtnSecondaryText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={runUpiSettlement}
              >
                <AppText style={styles.modalBtnPrimaryText}>Continue</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0 },
  summaryCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: { fontSize: 12, color: '#b91c1c' },
  summaryHeaderUpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '70%',
  },
  summaryHeaderUpiText: {
    fontSize: 11,
    color: '#9f1239',
  },
  payeeRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
  },
  payeeAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payeeAvatarFallbackText: {
    color: '#991b1b',
    fontSize: 16,
    fontWeight: '700',
  },
  payeeTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  payeeName: {
    fontSize: 16,
    color: '#7f1d1d',
  },
  payeeUsername: {
    fontSize: 12,
    color: '#9f1239',
    marginTop: 2,
  },
  summaryStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  summaryStatBox: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  summaryStatLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  summaryStatValue: {
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '700',
    marginTop: 1,
  },
  summaryStatDivider: {
    width: 8,
  },
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectAllText: { color: '#4f46e5', fontSize: 12 },
  selectionArea: {
    flex: 1,
    position: 'relative',
  },
  shareList: {
    flex: 1,
  },
  shareListContent: {
    paddingBottom: 12,
  },
  shareListContentWithProceed: {
    paddingBottom: 84,
  },
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
  proceedBtn: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  proceedBtnText: {
    color: '#fff',
    fontSize: 14,
  },
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
  alreadyPaidRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alreadyPaidToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alreadyPaidCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  alreadyPaidCheckboxSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  alreadyPaidCheckboxTick: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  alreadyPaidText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  infoBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  settleBtn: {
    marginTop: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  settleBtnDisabled: { opacity: 0.7 },
  settleBtnText: { color: '#fff', fontSize: 14},
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  bottomSheetOverlay: {
    flex: 1,
  },
  bottomSheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: '72%',
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    marginBottom: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#475569',
    fontSize: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalBtnSecondary: {
    backgroundColor: '#e2e8f0',
  },
  modalBtnSecondaryText: {
    color: '#334155',
    fontWeight: '600',
  },
  modalBtnPrimary: {
    backgroundColor: '#4f46e5',
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
