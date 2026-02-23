import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_GROUP_DETAILS,
  GET_GROUP_EXPENSES,
  GET_MY_BALANCES,
  INVITE_TO_GROUP,
  SETTLE_EXPENSE,
  GET_RECENT_ACTIVITIES,
} from '../graphql';
import { useAppSelector } from '../store/hooks';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

const GroupDetail: React.FC<Props> = ({ route }) => {
  const { groupId } = route.params;
  const { user } = useAppSelector(state => state.auth);

  const {
    data: groupData,
    loading: loadingGroup,
    refetch: refetchGroup,
  } = useQuery<any>(GET_GROUP_DETAILS, { variables: { id: groupId } });

  const {
    data: expensesData,
    loading: loadingExpenses,
    refetch: refetchExpenses,
  } = useQuery<any>(GET_GROUP_EXPENSES, { variables: { groupId } });

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleUserId, setSettleUserId] = useState('');
  const [settleUserName, setSettleUserName] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('upi');

  const [inviteToGroup, { loading: inviting }] = useMutation<any>(
    INVITE_TO_GROUP,
    {
      onCompleted: () => {
        setInviteModalVisible(false);
        setInviteEmail('');
        Alert.alert('Success', 'Invitation sent!');
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message);
      },
    },
  );

  const [settleExpense, { loading: settling }] = useMutation<any>(
    SETTLE_EXPENSE,
    {
      refetchQueries: [
        { query: GET_MY_BALANCES },
        { query: GET_RECENT_ACTIVITIES },
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
    },
  );

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Email cannot be empty');
      return;
    }
    inviteToGroup({ variables: { groupId, email: inviteEmail.trim() } });
  };

  const handleSettle = () => {
    const numericAmount = parseFloat(settleAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Amount must be greater than zero');
      return;
    }
    settleExpense({
      variables: {
        toUserId: settleUserId,
        amount: numericAmount,
        paymentMode: selectedPaymentMode,
      },
    });
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
        <Text style={styles.errorText}>Group not found</Text>
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
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {item.user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.user.name}
            {isMe ? ' (You)' : ''}
          </Text>
          <Text style={styles.memberEmail}>{item.user.email}</Text>
        </View>
        {!isMe && net !== 0 && (
          <View style={styles.balanceBadge}>
            {net > 0 ? (
              <Text style={styles.balanceOwes}>owes ₹{net.toFixed(0)}</Text>
            ) : (
              <Text style={styles.balanceOwed}>
                you owe ₹{Math.abs(net).toFixed(0)}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderExpense = ({ item }: any) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDesc}>{item.note || 'Expense'}</Text>
        <Text style={styles.expenseBy}>
          by {item.createdBy?.name || 'Unknown'}
        </Text>
      </View>
      <Text style={styles.expenseAmount}>
        ₹{parseFloat(item.totalAmount).toFixed(2)}
      </Text>
    </View>
  );

  const ListHeader = () => (
    <View>
      {/* Group Info */}
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>
            {group.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.groupName}>{group.name}</Text>
        {group.description && (
          <Text style={styles.groupDescription}>{group.description}</Text>
        )}
      </View>

      {/* Members Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Members ({group.members.length})
        </Text>
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => setInviteModalVisible(true)}
        >
          <Text style={styles.inviteBtnText}>+ Invite</Text>
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
        <Text style={styles.sectionTitle}>Expenses ({expenses.length})</Text>
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
          <Text style={styles.emptyText}>No expenses yet</Text>
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
        ListHeaderComponent={ListHeader}
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
            <Text style={styles.modalTitle}>Invite Member</Text>
            <TextInput
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
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSend]}
                onPress={handleInvite}
                disabled={inviting}
              >
                <Text style={styles.modalBtnSendText}>
                  {inviting ? 'Sending...' : 'Send Invite'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settle Modal */}
      <Modal visible={settleModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              💰 Settle with {settleUserName}
            </Text>

            <Text style={styles.settleLabel}>Amount</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0.00"
              value={settleAmount}
              onChangeText={setSettleAmount}
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.settleLabel}>Payment Mode</Text>
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
                  <Text
                    style={[
                      styles.modeBtnText,
                      selectedPaymentMode === mode &&
                        styles.modeBtnTextSelected,
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setSettleModalVisible(false)}
                disabled={settling}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSend]}
                onPress={handleSettle}
                disabled={settling}
              >
                <Text style={styles.modalBtnSendText}>
                  {settling ? 'Settling...' : 'Settle'}
                </Text>
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  inviteBtn: {
    backgroundColor: '#667eea',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: '#667eea' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  memberEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  balanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  balanceOwes: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  balanceOwed: {
    fontSize: 12,
    fontWeight: '600',
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
