import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useAppSelector } from '../store/hooks';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';
import {
  openUpiPayment,
  confirmUpiPayment,
} from '../utility/upiHelper';
import ProfileCard from '../components/ProfileCard';
import {
  useGetRecentActivities,
  useGetGroups,
  useGetMyInvites,
  useGetMyBalances,
  useSettleExpense,
  useRespondToInvite,
} from '../services';
import LineChartComponent from '../components/LineChart';
import Icon from '../components/Icon';
import ActivityItem from '../components/ActivityItem';
import SettleSheet from '../components/SettleSheet';

const Home: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, loading, refetch } = useGetRecentActivities();

  const { data: groupsData } = useGetGroups();

  const { data: invitesData, refetch: refetchInvites } = useGetMyInvites();

  const [settleExpense, { loading: settling }] = useSettleExpense({
    onCompleted: () => {
      Alert.alert('Success', 'Expense settled successfully!');
      setModalVisible(false);
      setAmount('');
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const [respondToInvite] = useRespondToInvite({
    onCompleted: () => {
      refetchInvites();
      Alert.alert('Success', 'Invitation updated!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('upi');
  const [groupId, setGroupId] = useState<string>('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  const activities = data?.getRecentActivities || [];
  const groups = groupsData?.getGroups || [];
  const invites = invitesData?.getMyInvites || [];

  // Fetch server-computed balances
  const { data: balancesData } = useGetMyBalances();
  const totalOwe = balancesData?.getMyBalances?.totalOwe || 0;
  const totalOwed = balancesData?.getMyBalances?.totalOwed || 0;

  // Show loading state while user data is being fetched
  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </SafeAreaView>
    );
  }

  const handleSettle = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than zero');
      return;
    }
    const validModes = ['cash', 'upi'];
    if (!validModes.includes(paymentMode.toLowerCase())) {
      Alert.alert(
        'Validation Error',
        'Invalid payment mode. Use cash, upi, bank, or card.',
      );
      return;
    }

    const mode = paymentMode.toLowerCase();

    if (mode === 'upi') {
      if (alreadyPaid) {
        settleExpense({
          variables: {
            toUserId: selectedUserId,
            amount: numAmount,
            paymentMode: mode,
            groupId: groupId,
          },
        });
        return;
      }

      const payeeActivity = activities.find((a: any) => a.createdBy?.id === selectedUserId);
      const payeeUpiId = payeeActivity?.createdBy?.upiId;
      const payeeName = payeeActivity?.createdBy?.name || 'User';

      if (!payeeUpiId) {
        Alert.alert(
          'Missing UPI ID',
          `${payeeName} has not added a UPI ID to their profile. You cannot use the automatic UPI flow here. Check "Already paid" or use "Cash Mode" if you paid them manually.`,
        );
        return;
      }

      const opened = await openUpiPayment(
        payeeUpiId,
        payeeName,
        numAmount,
        'Splitwise+ Settlement',
      );
      if (!opened) return;

      setTimeout(async () => {
        const confirmed = await confirmUpiPayment();
        if (confirmed) {
          settleExpense({
            variables: {
              toUserId: selectedUserId,
              amount: numAmount,
              paymentMode: mode,
              groupId: groupId,
            },
          });
        }
      }, 1000);
    } else {
      settleExpense({
        variables: {
          toUserId: selectedUserId,
          amount: numAmount,
          paymentMode: mode,
          groupId: groupId,
        },
      });
    }
  };

  const openSettleSheet = (toUserId: string, defaultAmount: number, currentGroupId: string) => {
    setSelectedUserId(toUserId);
    setAmount(defaultAmount.toString());
    setGroupId(currentGroupId);
    setModalVisible(true);
  };

  const handleAcceptInvite = (inviteId: string) => {
    respondToInvite({ variables: { inviteId, accept: true } });
  };

  const handleRejectInvite = (inviteId: string) => {
    Alert.alert('Reject Invite', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          respondToInvite({ variables: { inviteId, accept: false } }),
      },
    ]);
  };

  const renderActivity = ({ item }: { item: any }) => (
    <ActivityItem
      item={item}
      currentUser={user}
      onSettle={openSettleSheet}
    />
  );

  const emptyStateMessage =
    groups.length === 0
      ? 'Create a group and add your first shared expense to start tracking balances.'
      : 'Add an expense or settlement from the Add tab and your latest updates will show up here.';

  const emptyState = !loading ? (
    <View style={styles.emptyStateWrap}>
      <View style={styles.emptyStateCard}>
        <View style={styles.emptyStateIcon}>
          <Icon name="Bill" width={28} height={28} color="#4f46e5" />
        </View>
        <AppText style={styles.emptyStateTitle}>No activity yet</AppText>
        <AppText style={styles.emptyStateSubtitle}>{emptyStateMessage}</AppText>

        {groups.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyStatePrimaryBtn}
            onPress={() => navigation.navigate('CreateGroup')}
            activeOpacity={0.85}
          >
            <Icon name="PlusSquare" width={16} height={16} color="#ffffff" />
            <AppText style={styles.emptyStatePrimaryText}>
              Create your first group
            </AppText>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyStateHintRow}>
            <AppText style={styles.emptyStateHint}>
              Your next split, payment, or settlement will appear here.
            </AppText>
          </View>
        )}
      </View>
    </View>
  ) : null;

  const listHeader = (
    <View style={styles.content}>
      <View style={styles.profileCardWrapper}>
        <ProfileCard
          name={user.name}
          username={user.username}
          imageUrl={user.imageUrl}
          groupsCount={groups.length}
          amountOwe={`₹${totalOwe.toFixed(0)}`}
          amountOwed={`₹${totalOwed.toFixed(0)}`}
        />
      </View>

      {/* Spending Chart */}
      {activities.length > 0 &&
        (() => {
          // Build last 7 days spending data
          const days: { label: string; amount: number }[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayLabel = d.toLocaleDateString([], { weekday: 'short' });
            const dayStr = d.toDateString();
            let dayTotal = 0;
            activities.forEach((exp: any) => {
              const expDate = new Date(Number(exp.createdAt));
              if (expDate.toDateString() === dayStr) {
                const myShare = exp.shares?.find(
                  (s: any) => s.userId === user.id,
                );
                if (myShare) dayTotal += parseFloat(myShare.shareAmount) || 0;
              }
            });
            days.push({ label: dayLabel, amount: dayTotal });
          }
          const rawMax = Math.max(...days.map(d => d.amount), 1);

          // Round to a clean number (like 100, 200, 500)
          const step = Math.ceil(rawMax / 4 / 50) * 50;
          const maxAmount = step * 4;

          return (
            <View style={styles.cardChart}>
              <View style={styles.chartTitle}>
                <Icon name="Graph" width={20} height={20} />
                <AppText style={styles.chartTitleText}>Spending (Last 7 days)</AppText>
              </View>
              <View style={styles.chartResponsiveWrapper}>
                <LineChartComponent
                  data={days.map(d => ({
                    value: d.amount,
                    label: d.label,
                  }))}
                  maxValue={maxAmount}
                />
              </View>
            </View>
          );
        })()
      }

      {/* Pending Invitations */}
      {invites.length > 0 && (
        <View style={styles.invitesSection}>
          <View style={styles.invitesSectionHeader}>
            <Icon name="Invitation" width={20} height={20} color="#92400e" />
            <AppText style={styles.invitesSectionTitle}>
              Pending Invitations ({invites.length})
            </AppText>
          </View>
          {invites.map((invite: any) => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteInfo}>
                <AppText style={styles.inviteGroupName}>
                  {invite.group?.name || 'Unknown Group'}
                </AppText>
                <AppText style={styles.inviteMembers}>
                  {invite.group?.members?.length || 0} members
                </AppText>
              </View>
              <View style={styles.inviteActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptInvite(invite.id)}
                >
                  <AppText style={styles.acceptBtnText}>Accept</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleRejectInvite(invite.id)}
                >
                  <AppText style={styles.rejectBtnText}>Reject</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <AppText style={styles.sectionTitle}>Recent Activity</AppText>
        <TouchableOpacity
          style={styles.viewAllTxBtn}
          onPress={() => navigation.navigate('Transactions')}
          activeOpacity={0.85}
        >
          <AppText style={styles.viewAllTxText}>All Transactions</AppText>
          <AppText style={styles.viewAllTxArrow}>›</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        keyExtractor={(item: any) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              refetch();
              refetchInvites();
            }}
          />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        renderItem={renderActivity}
        contentContainerStyle={[
          styles.listContainer,
          activities.length === 0 && styles.emptyListContainer,
        ]}
      />

      <SettleSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        amount={amount}
        setAmount={setAmount}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
        alreadyPaid={alreadyPaid}
        setAlreadyPaid={setAlreadyPaid}
        settling={settling}
        onSettle={handleSettle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartResponsiveWrapper: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardChart: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  container: { backgroundColor: '#f8fafc', flex: 1, },
  content: { paddingHorizontal: 15, paddingTop: 10 },
  profileCardWrapper: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '700',
  },
  viewAllTxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  viewAllTxText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
  },
  viewAllTxArrow: {
    color: '#0369a1',
    fontSize: 10,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  activityDesc: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 4,
  },
  activityOwed: { fontSize: 10, marginBottom: 4 },
  activityDate: { fontSize: 10, color: '#94a3b8' },
  activityOwedGreen: { color: '#10b981' },
  activityOwedRed: { color: '#ef4444' },
  activityContent: { flex: 1 },
  settleBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settleText: { color: '#fff', fontSize: 10 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingContainer: { alignItems: 'center', padding: 32 },
  placeholderSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginHorizontal: 15,
  },
  placeholderText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  // Invitations
  invitesSection: {
    marginTop: 16,
    marginBottom:16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  invitesSectionHeader:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  invitesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  inviteInfo: { flex: 1 },
  inviteGroupName: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  inviteMembers: { fontSize: 11, color: '#64748b', marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: { color: '#fff', fontSize: 11 },
  rejectBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: { color: '#dc2626', fontSize: 11 },
  listContainer: { paddingBottom: 40 },
  emptyListContainer: { flexGrow: 1 },
  emptyStateWrap: {
    paddingHorizontal: 15,
    paddingTop: 4,
    paddingBottom: 24,
  },
  emptyStateCard: {
    minHeight: 220,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  emptyStateIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    lineHeight: 21,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyStatePrimaryBtn: {
    marginTop: 22,
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyStatePrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyStateHintRow: {
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#4338ca',
    textAlign: 'center',
  },
  // Spending chart
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chartTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  chartTitleText: {
    fontSize: 11,
    color: '#333',
    
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartBarTrack: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '65%',
    backgroundColor: '#667eea',
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarAmount: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
});

export default Home;
