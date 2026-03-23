import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import AppText from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import {
  useGetGroupDetails,
  useGetGroupExpenses,
  useInviteToGroup,
  useSettleExpense,
} from '../services';
import { GET_GROUP_EXPENSES } from '../graphql';
import { useAppSelector } from '../store/hooks';
import {
  openUpiPayment,
  confirmUpiPayment,
  promptForUpiId,
} from '../utility/upiHelper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';
import Icon from '../components/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

const GroupDetail: React.FC<Props> = ({ route, navigation }) => {
  const { groupId } = route.params;
  const { user } = useAppSelector(state => state.auth);

  const {
    data: groupData,
    loading: loadingGroup,
    refetch: refetchGroup,
  } = useGetGroupDetails(groupId);

  const {
    data: expensesData,
    loading: loadingExpenses,
    refetch: refetchExpenses,
  } = useGetGroupExpenses(groupId);

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleUserId, setSettleUserId] = useState('');
  const [settleUserName, setSettleUserName] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('upi');

  const [inviteToGroup, { loading: inviting }] = useInviteToGroup({
    onCompleted: () => {
      setInviteModalVisible(false);
      setInviteEmail('');
      Alert.alert('Success', 'Invitation sent!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const [settleExpense, { loading: settling }] = useSettleExpense({
    refetchQueries: [
      { query: GET_GROUP_EXPENSES, variables: { groupId } },
    ],
    onCompleted: () => {
      setSettleModalVisible(false);
      setSettleAmount('');
      setSettleUserId('');
      Alert.alert('Success', 'Settlement recorded!');
      refetchExpenses();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Email cannot be empty');
      return;
    }
    inviteToGroup({ variables: { groupId, email: inviteEmail.trim() } });
  };

  const handleSettle = async () => {
    const numericAmount = parseFloat(settleAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Amount must be greater than zero');
      return;
    }

    if (selectedPaymentMode === 'upi') {
      // Find payee's UPI ID from group members
      const payeeMember = group?.members?.find(
        (m: any) => m.user.id === settleUserId,
      );
      let payeeUpiId = payeeMember?.user?.upiId;

      if (!payeeUpiId) {
        // Prompt user to enter UPI ID
        const enteredId = await promptForUpiId();
        if (!enteredId) return;
        payeeUpiId = enteredId;
      }

      const payeeName = payeeMember?.user?.name || 'User';

      // Open UPI app
      const opened = await openUpiPayment(
        payeeUpiId,
        payeeName,
        numericAmount,
        `Splitwise+ settlement to ${payeeName}`,
      );
      if (!opened) return;

      // Wait a moment for the app switch, then show confirmation
      setTimeout(async () => {
        const confirmed = await confirmUpiPayment();
        if (confirmed) {
          settleExpense({
            variables: {
              toUserId: settleUserId,
              amount: numericAmount,
              paymentMode: selectedPaymentMode,
              groupId,
            },
          });
        }
      }, 1000);
    } else {
      // Non-UPI: direct settle
      settleExpense({
        variables: {
          toUserId: settleUserId,
          amount: numericAmount,
          paymentMode: selectedPaymentMode,
          groupId,
        },
      });
    }
  };

  const openSettleForUser = (memberId: string, memberName: string) => {
    if (memberId === user?.id) return;
    setSettleUserId(memberId);
    setSettleUserName(memberName);
    setSettleAmount('');
    setSelectedPaymentMode('upi');
    setSettleModalVisible(true);
  };

  if (loadingGroup && !groupData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  const group = groupData?.getGroupDetails;
  const expenses = expensesData?.getGroupExpenses || [];

  if (!group) {
    return (
      <View style={styles.center}>
        <AppText style={styles.errorText}>Group not found</AppText>
      </View>
    );
  }

  // Compute per-member balance within this group's expenses
  const computeMemberBalance = (memberId: string) => {
    let owes = 0; // how much this member owes to the current user
    let owed = 0; // how much current user owes this member
    expenses.forEach((exp: any) => {
      if (exp.createdBy?.id === user?.id) {
        // I created this expense, this member owes me
        const theirShare = exp.shares?.find(
          (s: any) => s.userId === memberId && s.status === 'owed',
        );
        if (theirShare) owes += parseFloat(theirShare.shareAmount) || 0;
      } else if (exp.createdBy?.id === memberId) {
        // They created, I owe them
        const myShare = exp.shares?.find(
          (s: any) => s.userId === user?.id && s.status === 'owed',
        );
        if (myShare) owed += parseFloat(myShare.shareAmount) || 0;
      }
    });
    return { owes, owed };
  };

  const renderMember = ({ item }: any) => {
    const isMe = item.user.id === user?.id;
    const { owes, owed } = isMe
      ? { owes: 0, owed: 0 }
      : computeMemberBalance(item.user.id);
    const net = owes - owed;

    return (
      <TouchableOpacity
        style={styles.memberItem}
        disabled={isMe || net === 0}
        onPress={() => {
          if (net < 0) {
            // I owe them
            openSettleForUser(item.user.id, item.user.name);
          }
        }}
      >
        {item.user.imageUrl ? (
          <Image
            source={{ uri: item.user.imageUrl }}
            style={styles.memberAvatarImage}
          />
        ) : (
          <View style={styles.memberAvatar}>
            <AppText style={styles.memberAvatarText}>
              {item.user.name?.charAt(0).toUpperCase() || '?'}
            </AppText>
          </View>
        )}
        <View style={styles.memberInfo}>
          <AppText style={styles.memberName}>
            {item.user.name}
            {isMe ? ' (You)' : ''}
          </AppText>
          <AppText style={styles.memberUsername}>@{item.user.username}</AppText>
        </View>
        {!isMe && net !== 0 && (
          <View style={styles.balanceBadge}>
            {net > 0 ? (
              <AppText style={styles.balanceOwes}>owes ₹{net.toFixed(0)}</AppText>
            ) : (
              <AppText style={styles.balanceOwed}>
                you owe ₹{Math.abs(net).toFixed(0)}
              </AppText>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderExpense = ({ item }: any) => (
    <TouchableOpacity
      style={styles.expenseCard}
      onPress={() =>
        navigation.navigate('ExpenseDetail', { expenseId: item.id })
      }
    >
      <View style={styles.expenseInfo}>
        <AppText style={styles.expenseDesc}>{item.note || 'Expense'}</AppText>
        <AppText style={styles.expenseBy}>
          by {item.createdBy?.id === user?.id ? 'You' : item.createdBy?.name || 'Unknown'}
        </AppText>
      </View>
      <View style={styles.expenseRight}>
        <AppText style={styles.expenseAmount}>
          {item.currency === 'INR' ? '₹' : item.currency || '₹'}
          {parseFloat(item.totalAmount).toFixed(2)}
        </AppText>
        <AppText style={styles.expenseChevron}>›</AppText>
      </View>
    </TouchableOpacity>
  );

  const listHeader = (
    <View>
      {/* Group Info */}
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <AppText style={styles.groupIconText}>
            {group.name?.charAt(0).toUpperCase()}
          </AppText>
        </View>
        <AppText style={styles.groupName}>{group.name}</AppText>
        {group.description && (
          <AppText style={styles.groupDescription}>{group.description}</AppText>
        )}
      </View>

      {/* Members Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Icon name="Groups" width={20} height={20} color="#1e293b" />
          <AppText style={styles.sectionTitle}>
            Members ({group.members.length})
          </AppText>
        </View>
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => setInviteModalVisible(true)}
        >
          <Icon name="PlusCircle" width={16} height={16} />
          <AppText style={styles.inviteBtnText}>Invite</AppText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={group.members}
        keyExtractor={(item: any) => item.id}
        renderItem={renderMember}
        scrollEnabled={false}
        style={styles.membersList}
      />

      {/* Expenses Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Icon name="MoneyWallet" width={20} height={20} color="#1e293b" />
          <AppText style={styles.sectionTitle}>Expenses ({expenses.length})</AppText>
        </View>
      </View>

      {loadingExpenses && (
        <ActivityIndicator
          size="small"
          color="#667eea"
          style={styles.expenseLoader}
        />
      )}

      {!loadingExpenses && expenses.length === 0 && (
        <View style={styles.emptyExpenses}>
          <Icon name="MoneyWallet" width={40} height={40} color="#94a3b8" />
          <AppText style={styles.emptyText}>No expenses yet</AppText>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        keyExtractor={(item: any) => item.id}
        renderItem={renderExpense}
        ListHeaderComponent={<>{listHeader}</>}
        refreshing={loadingGroup}
        onRefresh={() => {
          refetchGroup();
          refetchExpenses();
        }}
        contentContainerStyle={styles.listContent}
      />

      {/* Invite Modal */}
      <Modal visible={inviteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>Invite Member</AppText>
            <AppTextInput
              style={styles.modalInput}
              placeholder="Enter email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setInviteModalVisible(false)}
                disabled={inviting}
              >
                <AppText style={styles.modalBtnCancelText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSend]}
                onPress={handleInvite}
                disabled={inviting}
              >
                <AppText style={styles.modalBtnSendText}>
                  {inviting ? 'Sending...' : 'Send Invite'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settle Modal */}
      <Modal visible={settleModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>
              💰 Settle with {settleUserName}
            </AppText>

            <AppText style={styles.settleLabel}>Amount</AppText>
            <AppTextInput
              style={styles.modalInput}
              placeholder="0.00"
              value={settleAmount}
              onChangeText={setSettleAmount}
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />

            <AppText style={styles.settleLabel}>Payment Mode</AppText>
            <View style={styles.paymentModes}>
              {['upi', 'cash', 'bank', 'card'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeBtn,
                    selectedPaymentMode === mode && styles.modeBtnSelected,
                  ]}
                  onPress={() => setSelectedPaymentMode(mode)}
                >
                  <AppText
                    style={[
                      styles.modeBtnText,
                      selectedPaymentMode === mode &&
                        styles.modeBtnTextSelected,
                    ]}
                  >
                    {mode.toUpperCase()}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setSettleModalVisible(false)}
                disabled={settling}
              >
                <AppText style={styles.modalBtnCancelText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSend]}
                onPress={handleSettle}
                disabled={settling}
              >
                <AppText style={styles.modalBtnSendText}>
                  {settling ? 'Settling...' : 'Settle'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GroupDetail;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#ef4444' },
  listContent: { paddingBottom: 40 },
  groupHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  groupIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupIconText: { fontSize: 30, fontWeight: '700', color: '#667eea' },
  groupName: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  groupDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '500', color: '#1e293b' },
  inviteBtn: {
    backgroundColor: '#667eea',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inviteBtnText: { color: '#fff', fontSize: 12 },
  membersList: { marginHorizontal: 16 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#e2e8f0',
  },
  memberAvatarText: { fontSize: 14, fontWeight: '500', color: '#667eea' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  memberUsername: { fontSize: 11, color: '#64748b', },
  balanceBadge: {
    paddingVertical: 4,
    borderRadius: 6,
  },
  balanceOwes: {
    fontSize: 10,
    fontWeight: '500',
    color: '#16a34a',
    backgroundColor: '#dcffe7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  balanceOwed: {
    fontSize: 10,
    fontWeight: '500',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  expenseBy: { fontSize: 12, color: '#64748b', marginTop: 4 },
  expenseAmount: { fontSize: 17, fontWeight: '700', color: '#10b981' },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseChevron: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '600',
  },
  expenseLoader: { padding: 20 },
  emptyExpenses: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  modalBtnCancel: { backgroundColor: '#f1f5f9' },
  modalBtnSend: { backgroundColor: '#667eea' },
  modalBtnCancelText: { color: '#475569', fontWeight: '700' },
  modalBtnSendText: { color: '#fff', fontWeight: '700' },
  settleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  paymentModes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modeBtnSelected: { backgroundColor: '#667eea', borderColor: '#4f46e5' },
  modeBtnText: { color: '#475569', fontWeight: '600', fontSize: 12 },
  modeBtnTextSelected: { color: '#fff' },
});
