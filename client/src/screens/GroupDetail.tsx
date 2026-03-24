import React, { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AppText from '../components/AppText';
import AppModal from '../components/Modal';
import SettleModal from '../components/SettleModal';
import EditGroupSheet from '../components/EditGroupSheet';
import InviteModal, {
  type InviteSearchUser,
} from '../components/InviteModal';
import {
  useGetGroupDetails,
  useGetGroupExpenses,
  useInviteToGroup,
  useRemoveGroupMember,
  useSettleExpense,
  useUpdateGroup,
} from '../services';
import { GET_GROUP_DETAILS, GET_GROUP_EXPENSES, GET_GROUPS } from '../graphql';
import { useAppSelector } from '../store/hooks';
import {
  confirmUpiPayment,
  openUpiPayment,
  promptForUpiId,
} from '../utility/upiHelper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';
import Icon from '../components/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

const settlePaymentModes = ['upi', 'cash', 'bank', 'card'];

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
  const [editGroupVisible, setEditGroupVisible] = useState(false);
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleUserId, setSettleUserId] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('upi');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<null | { id: string; name: string; username: string; imageUrl?: string | null }>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const [inviteToGroup, { loading: inviting }] = useInviteToGroup({
    onError: () => {},
  });

  const [removeGroupMember, { loading: removingMember }] = useRemoveGroupMember();

  const [updateGroup, { loading: updatingGroup }] = useUpdateGroup({
    onCompleted: async () => {
      setEditGroupVisible(false);
      await refetchGroup();
      Alert.alert('Success', 'Group updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const [settleExpense, { loading: settling }] = useSettleExpense({
    refetchQueries: [{ query: GET_GROUP_EXPENSES, variables: { groupId } }],
    onCompleted: () => {
      setSettleModalVisible(false);
      setSettleAmount('');
      setSettleUserId('');
      setSelectedPaymentMode('upi');
      setAlreadyPaid(false);
      Alert.alert('Success', 'Settlement recorded!');
      refetchExpenses();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const group = groupData?.getGroupDetails;
  const expenses = expensesData?.getGroupExpenses || [];
  const isGroupOwner = group?.ownerId === user?.id;
  const ownerMember = group?.members?.find(
    (member: any) => member.user.id === group.ownerId,
  );
  const ownerDisplayName =
    ownerMember?.user?.id === user?.id
      ? 'You'
      : ownerMember?.user?.name || 'Unknown';
  const sortedMembers = [...(group?.members || [])].sort((a: any, b: any) => {
    const aIsOwner = a.user.id === group?.ownerId;
    const bIsOwner = b.user.id === group?.ownerId;
    if (aIsOwner !== bIsOwner) {
      return aIsOwner ? -1 : 1;
    }
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  // For EditGroupSheet
  const editSheetMembers = sortedMembers
    .filter((m: any) => m.user.id !== group.ownerId) // Don't allow removing owner
    .map((m: any) => ({
      id: m.user.id,
      name: m.user.name,
      username: m.user.username,
      imageUrl: m.user.imageUrl,
    }));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isGroupOwner
        ? () => (
            <TouchableOpacity
              style={styles.headerEditBtn}
              onPress={() => setEditGroupVisible(true)}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="Pencil" width={13} height={13} color="#4f46e5" />
              <AppText style={styles.headerEditBtnText}>Edit</AppText>
            </TouchableOpacity>
          )
        : () => null,
    });
  }, [isGroupOwner, navigation]);

  if (loadingGroup && !groupData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.center}>
        <AppText style={styles.errorText}>Group not found</AppText>
      </View>
    );
  }

  const handleInviteUsers = async (selectedUsers: InviteSearchUser[]) => {
    if (!isGroupOwner) {
      Alert.alert('Permission denied', 'Only the group creator can invite members.');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Select at least one user to invite.');
      return;
    }

    try {
      const uniqueUserIds = Array.from(
        new Set(selectedUsers.map(userToInvite => userToInvite.id)),
      );

      const { data } = await inviteToGroup({
        variables: { groupId, userIds: uniqueUserIds },
      });

      const successCount = data?.inviteToGroup?.length || 0;

      if (successCount > 0) {
        setInviteModalVisible(false);
      }

      if (successCount === uniqueUserIds.length) {
        Alert.alert(
          'Success',
          `Invitation${successCount > 1 ? 's' : ''} sent to ${successCount} user${successCount > 1 ? 's' : ''}.`,
        );
        return;
      }

      if (successCount > 0) {
        Alert.alert(
          'Partial Success',
          `${successCount} invitation${successCount > 1 ? 's were' : ' was'} sent. Some selected users may already be members or already have pending invites.`,
        );
        return;
      }

      Alert.alert('Error', 'No invitations were sent.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitations.');
    }
  };

  const handleSaveGroup = (values: {
    name: string;
    description: string;
    imageUrl: string | null;
  }) => {
    if (!isGroupOwner) {
      Alert.alert('Permission denied', 'Only the group creator can edit this group.');
      return;
    }

    updateGroup({
      variables: {
        id: groupId,
        name: values.name,
        description: values.description.trim() || null,
        imageUrl: values.imageUrl,
      },
    });
  };

  const handleRemoveMember = async (member: { id: string; name: string; username: string; imageUrl?: string | null }) => {
    setRemovingMemberId(member.id);
    try {
      await removeGroupMember({
        variables: {
          groupId,
          memberUserId: member.id,
        },
        refetchQueries: [
          { query: GET_GROUP_DETAILS, variables: { id: groupId } },
          { query: GET_GROUPS },
        ],
        awaitRefetchQueries: true,
      });
      Alert.alert('Success', `${member.name} was removed from the group.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleSettle = async () => {
    const numericAmount = parseFloat(settleAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Amount must be greater than zero');
      return;
    }

    if (selectedPaymentMode === 'upi' && alreadyPaid) {
      settleExpense({
        variables: {
          toUserId: settleUserId,
          amount: numericAmount,
          paymentMode: selectedPaymentMode,
          groupId,
        },
      });
      return;
    }

    if (selectedPaymentMode === 'upi') {
      const payeeMember = group.members?.find(
        (member: any) => member.user.id === settleUserId,
      );
      let payeeUpiId = payeeMember?.user?.upiId;

      if (!payeeUpiId) {
        const enteredId = await promptForUpiId();
        if (!enteredId) return;
        payeeUpiId = enteredId;
      }

      const payeeName = payeeMember?.user?.name || 'User';
      const opened = await openUpiPayment(
        payeeUpiId,
        payeeName,
        numericAmount,
        `Splitwise+ settlement to ${payeeName}`,
      );

      if (!opened) {
        return;
      }

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
      return;
    }

    settleExpense({
      variables: {
        toUserId: settleUserId,
        amount: numericAmount,
        paymentMode: selectedPaymentMode,
        groupId,
      },
    });
  };

  const openSettleForUser = (memberId: string) => {
    if (memberId === user?.id) {
      return;
    }

    setSettleUserId(memberId);
    setSettleAmount('');
    setSelectedPaymentMode('upi');
    setAlreadyPaid(false);
    setSettleModalVisible(true);
  };

  const handleOpenAddExpense = () => {
    navigation.navigate('MainTabs', {
      screen: 'Add',
      params: {
        screen: 'AddExpense',
      },
    });
  };

  const computeMemberBalance = (memberId: string) => {
    let owes = 0;
    let owed = 0;

    expenses.forEach((expense: any) => {
      if (expense.createdBy?.id === user?.id) {
        const theirShare = expense.shares?.find(
          (share: any) => share.userId === memberId && share.status === 'owed',
        );
        if (theirShare) {
          owes += parseFloat(theirShare.shareAmount) || 0;
        }
      } else if (expense.createdBy?.id === memberId) {
        const myShare = expense.shares?.find(
          (share: any) => share.userId === user?.id && share.status === 'owed',
        );
        if (myShare) {
          owed += parseFloat(myShare.shareAmount) || 0;
        }
      }
    });

    return { owes, owed };
  };

  // Remove open Remove button from member list
  const renderMember = ({ item }: any) => {
    const isMe = item.user.id === user?.id;
    const isOwnerMember = item.user.id === group.ownerId;
    const { owes, owed } = isMe
      ? { owes: 0, owed: 0 }
      : computeMemberBalance(item.user.id);
    const net = owes - owed;
    const canSettleMember = !isMe && net < 0;

    return (
      <View style={styles.memberItem}>
        <TouchableOpacity
          style={styles.memberMainPressable}
          disabled={!canSettleMember}
          onPress={() => openSettleForUser(item.user.id)}
          activeOpacity={canSettleMember ? 0.85 : 1}
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
            <View style={styles.memberMetaRow}>
              <AppText style={styles.memberUsername}>
                @{item.user.username || 'user'}
              </AppText>
              {isOwnerMember ? (
                <View style={styles.ownerBadge}>
                  <AppText style={styles.ownerBadgeText}>Owner</AppText>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
        {/* Remove button is now only in EditGroupSheet */}
      </View>
    );
  };

  const renderExpense = ({ item }: any) => (
    <TouchableOpacity
      style={styles.expenseCard}
      onPress={() => navigation.navigate('ExpenseDetail', { expenseId: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.expenseInfo}>
        <AppText style={styles.expenseDesc}>{item.note || 'Expense'}</AppText>
        <AppText style={styles.expenseBy}>
          by{' '}
          {item.createdBy?.id === user?.id
            ? 'You'
            : item.createdBy?.name || 'Unknown'}
        </AppText>
      </View>
      <View style={styles.expenseRight}>
        <AppText style={styles.expenseAmount}>
          {item.currency === 'INR' ? '\u20B9' : item.currency || '\u20B9'}
          {parseFloat(item.totalAmount).toFixed(2)}
        </AppText>
        <AppText style={styles.expenseChevron}>{'›'}</AppText>
      </View>
    </TouchableOpacity>
  );

  const listHeader = (
    <View>
      <View style={styles.groupHeader}>
        {group.imageUrl ? (
          <Image source={{ uri: group.imageUrl }} style={styles.groupImage} />
        ) : (
          <View style={styles.groupIcon}>
            <AppText style={styles.groupIconText}>
              {group.name?.charAt(0).toUpperCase()}
            </AppText>
          </View>
        )}
        <AppText style={styles.groupName}>{group.name}</AppText>
        {group.description ? (
          <AppText style={styles.groupDescription}>{group.description}</AppText>
        ) : null}
        <View style={styles.ownerInfoPill}>
          <Icon name="UserCheck" width={14} height={14} color="#4f46e5" />
          <AppText style={styles.ownerInfoText}>Owner: {ownerDisplayName}</AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Icon name="Groups" width={20} height={20} color="#1e293b" />
          <AppText style={styles.sectionTitle}>
            Members ({group.members.length})
          </AppText>
        </View>
        {isGroupOwner ? (
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => setInviteModalVisible(true)}
            activeOpacity={0.85}
          >
            <Icon name="PlusCircle" width={16} height={16} />
            <AppText style={styles.inviteBtnText}>Invite</AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={sortedMembers}
        keyExtractor={(item: any) => item.id}
        renderItem={renderMember}
        scrollEnabled={false}
        style={styles.membersList}
      />

      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Icon name="MoneyWallet" width={20} height={20} color="#1e293b" />
          <AppText style={styles.sectionTitle}>Expenses ({expenses.length})</AppText>
        </View>
        <TouchableOpacity
          style={styles.addExpenseBtn}
          onPress={handleOpenAddExpense}
          activeOpacity={0.85}
        >
          <Icon name="PlusSquare" width={15} height={15} color="#ffffff" />
          <AppText style={styles.addExpenseBtnText}>Add Expense</AppText>
        </TouchableOpacity>
      </View>

      {loadingExpenses ? (
        <ActivityIndicator
          size="small"
          color="#667eea"
          style={styles.expenseLoader}
        />
      ) : null}

      {!loadingExpenses && expenses.length === 0 ? (
        <View style={styles.emptyExpensesCard}>
          <View style={styles.emptyExpensesIconWrap}>
            <Icon name="Bill" width={30} height={30} color="#4f46e5" />
          </View>
          <AppText style={styles.emptyExpensesTitle}>No expenses yet</AppText>
          <AppText style={styles.emptyExpensesSubtitle}>
            Start this group off with the first shared expense so balances and
            repayments show up here.
          </AppText>
          <TouchableOpacity
            style={styles.emptyExpensesBtn}
            onPress={handleOpenAddExpense}
            activeOpacity={0.9}
          >
            <Icon name="PlusSquare" width={16} height={16} color="#ffffff" />
            <AppText style={styles.emptyExpensesBtnText}>
              Add first expense
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        keyExtractor={(item: any) => item.id}
        renderItem={renderExpense}
        ListHeaderComponent={listHeader}
        refreshing={loadingGroup || loadingExpenses}
        onRefresh={() => {
          refetchGroup();
          refetchExpenses();
        }}
        contentContainerStyle={styles.listContent}
      />

      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        onInviteUsers={handleInviteUsers}
        inviting={inviting}
        groupName={group.name}
        excludedUserIds={group.members.map((member: any) => member.user.id)}
      />

      <EditGroupSheet
        visible={editGroupVisible}
        onClose={() => setEditGroupVisible(false)}
        initialName={group.name}
        initialDescription={group.description}
        initialImageUrl={group.imageUrl}
        saving={updatingGroup}
        onSave={handleSaveGroup}
        members={editSheetMembers}
        onRemoveMember={handleRemoveMember}
        removingMemberId={removingMemberId}
      />

      <AppModal
        visible={Boolean(memberToRemove)}
        onClose={() => {
          if (!removingMember) {
            setMemberToRemove(null);
          }
        }}
        closeOnBackdropPress={!removingMember}
        title="Remove Member"
        description={
          memberToRemove
            ? `Remove ${memberToRemove.name} from this group? They will lose access to this group and its chat.`
            : ''
        }
        secondaryButton={{
          text: 'Cancel',
          onPress: () => setMemberToRemove(null),
          disabled: removingMember,
        }}
        primaryButton={{
          text: removingMember ? 'Removing...' : 'Remove',
          variant: 'danger',
          onPress: handleRemoveMember,
          disabled: removingMember,
        }}
      />

      <SettleModal
        visible={settleModalVisible}
        onClose={() => setSettleModalVisible(false)}
        amount={settleAmount}
        setAmount={setSettleAmount}
        paymentMode={selectedPaymentMode}
        setPaymentMode={setSelectedPaymentMode}
        alreadyPaid={alreadyPaid}
        setAlreadyPaid={setAlreadyPaid}
        settling={settling}
        onSettle={handleSettle}
        paymentModes={settlePaymentModes}
      />
    </View>
  );
};

export default GroupDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  listContent: {
    paddingBottom: 40,
  },
  groupHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerEditBtn: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerEditBtnText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '500',
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
  groupImage: {
    width: 88,
    height: 88,
    borderRadius: 24,
    marginBottom: 12,
    backgroundColor: '#e2e8f0',
  },
  groupIconText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#667eea',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  groupDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  ownerInfoPill: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerInfoText: {
    color: '#4338ca',
    fontSize: 12,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  inviteBtn: {
    backgroundColor: '#667eea',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addExpenseBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addExpenseBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  membersList: {
    marginHorizontal: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  memberMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  memberMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  memberUsername: {
    fontSize: 11,
    color: '#64748b',
  },
  ownerBadge: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ownerBadgeText: {
    color: '#4338ca',
    fontSize: 10,
    fontWeight: '700',
  },
  memberActions: {
    marginLeft: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  balanceBadge: {
    paddingVertical: 4,
    borderRadius: 6,
  },
  balanceOwes: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
    backgroundColor: '#dcffe7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  balanceOwed: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  removeMemberBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  removeMemberBtnDisabled: {
    opacity: 0.6,
  },
  removeMemberBtnText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700',
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  expenseBy: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10b981',
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseChevron: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '700',
  },
  expenseLoader: {
    padding: 20,
  },
  emptyExpensesCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  emptyExpensesIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 34,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyExpensesTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyExpensesSubtitle: {
    fontSize: 10,
    lineHeight: 21,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyExpensesBtn: {
    marginTop: 22,
    backgroundColor: '#10b981',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyExpensesBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
