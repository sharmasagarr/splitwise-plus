import React, { createContext, useContext, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppText from '../components/AppText';
import SettleSheet from '../components/SettleSheet';
import EditGroupSheet from '../components/EditGroupSheet';
import InviteSheet, {
  type InviteSearchUser,
} from '../components/InviteSheet';
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
import type { RootStackParamList } from '../navigations/RootStack';
import Icon from '../components/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

type GroupDetailTopTabParamList = {
  Members: undefined;
  Expenses: undefined;
};

type MembersTabContentProps = {
  currentUserId?: string;
  members: any[];
  ownerId: string;
  onRefresh: () => void;
  onSettleMember: (memberId: string) => void;
  refreshing: boolean;
  computeMemberBalance: (memberId: string) => { owes: number; owed: number };
};

type ExpensesTabContentProps = {
  expenses: any[];
  loading: boolean;
  onAddExpense: () => void;
  onOpenExpense: (expenseId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  currentUserId?: string;
};

type TabLabelProps = {
  color: string;
  focused: boolean;
};

type TabBarLabelRenderProps = {
  focused: boolean;
  color: string;
  children: string;
};

type GroupDetailTabCountsContextValue = {
  membersCount: number;
  expensesCount: number;
};

const settlePaymentModes = ['upi', 'cash', 'bank', 'card'];
const DetailTab = createMaterialTopTabNavigator<GroupDetailTopTabParamList>();
const GroupDetailTabCountsContext =
  createContext<GroupDetailTabCountsContextValue>({
    membersCount: 0,
    expensesCount: 0,
  });

const MembersTabLabel = ({ color, focused }: TabLabelProps) => {
  const { membersCount } = useContext(GroupDetailTabCountsContext);

  return (
    <View style={styles.tabLabelRow}>
      <Icon name="Groups" width={15} height={15} color={color} />
      <AppText style={[styles.tabLabelText, { color }]}>Members</AppText>
      <View style={[styles.tabCountPill, focused && styles.tabCountPillActive]}>
        <AppText
          style={[
            styles.tabCountText,
            { color },
            focused && styles.tabCountTextActive,
          ]}
        >
          {membersCount}
        </AppText>
      </View>
    </View>
  );
};

const ExpensesTabLabel = ({ color, focused }: TabLabelProps) => {
  const { expensesCount } = useContext(GroupDetailTabCountsContext);

  return (
    <View style={styles.tabLabelRow}>
      <Icon name="MoneyWallet" width={15} height={15} color={color} />
      <AppText style={[styles.tabLabelText, { color }]}>Expenses</AppText>
      <View style={[styles.tabCountPill, focused && styles.tabCountPillActive]}>
        <AppText
          style={[
            styles.tabCountText,
            { color },
            focused && styles.tabCountTextActive,
          ]}
        >
          {expensesCount}
        </AppText>
      </View>
    </View>
  );
};

const renderMembersTabLabel = ({ color, focused }: TabBarLabelRenderProps) => (
  <MembersTabLabel color={color} focused={focused} />
);

const renderExpensesTabLabel = ({ color, focused }: TabBarLabelRenderProps) => (
  <ExpensesTabLabel color={color} focused={focused} />
);

const MembersTabContent = ({
  currentUserId,
  members,
  ownerId,
  onRefresh,
  onSettleMember,
  refreshing,
  computeMemberBalance,
}: MembersTabContentProps) => {
  const renderMember = ({ item }: any) => {
    const isMe = item.user.id === currentUserId;
    const isOwnerMember = item.user.id === ownerId;
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
          onPress={() => onSettleMember(item.user.id)}
          activeOpacity={canSettleMember ? 0.85 : 1}
        >
          <View style={styles.memberAvatarWrap}>
            <View
              style={[
                styles.memberAvatarFrame,
                isOwnerMember && styles.memberAvatarFrameOwner,
              ]}
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
            </View>
            {isOwnerMember ? (
              <View style={styles.memberOwnerBadge}>
                <AppText
                  style={styles.memberOwnerBadgeText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  OWNER
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.memberInfo}>
            <AppText style={styles.memberName}>
              {item.user.name}
              {isMe ? ' (You)' : ''}
            </AppText>
            <View style={styles.memberMetaRow}>
              <AppText style={styles.memberUsername}>
                @{item.user.username || 'user'}
              </AppText>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <FlatList
      data={members}
      keyExtractor={(item: any) => item.id}
      renderItem={renderMember}
      refreshing={refreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabListContent}
    />
  );
};

const ExpensesTabContent = ({
  expenses,
  loading,
  onAddExpense,
  onOpenExpense,
  onRefresh,
  refreshing,
  currentUserId,
}: ExpensesTabContentProps) => {
  const renderExpense = ({ item }: any) => (
    <TouchableOpacity
      style={styles.expenseCard}
      onPress={() => onOpenExpense(item.id)}
      activeOpacity={0.85}
    >
      <View style={styles.expenseInfo}>
        <AppText style={styles.expenseDesc}>{item.note || 'Expense'}</AppText>
        <AppText style={styles.expenseBy}>
          by{' '}
          {item.createdBy?.id === currentUserId
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

  return (
    <FlatList
      data={expenses}
      keyExtractor={(item: any) => item.id}
      renderItem={renderExpense}
      refreshing={refreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabListContent}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator
            size="small"
            color="#667eea"
            style={styles.expenseLoader}
          />
        ) : (
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
              onPress={onAddExpense}
              activeOpacity={0.9}
            >
              <Icon name="PlusSquare" width={16} height={16} color="#ffffff" />
              <AppText style={styles.emptyExpensesBtnText}>
                Add first expense
              </AppText>
            </TouchableOpacity>
          </View>
        )
      }
    />
  );
};

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

  const [inviteSheetVisible, setInviteSheetVisible] = useState(false);
  const [editGroupVisible, setEditGroupVisible] = useState(false);
  const [settleSheetVisible, setSettleSheetVisible] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleUserId, setSettleUserId] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('upi');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const [inviteToGroup, { loading: inviting }] = useInviteToGroup({
    onError: () => {},
  });

  const [removeGroupMember] = useRemoveGroupMember();

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
      setSettleSheetVisible(false);
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
  
  const sortedMembers = [...(group?.members || [])].sort((a: any, b: any) => {
    const aIsOwner = a.user.id === group?.ownerId;
    const bIsOwner = b.user.id === group?.ownerId;
    if (aIsOwner !== bIsOwner) {
      return aIsOwner ? -1 : 1;
    }
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  const editSheetMembers = sortedMembers
    .filter((member: any) => member.user.id !== group.ownerId)
    .map((member: any) => ({
      id: member.user.id,
      name: member.user.name,
      username: member.user.username,
      imageUrl: member.user.imageUrl,
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

  const handleRefresh = () => {
    Promise.allSettled([refetchGroup(), refetchExpenses()]);
  };

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
        setInviteSheetVisible(false);
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

  const handleRemoveMember = async (member: {
    id: string;
    name: string;
    username: string;
    imageUrl?: string | null;
  }) => {
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
    setSettleSheetVisible(true);
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

  return (
    <View style={styles.container}>
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

        <View style={styles.groupActionsRow}>
          {isGroupOwner ? (
            <TouchableOpacity
              style={[styles.groupActionBtn, styles.inviteBtn]}
              onPress={() => setInviteSheetVisible(true)}
              activeOpacity={0.88}
            >
              <Icon name="PlusCircle" width={16} height={16} color="#ffffff" />
              <AppText style={styles.groupActionBtnText}>Invite</AppText>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.groupActionBtn, styles.addExpenseBtn]}
            onPress={handleOpenAddExpense}
            activeOpacity={0.88}
          >
            <Icon name="PlusSquare" width={15} height={15} color="#ffffff" />
            <AppText style={styles.groupActionBtnText}>Add Expense</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <GroupDetailTabCountsContext.Provider
        value={{
          membersCount: sortedMembers.length,
          expensesCount: expenses.length,
        }}
      >
        <View style={styles.tabsContainer}>
          <DetailTab.Navigator
            screenOptions={{
              tabBarActiveTintColor: '#4f46e5',
              tabBarInactiveTintColor: '#64748b',
              tabBarIndicatorStyle: styles.tabBarIndicator,
              tabBarItemStyle: styles.tabBarItem,
              tabBarStyle: styles.tabBar,
              tabBarPressColor: 'transparent',
              lazy: true,
            }}
          >
            <DetailTab.Screen
              name="Members"
              options={{
                tabBarLabel: renderMembersTabLabel,
              }}
            >
              {() => (
                <MembersTabContent
                  currentUserId={user?.id}
                  members={sortedMembers}
                  ownerId={group.ownerId}
                  onRefresh={handleRefresh}
                  onSettleMember={openSettleForUser}
                  refreshing={loadingGroup || loadingExpenses}
                  computeMemberBalance={computeMemberBalance}
                />
              )}
            </DetailTab.Screen>

            <DetailTab.Screen
              name="Expenses"
              options={{
                tabBarLabel: renderExpensesTabLabel,
              }}
            >
              {() => (
                <ExpensesTabContent
                  expenses={expenses}
                  loading={loadingExpenses}
                  onAddExpense={handleOpenAddExpense}
                  onOpenExpense={expenseId =>
                    navigation.navigate('ExpenseDetail', { expenseId })
                  }
                  onRefresh={handleRefresh}
                  refreshing={loadingGroup || loadingExpenses}
                  currentUserId={user?.id}
                />
              )}
            </DetailTab.Screen>
          </DetailTab.Navigator>
        </View>
      </GroupDetailTabCountsContext.Provider>

      <InviteSheet
        visible={inviteSheetVisible}
        onClose={() => setInviteSheetVisible(false)}
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

      <SettleSheet
        visible={settleSheetVisible}
        onClose={() => setSettleSheetVisible(false)}
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
  groupHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
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
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 320,
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
  groupActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  groupActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  inviteBtn: {
    backgroundColor: '#667eea',
  },
  addExpenseBtn: {
    backgroundColor: '#10b981',
  },
  tabsContainer: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    minHeight: 48,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBarItem: {
    padding: 0,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarIndicator: {
    backgroundColor: '#4f46e5',
    height: 3,
    borderRadius: 999,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabelText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 14,
  },
  tabCountPill: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  tabCountPillActive: {
    backgroundColor: '#eef2ff',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
  },
  tabCountTextActive: {
    color: '#4f46e5',
  },
  tabListContent: {
    paddingBottom: 28,
    paddingTop: 14,
  },
  tabSectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  memberItem: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  memberMainPressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarWrap: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  memberAvatarFrame: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#e0e7ff',
  },
  memberAvatarFrameOwner: {
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  memberAvatar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#667eea',
  },
  memberOwnerBadge: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    minWidth: 65,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#60a5fa',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberOwnerBadgeText: {
    color: '#2563eb',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  memberMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberUsername: {
    fontSize: 12,
    color: '#64748b',
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
